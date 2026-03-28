import { Prisma, SaleDocumentStatus, SaleDocumentType, SaleStatus } from "@prisma/client";

import { roundMoney, resolveProductCode } from "@/lib/utils";

const DEFAULT_RANGE_DAYS = 30;
const REPORT_TIME_ZONE = "America/Guayaquil";
const REPORT_TIME_ZONE_OFFSET = "-05:00";

export type SalesReportInput = {
  businessId: string;
  from?: string | null;
  to?: string | null;
  sellerId?: string | null;
  sellerLocked?: boolean;
};

export type SalesReportResult = {
  filters: {
    from: string;
    to: string;
    sellerId: string | null;
    sellerLocked: boolean;
  };
  sellerOptions: Array<{
    id: string;
    name: string;
    role: "ADMIN" | "SELLER";
  }>;
  summary: {
    salesCount: number;
    grossTotal: number;
    averageTicket: number;
    taxTotal: number;
    discountTotal: number;
    itemsSold: number;
  };
  salesByDay: Array<{
    date: string;
    salesCount: number;
    total: number;
    taxTotal: number;
  }>;
  topProducts: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
  paymentMethods: Array<{
    code: string;
    salesCount: number;
    total: number;
  }>;
  sellersSummary: Array<{
    sellerId: string | null;
    sellerName: string;
    salesCount: number;
    total: number;
    averageTicket: number;
  }>;
  documentSummary: Array<{
    key: string;
    label: string;
    salesCount: number;
    total: number;
  }>;
  salesRows: Array<{
    saleId: string;
    saleNumber: string;
    customerName: string;
    sellerName: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    itemCount: number;
    createdAt: string;
    paymentMethods: string[];
    documentKey: string;
    documentLabel: string;
  }>;
};

export type SaleReportDetailResult = {
  saleId: string;
  saleNumber: string;
  customerName: string;
  sellerName: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  documentKey: string;
  documentLabel: string;
  documentNumber: string | null;
  paymentMethods: string[];
  lines: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

function formatDateInput(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string | null | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  return value;
}

function addDays(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T12:00:00${REPORT_TIME_ZONE_OFFSET}`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInput(date);
}

function normalizeRange(from?: string | null, to?: string | null) {
  const defaultTo = formatDateInput(new Date());
  const defaultFrom = addDays(defaultTo, -(DEFAULT_RANGE_DAYS - 1));

  let fromDate = parseDateInput(from, defaultFrom);
  let toDate = parseDateInput(to, defaultTo);

  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const rangeStart = new Date(`${fromDate}T00:00:00.000${REPORT_TIME_ZONE_OFFSET}`);
  const rangeEnd = new Date(`${toDate}T23:59:59.999${REPORT_TIME_ZONE_OFFSET}`);

  return {
    rangeStart,
    rangeEnd,
    from: fromDate,
    to: toDate,
  };
}

function toDocumentDescriptor(document: {
  type: SaleDocumentType;
  status: SaleDocumentStatus;
} | null) {
  if (!document || document.type === SaleDocumentType.NONE) {
    return {
      key: "NONE",
      label: "Sin documento",
    };
  }

  if (document.status === SaleDocumentStatus.ISSUED) {
    return {
      key: "INVOICE_ISSUED",
      label: "Factura autorizada",
    };
  }

  if (document.status === SaleDocumentStatus.ERROR) {
    return {
      key: "INVOICE_ERROR",
      label: "Factura con error",
    };
  }

  if (document.status === SaleDocumentStatus.VOIDED) {
    return {
      key: "INVOICE_VOIDED",
      label: "Factura anulada",
    };
  }

  return {
    key: "INVOICE_PENDING",
    label: "Factura pendiente",
  };
}

export async function getSalesReport(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: SalesReportInput,
): Promise<SalesReportResult> {
  const normalized = normalizeRange(input.from, input.to);
  const sellerId = input.sellerId?.trim() || null;

  const where: Prisma.SaleWhereInput = {
    status: SaleStatus.COMPLETED,
    createdAt: {
      gte: normalized.rangeStart,
      lte: normalized.rangeEnd,
    },
    createdBy: {
      businessId: input.businessId,
    },
    ...(sellerId ? { createdById: sellerId } : {}),
  };

  const [sellerOptions, sales] = await Promise.all([
    prisma.user.findMany({
      where: {
        businessId: input.businessId,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.sale.findMany({
      where,
      select: {
        id: true,
        saleNumber: true,
        total: true,
        taxTotal: true,
        discountTotal: true,
        createdAt: true,
        customer: {
          select: {
            razonSocial: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        document: {
          select: {
            type: true,
            status: true,
          },
        },
        items: {
          select: {
            productId: true,
            cantidad: true,
            total: true,
            product: {
              select: {
                nombre: true,
                sku: true,
                secuencial: true,
              },
            },
          },
        },
        payments: {
          select: {
            formaPago: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const salesByDayMap = new Map<
    string,
    { date: string; salesCount: number; total: number; taxTotal: number }
  >();
  const topProductsMap = new Map<
    string,
    {
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      total: number;
    }
  >();
  const paymentMethodsMap = new Map<
    string,
    { code: string; saleIds: Set<string>; total: number }
  >();
  const sellersSummaryMap = new Map<
    string,
    {
      sellerId: string | null;
      sellerName: string;
      salesCount: number;
      total: number;
    }
  >();
  const documentSummaryMap = new Map<
    string,
    {
      key: string;
      label: string;
      salesCount: number;
      total: number;
    }
  >();

  let itemsSold = 0;
  let grossTotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  for (const sale of sales) {
    const saleTotal = Number(sale.total);
    const saleTax = Number(sale.taxTotal);
    const saleDiscount = Number(sale.discountTotal);
    const dayKey = formatDateInput(sale.createdAt);
    const sellerKey = sale.createdBy?.id ?? "unknown";
    const sellerName = sale.createdBy?.name ?? "Sin usuario";
    const documentDescriptor = toDocumentDescriptor(sale.document);

    grossTotal += saleTotal;
    taxTotal += saleTax;
    discountTotal += saleDiscount;

    const daily = salesByDayMap.get(dayKey) ?? {
      date: dayKey,
      salesCount: 0,
      total: 0,
      taxTotal: 0,
    };
    daily.salesCount += 1;
    daily.total += saleTotal;
    daily.taxTotal += saleTax;
    salesByDayMap.set(dayKey, daily);

    const sellerSummary = sellersSummaryMap.get(sellerKey) ?? {
      sellerId: sale.createdBy?.id ?? null,
      sellerName,
      salesCount: 0,
      total: 0,
    };
    sellerSummary.salesCount += 1;
    sellerSummary.total += saleTotal;
    sellersSummaryMap.set(sellerKey, sellerSummary);

    const documentSummary = documentSummaryMap.get(documentDescriptor.key) ?? {
      key: documentDescriptor.key,
      label: documentDescriptor.label,
      salesCount: 0,
      total: 0,
    };
    documentSummary.salesCount += 1;
    documentSummary.total += saleTotal;
    documentSummaryMap.set(documentDescriptor.key, documentSummary);

    for (const item of sale.items) {
      const quantity = Number(item.cantidad);
      const lineTotal = Number(item.total);
      itemsSold += quantity;

      const productSummary = topProductsMap.get(item.productId) ?? {
        productId: item.productId,
        productCode: resolveProductCode(
          item.product.sku,
          item.product.secuencial,
        ),
        productName: item.product.nombre,
        quantity: 0,
        total: 0,
      };
      productSummary.quantity += quantity;
      productSummary.total += lineTotal;
      topProductsMap.set(item.productId, productSummary);
    }

    for (const payment of sale.payments) {
      const paymentSummary = paymentMethodsMap.get(payment.formaPago) ?? {
        code: payment.formaPago,
        saleIds: new Set<string>(),
        total: 0,
      };
      paymentSummary.saleIds.add(sale.id);
      paymentSummary.total += Number(payment.amount);
      paymentMethodsMap.set(payment.formaPago, paymentSummary);
    }
  }

  return {
    filters: {
      from: normalized.from,
      to: normalized.to,
      sellerId,
      sellerLocked: Boolean(input.sellerLocked),
    },
    sellerOptions,
    summary: {
      salesCount: sales.length,
      grossTotal: roundMoney(grossTotal),
      averageTicket: sales.length > 0 ? roundMoney(grossTotal / sales.length) : 0,
      taxTotal: roundMoney(taxTotal),
      discountTotal: roundMoney(discountTotal),
      itemsSold: Number(itemsSold.toFixed(3)),
    },
    salesByDay: [...salesByDayMap.values()]
      .map((item) => ({
        ...item,
        total: roundMoney(item.total),
        taxTotal: roundMoney(item.taxTotal),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: [...topProductsMap.values()]
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity.toFixed(3)),
        total: roundMoney(item.total),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    paymentMethods: [...paymentMethodsMap.values()]
      .map((item) => ({
        code: item.code,
        salesCount: item.saleIds.size,
        total: roundMoney(item.total),
      }))
      .sort((a, b) => b.total - a.total),
    sellersSummary: [...sellersSummaryMap.values()]
      .map((item) => ({
        ...item,
        total: roundMoney(item.total),
        averageTicket:
          item.salesCount > 0 ? roundMoney(item.total / item.salesCount) : 0,
      }))
      .sort((a, b) => b.total - a.total),
    documentSummary: [...documentSummaryMap.values()]
      .map((item) => ({
        ...item,
        total: roundMoney(item.total),
      }))
      .sort((a, b) => b.total - a.total),
    salesRows: sales.map((sale) => ({
      saleId: sale.id,
      saleNumber: sale.saleNumber.toString(),
      customerName: sale.customer.razonSocial,
      sellerName: sale.createdBy?.name ?? "Sin usuario",
      subtotal: roundMoney(Number(sale.total) - Number(sale.taxTotal)),
      discountTotal: roundMoney(Number(sale.discountTotal)),
      taxTotal: roundMoney(Number(sale.taxTotal)),
      total: roundMoney(Number(sale.total)),
      itemCount: sale.items.length,
      createdAt: sale.createdAt.toISOString(),
      paymentMethods: [...new Set(sale.payments.map((payment) => payment.formaPago))],
      documentKey: toDocumentDescriptor(sale.document).key,
      documentLabel: toDocumentDescriptor(sale.document).label,
    })),
  };
}

export async function getSaleReportDetail(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    businessId: string;
    saleId: string;
    sellerId?: string | null;
    sellerLocked?: boolean;
  },
): Promise<SaleReportDetailResult> {
  const sale = await prisma.sale.findFirst({
    where: {
      id: input.saleId,
      status: SaleStatus.COMPLETED,
      createdBy: {
        businessId: input.businessId,
      },
      ...(input.sellerLocked && input.sellerId
        ? {
            createdById: input.sellerId,
          }
        : {}),
    },
    select: {
      id: true,
      saleNumber: true,
      subtotal: true,
      discountTotal: true,
      taxTotal: true,
      total: true,
      createdAt: true,
      customer: {
        select: {
          razonSocial: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
      document: {
        select: {
          type: true,
          status: true,
          fullNumber: true,
        },
      },
      items: {
        select: {
          productId: true,
          cantidad: true,
          precioUnitario: true,
          total: true,
          product: {
            select: {
              nombre: true,
              sku: true,
              secuencial: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
      payments: {
        select: {
          formaPago: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error("Venta no encontrada");
  }

  const documentDescriptor = toDocumentDescriptor(sale.document);

  return {
    saleId: sale.id,
    saleNumber: sale.saleNumber.toString(),
    customerName: sale.customer.razonSocial,
    sellerName: sale.createdBy?.name ?? "Sin usuario",
    subtotal: roundMoney(Number(sale.subtotal)),
    discountTotal: roundMoney(Number(sale.discountTotal)),
    taxTotal: roundMoney(Number(sale.taxTotal)),
    total: roundMoney(Number(sale.total)),
    createdAt: sale.createdAt.toISOString(),
    documentKey: documentDescriptor.key,
    documentLabel: documentDescriptor.label,
    documentNumber: sale.document?.fullNumber ?? null,
    paymentMethods: [...new Set(sale.payments.map((payment) => payment.formaPago))],
    lines: sale.items.map((item) => ({
      productId: item.productId,
      productCode: resolveProductCode(item.product.sku, item.product.secuencial),
      productName: item.product.nombre,
      quantity: Number(item.cantidad),
      unitPrice: Number(item.precioUnitario),
      total: roundMoney(Number(item.total)),
    })),
  };
}
