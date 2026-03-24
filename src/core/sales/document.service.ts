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
import { resolveProductCode } from "@/lib/utils";
import {
  buildSriNumericCode,
  generateAccessKey,
} from "@/modules/billing/services/sri-access-key";
import { pushAndAuthorizeInvoice } from "@/modules/billing/services/sri.service";

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
  invoicePayload: ReturnType<typeof toInvoicePayload>;
};

type PreparedDocumentResult = IssuedDocumentResult & {
  backgroundAuthorization: PendingSaleDocumentAuthorization | null;
};

function sriTaxCode(tarifa: number) {
  if (tarifa === 15) {
    return "4";
  }

  return "0";
}

function sriEnvironmentCode(environment: string | null | undefined) {
  return environment === "PRODUCCION" ? "2" : "1";
}

function sriCurrencyCode(currency: string | null | undefined) {
  if (!currency) {
    return "DOLAR";
  }

  return currency.toUpperCase() === "USD" ? "DOLAR" : currency;
}

function toInvoicePayload(
  context: CreatedSaleContext,
  params: {
    issuerId: string;
    establishmentCode: string;
    emissionPointCode: string;
    formattedSequence: string;
    accessKey: string;
  },
) {
  return {
    issuerId: params.issuerId,
    fechaEmision: context.documentInput.fechaEmision,
    establecimiento: params.establishmentCode,
    puntoEmision: params.emissionPointCode,
    secuencial: params.formattedSequence,
    claveAcceso: params.accessKey,
    // autorizar: true,
    clienteTipoIdentificacion: context.customer.tipoIdentificacion,
    clienteIdentificacion: context.customer.identificacion,
    clienteRazonSocial: context.customer.razonSocial,
    clienteDireccion: context.customer.direccion ?? "",
    clienteEmail: context.customer.email ?? "",
    clienteTelefono: context.customer.telefono ?? "",
    totalSinImpuestos: context.totals.subtotal,
    totalDescuento: context.totals.discountTotal,
    propina: 0,
    importeTotal: context.totals.total,
    moneda: sriCurrencyCode(context.documentInput.moneda),
    infoAdicional: context.documentInput.infoAdicional ?? {},
    detalles: context.lines.map((line) => ({
      codigoPrincipal: resolveProductCode(
        line.productSku,
        line.productSecuencial,
      ),
      codigoAuxiliar: `AUX${line.productSecuencial.toString()}`,
      descripcion: line.productName,
      cantidad: line.quantity,
      precioUnitario: line.unitPrice,
      descuento: line.discount,
      precioTotalSinImpuesto: line.lineSubtotal,
      detallesAdicionales: {},
      impuestos: [
        {
          codigo: "2",
          codigoPorcentaje: sriTaxCode(line.ivaRate),
          tarifa: line.ivaRate,
          baseImponible: line.lineSubtotal,
          valor: line.lineTax,
        },
      ],
    })),
    pagos: context.payments.map((payment) => ({
      formaPago: payment.formaPago,
      total: payment.total,
      plazo: payment.plazo,
      unidadTiempo: payment.unidadTiempo,
    })),
  };
}

function toSaleDocumentStatus(invoiceStatus: SriInvoiceStatus) {
  if (invoiceStatus === SriInvoiceStatus.AUTHORIZED) {
    return SaleDocumentStatus.ISSUED;
  }

  if (invoiceStatus === SriInvoiceStatus.ERROR) {
    return SaleDocumentStatus.ERROR;
  }

  return SaleDocumentStatus.PENDING;
}

function toInvoiceSummary(finalInvoice: {
  id: string;
  externalInvoiceId: string | null;
  secuencial: string | null;
  status: SriInvoiceStatus;
  authorizationNumber: string | null;
  claveAcceso: string | null;
  lastError: string | null;
  retryCount: number;
  documents: {
    xmlSignedPath: string | null;
    xmlAuthorizedPath: string | null;
    ridePdfPath: string | null;
  } | null;
}): InvoiceSummary {
  return {
    sriInvoiceId: finalInvoice.id,
    externalInvoiceId: finalInvoice.externalInvoiceId,
    secuencial: finalInvoice.secuencial,
    status: finalInvoice.status,
    authorizationNumber: finalInvoice.authorizationNumber,
    claveAcceso: finalInvoice.claveAcceso,
    lastError: finalInvoice.lastError,
    retryCount: finalInvoice.retryCount,
    documents: finalInvoice.documents,
  };
}

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

  const numericCode = buildSriNumericCode(
    `${context.sale.id}-${saleDocument.id}-${numbering.fullNumber}`,
  );
  const accessKey = generateAccessKey({
    fecha: context.documentInput.fechaEmision,
    tipoComprobante: "01",
    ruc: issuer.ruc,
    ambiente: sriEnvironmentCode(issuer.environment),
    serie: `${numbering.establishmentCode}${numbering.emissionPointCode}`,
    numeroComprobante: numbering.formattedSequence,
    codigoNumerico: numericCode,
    tipoEmision: "1",
  });
  const invoicePayload = toInvoicePayload(context, {
    issuerId: issuer.externalIssuerId,
    establishmentCode: numbering.establishmentCode,
    emissionPointCode: numbering.emissionPointCode,
    formattedSequence: numbering.formattedSequence,
    accessKey,
  });

  await tx.saleDocument.update({
    where: { id: saleDocument.id },
    data: {
      metadata: {
        source: "checkout",
        fechaEmision: context.documentInput.fechaEmision,
        moneda: context.documentInput.moneda,
        infoAdicional: context.documentInput.infoAdicional,
        documento: {
          ...numbering,
          accessKey,
          numericCode,
        },
      } as Prisma.InputJsonValue,
    },
  });

  const sriInvoice = await tx.sriInvoice.create({
    data: {
      saleId: context.sale.id,
      issuerId: context.documentInput.issuerId,
      secuencial: numbering.formattedSequence,
      claveAcceso: accessKey,
      status: SriInvoiceStatus.PENDING_SRI,
      createRequestPayload: invoicePayload as Prisma.InputJsonValue,
    },
  });

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
    claveAcceso: accessKey,
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
      invoicePayload,
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

export async function authorizePendingSaleDocument(
  task: PendingSaleDocumentAuthorization,
) {
  const startedAt = startTimer();
  let pushError: unknown = null;

  try {
    await pushAndAuthorizeInvoice(task.sriInvoiceId, task.invoicePayload);
  } catch (error) {
    pushError = error;
  }

  const finalInvoice = await prisma.sriInvoice.findUnique({
    where: { id: task.sriInvoiceId },
    include: {
      documents: true,
    },
  });

  if (!finalInvoice) {
    await prisma.saleDocument.update({
      where: { id: task.saleDocumentId },
      data: {
        status: SaleDocumentStatus.ERROR,
        issuedAt: null,
      },
    });

    logger.error("document:authorize-missing-invoice", {
      saleId: task.saleId,
      saleNumber: task.saleNumber,
      documentNumber: task.documentNumber,
      sriInvoiceId: task.sriInvoiceId,
      durationMs: timerDurationMs(startedAt),
    });

    return;
  }

  await prisma.saleDocument.update({
    where: { id: task.saleDocumentId },
    data: {
      status: toSaleDocumentStatus(finalInvoice.status),
      issuedAt: finalInvoice.authorizedAt ?? null,
    },
  });

  if (pushError) {
    logger.error("document:authorize-failed", {
      saleId: task.saleId,
      saleNumber: task.saleNumber,
      documentNumber: task.documentNumber,
      sriInvoiceId: task.sriInvoiceId,
      invoiceStatus: finalInvoice.status,
      lastError: finalInvoice.lastError,
      durationMs: timerDurationMs(startedAt),
      message:
        pushError instanceof Error ? pushError.message : "Error desconocido",
    });

    return;
  }

  const invoice = toInvoiceSummary(finalInvoice);
  const level =
    finalInvoice.status === SriInvoiceStatus.AUTHORIZED ? "info" : "warn";

  logger[level]("document:authorize-completed", {
    saleId: task.saleId,
    saleNumber: task.saleNumber,
    documentNumber: task.documentNumber,
    sriInvoiceId: task.sriInvoiceId,
    invoiceStatus: invoice.status,
    lastError: invoice.lastError,
    durationMs: timerDurationMs(startedAt),
  });
}
