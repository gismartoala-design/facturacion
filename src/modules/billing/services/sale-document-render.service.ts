import { SaleDocumentStatus, SaleDocumentType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";
import {
  buildSaleInvoiceHtml,
  type SaleInvoicePrintData,
} from "@/lib/sale-invoice-template";

function parseDocumentMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      fechaEmision: null,
      moneda: "USD",
    };
  }

  const record = metadata as Record<string, unknown>;
  return {
    fechaEmision:
      typeof record.fechaEmision === "string" ? record.fechaEmision : null,
    moneda: typeof record.moneda === "string" ? record.moneda : "USD",
  };
}

function documentTitle(type: SaleDocumentType) {
  return type === "INVOICE" ? "FACTURA" : "COMPROBANTE DE VENTA";
}

function documentStatusLabel(
  type: SaleDocumentType,
  status: SaleDocumentStatus,
) {
  if (type === "NONE") {
    return "Documento no requerido";
  }
  if (status === "ISSUED") {
    return "Autorizada";
  }
  if (status === "PENDING") {
    return "Pendiente de autorizacion";
  }
  if (status === "ERROR") {
    return "Con error de autorizacion";
  }
  if (status === "VOIDED") {
    return "Anulada";
  }
  return "Documento no requerido";
}

function paymentMethodLabel(code: string) {
  const labels: Record<string, string> = {
    "01": "Sin utilizacion del sistema financiero",
    "15": "Compensacion de deudas",
    "16": "Tarjeta de debito",
    "19": "Tarjeta de credito",
    "20": "Otros con utilizacion del sistema financiero",
  };

  return labels[code] ?? code;
}

export async function getSaleInvoicePrintData(
  saleId: string,
  businessId: string,
): Promise<SaleInvoicePrintData> {
  const [business, sale] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        legalName: true,
        ruc: true,
        address: true,
        phone: true,
        email: true,
        taxProfile: {
          select: {
            accountingRequired: true,
          },
        },
      },
    }),
    prisma.sale.findFirst({
      where: {
        id: saleId,
        createdBy: {
          businessId,
        },
      },
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
          orderBy: {
            id: "asc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "asc",
          },
        },
        document: {
          select: {
            type: true,
            status: true,
            fullNumber: true,
            establishmentCode: true,
            emissionPointCode: true,
            metadata: true,
            issuerId: true,
          },
        },
        sriInvoice: {
          select: {
            status: true,
            authorizationNumber: true,
            authorizedAt: true,
            claveAcceso: true,
          },
        },
      },
    }),
  ]);

  if (!business || !sale) {
    throw new Error("Venta no encontrada");
  }

  const metadata = parseDocumentMetadata(sale.document?.metadata);
  const issuer = sale.document?.issuerId
    ? await prisma.documentIssuer.findUnique({
        where: { id: sale.document.issuerId },
        select: {
          name: true,
          legalName: true,
          ruc: true,
          environment: true,
        },
      })
    : null;

  const documentType = sale.document?.type ?? "NONE";
  const documentStatus = sale.document?.status ?? "NOT_REQUIRED";

  return {
    saleNumber: sale.saleNumber.toString(),
    documentTitle: documentTitle(documentType),
    documentType,
    documentStatus,
    documentStatusLabel: documentStatusLabel(documentType, documentStatus),
    documentNumber: sale.document?.fullNumber ?? null,
    fechaEmision:
      metadata.fechaEmision ??
      new Intl.DateTimeFormat("es-EC", { dateStyle: "short" }).format(
        sale.createdAt,
      ),
    moneda: metadata.moneda,
    accountingRequired: business.taxProfile?.accountingRequired ?? null,
    customerName: sale.customer.razonSocial,
    customerIdentification: sale.customer.identificacion,
    customerAddress: sale.customer.direccion,
    customerEmail: sale.customer.email,
    customerPhone: sale.customer.telefono,
    items: sale.items.map((item) => ({
      productCode: resolveProductCode(item.product.sku, item.product.secuencial),
      productName: item.product.nombre,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      descuento: Number(item.descuento),
      subtotal: Number(item.subtotal),
      valorIva: Number(item.valorIva),
      total: Number(item.total),
    })),
    paymentMethodLabels: [
      ...new Set(
        sale.payments.map((payment) => paymentMethodLabel(payment.formaPago)),
      ),
    ],
    subtotal: Number(sale.subtotal),
    discountTotal: Number(sale.discountTotal),
    taxTotal: Number(sale.taxTotal),
    total: Number(sale.total),
    companyName: business.name,
    companyLegalName: issuer?.legalName ?? business.legalName,
    companyRuc: issuer?.ruc ?? business.ruc,
    companyAddress: business.address,
    companyPhone: business.phone,
    companyEmail: business.email,
    issuerName: issuer?.name ?? null,
    ambiente: issuer?.environment ?? null,
    numeroAutorizacion: sale.sriInvoice?.authorizationNumber ?? null,
    fechaAutorizacion: sale.sriInvoice?.authorizedAt
      ? new Intl.DateTimeFormat("es-EC", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(sale.sriInvoice.authorizedAt)
      : null,
    claveAcceso: sale.sriInvoice?.claveAcceso ?? null,
  };
}

export async function buildSaleInvoiceDocumentHtml(
  saleId: string,
  businessId: string,
  autoPrint = true,
) {
  const data = await getSaleInvoicePrintData(saleId, businessId);
  return buildSaleInvoiceHtml(data, autoPrint);
}
