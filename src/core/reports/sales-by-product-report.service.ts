import { Prisma, SaleStatus } from "@prisma/client";

import { resolveProductCode, roundMoney } from "@/lib/utils";

const DEFAULT_RANGE_DAYS = 30;
const REPORT_TIME_ZONE = "America/Guayaquil";
const REPORT_TIME_ZONE_OFFSET = "-05:00";

export type SalesByProductReportInput = {
  businessId: string;
  from?: string | null;
  to?: string | null;
  sellerId?: string | null;
  sellerLocked?: boolean;
};

export type SalesByProductReportResult = {
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
    productsCount: number;
    salesCount: number;
    unitsSold: number;
    grossTotal: number;
    averageProductRevenue: number;
  };
  rows: Array<{
    productId: string;
    productCode: string;
    productName: string;
    unitsSold: number;
    salesCount: number;
    total: number;
    averageUnitPrice: number;
    lastSoldAt: string;
    participationPercent: number;
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

export async function getSalesByProductReport(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: SalesByProductReportInput,
): Promise<SalesByProductReportResult> {
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
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.sale.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        items: {
          select: {
            productId: true,
            cantidad: true,
            total: true,
            precioUnitario: true,
            product: {
              select: {
                nombre: true,
                sku: true,
                secuencial: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const productsMap = new Map<
    string,
    {
      productId: string;
      productCode: string;
      productName: string;
      unitsSold: number;
      total: number;
      weightedUnitValue: number;
      saleIds: Set<string>;
      lastSoldAt: string;
    }
  >();

  let grossTotal = 0;
  let unitsSold = 0;

  for (const sale of sales) {
    for (const item of sale.items) {
      const quantity = Number(item.cantidad);
      const lineTotal = Number(item.total);
      const unitPrice = Number(item.precioUnitario);

      grossTotal += lineTotal;
      unitsSold += quantity;

      const current = productsMap.get(item.productId) ?? {
        productId: item.productId,
        productCode: resolveProductCode(item.product.sku, item.product.secuencial),
        productName: item.product.nombre,
        unitsSold: 0,
        total: 0,
        weightedUnitValue: 0,
        saleIds: new Set<string>(),
        lastSoldAt: sale.createdAt.toISOString(),
      };

      current.unitsSold += quantity;
      current.total += lineTotal;
      current.weightedUnitValue += unitPrice * quantity;
      current.saleIds.add(sale.id);

      if (new Date(sale.createdAt).getTime() > new Date(current.lastSoldAt).getTime()) {
        current.lastSoldAt = sale.createdAt.toISOString();
      }

      productsMap.set(item.productId, current);
    }
  }

  const rows = [...productsMap.values()]
    .map((product) => ({
      productId: product.productId,
      productCode: product.productCode,
      productName: product.productName,
      unitsSold: Number(product.unitsSold.toFixed(3)),
      salesCount: product.saleIds.size,
      total: roundMoney(product.total),
      averageUnitPrice:
        product.unitsSold > 0
          ? roundMoney(product.weightedUnitValue / product.unitsSold)
          : 0,
      lastSoldAt: product.lastSoldAt,
      participationPercent:
        grossTotal > 0 ? Number(((product.total / grossTotal) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    filters: {
      from: normalized.from,
      to: normalized.to,
      sellerId,
      sellerLocked: Boolean(input.sellerLocked),
    },
    sellerOptions,
    summary: {
      productsCount: rows.length,
      salesCount: sales.length,
      unitsSold: Number(unitsSold.toFixed(3)),
      grossTotal: roundMoney(grossTotal),
      averageProductRevenue: rows.length > 0 ? roundMoney(grossTotal / rows.length) : 0,
    },
    rows,
  };
}
