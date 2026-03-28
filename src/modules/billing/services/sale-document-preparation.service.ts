import { Prisma } from "@prisma/client";

import type { PendingSaleDocumentAuthorization } from "@/core/sales/document.service";
import { formatDocumentSequence } from "@/core/sales/document-series.service";
import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";
import {
  buildSriNumericCode,
  generateAccessKey,
} from "@/modules/billing/services/sri-access-key";

function sriTaxCode(tarifa: number) {
  if (tarifa === 15) {
    return "4";
  }

  return "0";
}

function sriEnvironmentCode(environment: string | null | undefined) {
  return environment === "PRODUCCION" ? "2" : "1";
}

function sriEnvironmentLabel(environment: string | null | undefined) {
  return environment === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS";
}

function sriCurrencyCode(currency: string | null | undefined) {
  if (!currency) {
    return "DOLAR";
  }

  return currency.toUpperCase() === "USD" ? "DOLAR" : currency;
}

function parseDocumentMetadata(metadata: Prisma.JsonValue | null) {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  return {
    source: typeof record.source === "string" ? record.source : "checkout",
    fechaEmision:
      typeof record.fechaEmision === "string" ? record.fechaEmision : null,
    moneda: typeof record.moneda === "string" ? record.moneda : "USD",
    infoAdicional:
      record.infoAdicional &&
      typeof record.infoAdicional === "object" &&
      !Array.isArray(record.infoAdicional)
        ? (record.infoAdicional as Record<string, unknown>)
        : {},
  };
}

function isPreparedInvoicePayload(
  payload: Prisma.JsonValue | null | undefined,
): payload is Prisma.JsonObject {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      Object.keys(payload).length > 0,
  );
}

async function getPendingAuthorizationTaskBySriInvoiceId(
  sriInvoiceId: string,
): Promise<PendingSaleDocumentAuthorization> {
  const saleDocument = await prisma.saleDocument.findFirst({
    where: { sriInvoiceId },
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
        },
      },
    },
  });

  if (!saleDocument) {
    throw new Error("Documento de venta no encontrado para la factura local");
  }

  return {
    saleDocumentId: saleDocument.id,
    saleId: saleDocument.sale.id,
    saleNumber: saleDocument.sale.saleNumber.toString(),
    documentNumber: saleDocument.fullNumber,
    sriInvoiceId,
  };
}

export async function preparePendingSaleDocumentAuthorization(
  task: PendingSaleDocumentAuthorization,
) {
  const saleDocument = await prisma.saleDocument.findUnique({
    where: { id: task.saleDocumentId },
    include: {
      sriInvoice: true,
      sale: {
        include: {
          customer: true,
          items: {
            include: {
              product: {
                select: {
                  sku: true,
                  secuencial: true,
                  nombre: true,
                },
              },
            },
          },
          payments: true,
        },
      },
    },
  });

  if (!saleDocument) {
    throw new Error("Documento de venta no encontrado");
  }

  if (!saleDocument.sriInvoice) {
    throw new Error("Factura local no encontrada para el documento de venta");
  }

  if (!saleDocument.issuerId) {
    throw new Error("El documento de venta no tiene emisor configurado");
  }

  if (!saleDocument.sequenceNumber) {
    throw new Error("El documento de venta no tiene secuencia asignada");
  }

  const issuer = await prisma.documentIssuer.findUnique({
    where: { id: saleDocument.issuerId },
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

  const ambiente = sriEnvironmentLabel(issuer.environment);

  if (
    isPreparedInvoicePayload(saleDocument.sriInvoice.createRequestPayload) &&
    saleDocument.sriInvoice.claveAcceso
  ) {
    const invoicePayload = {
      ...(saleDocument.sriInvoice.createRequestPayload as Prisma.JsonObject),
      ambiente,
    } as Prisma.JsonObject;

    await prisma.sriInvoice.update({
      where: { id: task.sriInvoiceId },
      data: {
        createRequestPayload: invoicePayload,
      },
    });

    return {
      invoicePayload,
      accessKey: saleDocument.sriInvoice.claveAcceso,
    };
  }

  const metadata = parseDocumentMetadata(saleDocument.metadata);
  if (!metadata.fechaEmision) {
    throw new Error("El documento de venta no tiene fecha de emision configurada");
  }

  const formattedSequence = formatDocumentSequence(saleDocument.sequenceNumber);
  const numericCode = buildSriNumericCode(
    `${task.saleId}-${task.saleDocumentId}-${saleDocument.fullNumber ?? formattedSequence}`,
  );
  const accessKey = generateAccessKey({
    fecha: metadata.fechaEmision,
    tipoComprobante: "01",
    ruc: issuer.ruc,
    ambiente: sriEnvironmentCode(issuer.environment),
    serie: `${saleDocument.establishmentCode ?? ""}${saleDocument.emissionPointCode ?? ""}`,
    numeroComprobante: formattedSequence,
    codigoNumerico: numericCode,
    tipoEmision: "1",
  });

  const invoicePayload = {
    issuerId: issuer.externalIssuerId,
    fechaEmision: metadata.fechaEmision,
    establecimiento: saleDocument.establishmentCode ?? "",
    puntoEmision: saleDocument.emissionPointCode ?? "",
    secuencial: formattedSequence,
    claveAcceso: accessKey,
    clienteTipoIdentificacion: saleDocument.sale.customer.tipoIdentificacion,
    clienteIdentificacion: saleDocument.sale.customer.identificacion,
    clienteRazonSocial: saleDocument.sale.customer.razonSocial,
    clienteDireccion: saleDocument.sale.customer.direccion ?? "",
    clienteEmail: saleDocument.sale.customer.email ?? "",
    clienteTelefono: saleDocument.sale.customer.telefono ?? "",
    totalSinImpuestos: Number(saleDocument.sale.subtotal),
    totalDescuento: Number(saleDocument.sale.discountTotal),
    propina: 0,
    importeTotal: Number(saleDocument.sale.total),
    moneda: sriCurrencyCode(metadata.moneda),
    ambiente,
    infoAdicional: metadata.infoAdicional,
    detalles: saleDocument.sale.items.map((line) => ({
      codigoPrincipal: resolveProductCode(
        line.product.sku,
        line.product.secuencial,
      ),
      codigoAuxiliar: `AUX${line.product.secuencial.toString()}`,
      descripcion: line.product.nombre,
      cantidad: Number(line.cantidad),
      precioUnitario: Number(line.precioUnitario),
      descuento: Number(line.descuento),
      precioTotalSinImpuesto: Number(line.subtotal),
      detallesAdicionales: {},
      impuestos: [
        {
          codigo: "2",
          codigoPorcentaje: sriTaxCode(Number(line.tarifaIva)),
          tarifa: Number(line.tarifaIva),
          baseImponible: Number(line.subtotal),
          valor: Number(line.valorIva),
        },
      ],
    })),
    pagos: saleDocument.sale.payments.map((payment) => ({
      formaPago: payment.formaPago,
      total: Number(payment.amount),
      plazo: payment.plazo,
      unidadTiempo: payment.unidadTiempo,
    })),
  };

  await prisma.saleDocument.update({
    where: { id: saleDocument.id },
    data: {
      metadata: {
        source: metadata.source,
        fechaEmision: metadata.fechaEmision,
        moneda: metadata.moneda,
        infoAdicional: metadata.infoAdicional,
        documento: {
          documentSeriesId: saleDocument.documentSeriesId,
          issuerId: saleDocument.issuerId,
          establishmentCode: saleDocument.establishmentCode,
          emissionPointCode: saleDocument.emissionPointCode,
          sequenceNumber: saleDocument.sequenceNumber,
          formattedSequence,
          fullNumber: saleDocument.fullNumber,
          accessKey,
          numericCode,
        },
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.sriInvoice.update({
    where: { id: task.sriInvoiceId },
    data: {
      claveAcceso: accessKey,
      createRequestPayload: invoicePayload as Prisma.InputJsonValue,
    },
  });

  return {
    invoicePayload,
    accessKey,
  };
}

export async function preparePendingSaleDocumentAuthorizationBySriInvoiceId(
  sriInvoiceId: string,
) {
  const task = await getPendingAuthorizationTaskBySriInvoiceId(sriInvoiceId);
  return preparePendingSaleDocumentAuthorization(task);
}
