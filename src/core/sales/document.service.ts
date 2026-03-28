import {
  Prisma,
  SaleDocumentStatus,
  SaleDocumentType,
  SriInvoiceStatus,
} from "@prisma/client";

import type { CreatedSaleContext } from "@/core/sales/sale.service";
import { reserveDocumentNumber } from "@/core/sales/document-series.service";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const logger = createLogger("SalesDocument");

export type InvoiceSummary = {
  sriInvoiceId: string;
  externalInvoiceId: string | null;
  secuencial: string | null;
  status: SriInvoiceStatus;
  authorizationNumber: string | null;
  claveAcceso: string | null;
  lastError: string | null;
  retryCount: number;
  documents: {
    xmlSignedPath?: string | null;
    xmlAuthorizedPath?: string | null;
    ridePdfPath?: string | null;
  } | null;
};

export type IssuedDocumentResult = {
  document: {
    saleDocumentId: string;
    type: SaleDocumentType;
    status: SaleDocumentStatus;
    fullNumber: string | null;
    establishmentCode: string | null;
    emissionPointCode: string | null;
    sequenceNumber: number | null;
    issuedAt: Date | null;
    invoice: InvoiceSummary | null;
  };
  invoice: InvoiceSummary | null;
};

export type PendingSaleDocumentAuthorization = {
  saleDocumentId: string;
  saleId: string;
  saleNumber: string;
  documentNumber: string | null;
  sriInvoiceId: string;
};

type PreparedDocumentResult = IssuedDocumentResult & {
  backgroundAuthorization: PendingSaleDocumentAuthorization | null;
};

export async function createDocumentForSaleInTransaction(
  tx: Prisma.TransactionClient,
  context: CreatedSaleContext,
): Promise<PreparedDocumentResult> {
  const startedAt = startTimer();

  if (context.documentInput.documentType === "NONE") {
    const saleDocument = await tx.saleDocument.create({
      data: {
        saleId: context.sale.id,
        type: SaleDocumentType.NONE,
        status: SaleDocumentStatus.NOT_REQUIRED,
        metadata: {
          source: "checkout",
          infoAdicional: context.documentInput.infoAdicional,
        } as Prisma.InputJsonValue,
      },
    });

    logger.info("document:prepared", {
      saleId: context.sale.id,
      saleNumber: context.sale.saleNumber.toString(),
      documentType: saleDocument.type,
      documentStatus: saleDocument.status,
      durationMs: timerDurationMs(startedAt),
      backgroundAuthorization: false,
    });

    return {
      document: {
        saleDocumentId: saleDocument.id,
        type: saleDocument.type,
        status: saleDocument.status,
        fullNumber: null,
        establishmentCode: null,
        emissionPointCode: null,
        sequenceNumber: null,
        issuedAt: saleDocument.issuedAt,
        invoice: null,
      },
      invoice: null,
      backgroundAuthorization: null,
    };
  }

  const numbering = await reserveDocumentNumber(
    tx,
    context.documentInput.issuerId,
    "INVOICE",
  );

  const saleDocument = await tx.saleDocument.create({
    data: {
      saleId: context.sale.id,
      type: SaleDocumentType.INVOICE,
      status: SaleDocumentStatus.PENDING,
      issuerId: context.documentInput.issuerId,
      documentSeriesId: numbering.documentSeriesId,
      establishmentCode: numbering.establishmentCode,
      emissionPointCode: numbering.emissionPointCode,
      sequenceNumber: numbering.sequenceNumber,
      fullNumber: numbering.fullNumber,
      metadata: {
        source: "checkout",
        fechaEmision: context.documentInput.fechaEmision,
        moneda: context.documentInput.moneda,
        infoAdicional: context.documentInput.infoAdicional,
        documento: numbering,
      } as Prisma.InputJsonValue,
    },
  });

  const issuer = await tx.documentIssuer.findUnique({
    where: { id: context.documentInput.issuerId },
    select: {
      ruc: true,
      externalIssuerId: true,
      environment: true,
    },
  });

  if (!issuer?.ruc) {
    throw new Error(
      "El emisor documental no tiene RUC configurado para generar la clave de acceso",
    );
  }

  if (!issuer.externalIssuerId) {
    throw new Error(
      "El emisor documental no tiene externalIssuerId configurado para el gateway SRI",
    );
  }

  const sriInvoice = await tx.sriInvoice.create({
    data: {
      saleId: context.sale.id,
      issuerId: context.documentInput.issuerId,
      secuencial: numbering.formattedSequence,
      status: SriInvoiceStatus.PENDING_SRI,
      createRequestPayload: {} as Prisma.InputJsonValue,
    },
  });

  logger

  await tx.saleDocument.update({
    where: { id: saleDocument.id },
    data: {
      sriInvoiceId: sriInvoice.id,
    },
  });

  const invoice = {
    sriInvoiceId: sriInvoice.id,
    externalInvoiceId: sriInvoice.externalInvoiceId,
    secuencial: sriInvoice.secuencial,
    status: sriInvoice.status,
    authorizationNumber: sriInvoice.authorizationNumber,
    claveAcceso: sriInvoice.claveAcceso,
    lastError: sriInvoice.lastError,
    retryCount: sriInvoice.retryCount,
    documents: null,
  } satisfies InvoiceSummary;

  logger.info("document:prepared", {
    saleId: context.sale.id,
    saleNumber: context.sale.saleNumber.toString(),
    documentType: saleDocument.type,
    documentStatus: saleDocument.status,
    documentNumber: numbering.fullNumber,
    durationMs: timerDurationMs(startedAt),
    backgroundAuthorization: true,
  });

  return {
    document: {
      saleDocumentId: saleDocument.id,
      type: saleDocument.type,
      status: saleDocument.status,
      fullNumber: saleDocument.fullNumber,
      establishmentCode: saleDocument.establishmentCode,
      emissionPointCode: saleDocument.emissionPointCode,
      sequenceNumber: saleDocument.sequenceNumber,
      issuedAt: saleDocument.issuedAt,
      invoice,
    },
    invoice,
    backgroundAuthorization: {
      saleDocumentId: saleDocument.id,
      saleId: context.sale.id,
      saleNumber: context.sale.saleNumber.toString(),
      documentNumber: saleDocument.fullNumber,
      sriInvoiceId: sriInvoice.id,
    },
  };
}

export async function createDocumentForSale(
  context: CreatedSaleContext,
): Promise<PreparedDocumentResult> {
  return prisma.$transaction((tx) =>
    createDocumentForSaleInTransaction(tx, context),
  );
}
