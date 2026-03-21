import {
  Prisma,
  SaleDocumentStatus,
  SaleDocumentType,
  SriInvoiceStatus,
} from "@prisma/client";

import type { CreatedSaleContext } from "@/core/sales/sale.service";
import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";
import { pushAndAuthorizeInvoice } from "@/modules/billing/services/sri.service";
import { reserveDocumentNumber } from "@/core/sales/document-series.service";
import {
  buildSriNumericCode,
  generateAccessKey,
} from "@/modules/billing/services/sri-access-key";
import { SRI_SIGNATURE_ISSUER_ID } from "@/modules/billing/services/sri.client";

type InvoiceSummary = {
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

type IssuedDocumentResult = {
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

function toInvoicePayload(context: CreatedSaleContext, params: {
  formattedSequence: string;
}) {
  return {
    issuerId: SRI_SIGNATURE_ISSUER_ID,
    fechaEmision: context.documentInput.fechaEmision,
    secuencial: params.formattedSequence,
    autorizar: true,
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
      codigoPrincipal: resolveProductCode(line.productSku, line.productSecuencial),
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

export async function issueDocumentForSale(context: CreatedSaleContext): Promise<IssuedDocumentResult> {
  if (context.documentInput.documentType === "NONE") {
    const saleDocument = await prisma.saleDocument.create({
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
    };
  }

  const txResult = await prisma.$transaction(async (tx) => {
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
        environment: true,
      },
    });

    if (!issuer?.ruc) {
      throw new Error(
        "El emisor documental no tiene RUC configurado para generar la clave de acceso",
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
      formattedSequence: numbering.formattedSequence,
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

    return {
      saleDocumentId: saleDocument.id,
      sriInvoiceId: sriInvoice.id,
      numbering,
      invoicePayload,
    };
  });

  await pushAndAuthorizeInvoice(txResult.sriInvoiceId, txResult.invoicePayload);

  const finalInvoice = await prisma.sriInvoice.findUnique({
    where: { id: txResult.sriInvoiceId },
    include: {
      documents: true,
    },
  });

  if (!finalInvoice) {
    throw new Error("No se pudo recuperar la factura emitida");
  }

  const updatedDocument = await prisma.saleDocument.update({
    where: { id: txResult.saleDocumentId },
    data: {
      status: toSaleDocumentStatus(finalInvoice.status),
      issuedAt: finalInvoice.authorizedAt ?? null,
    },
  });

  const invoice = toInvoiceSummary(finalInvoice);

  return {
    document: {
      saleDocumentId: updatedDocument.id,
      type: updatedDocument.type,
      status: updatedDocument.status,
      fullNumber: updatedDocument.fullNumber,
      establishmentCode: updatedDocument.establishmentCode,
      emissionPointCode: updatedDocument.emissionPointCode,
      sequenceNumber: updatedDocument.sequenceNumber,
      issuedAt: updatedDocument.issuedAt,
      invoice,
    },
    invoice,
  };
}
