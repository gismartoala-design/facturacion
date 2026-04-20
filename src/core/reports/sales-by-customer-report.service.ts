import { Prisma, SaleStatus } from "@prisma/client";

import { roundMoney } from "@/lib/utils";

const DEFAULT_RANGE_DAYS = 30;
const REPORT_TIME_ZONE = "America/Guayaquil";
const REPORT_TIME_ZONE_OFFSET = "-05:00";

export type SalesByCustomerReportInput = {
  businessId: string;
  from?: string | null;
  to?: string | null;
  sellerId?: string | null;
  sellerLocked?: boolean;
};

export type SalesByCustomerReportResult = {
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
    customersCount: number;
    salesCount: number;
    grossTotal: number;
    averageTicket: number;
    averageCustomerValue: number;
  };
  rows: Array<{
    customerId: string;
    customerName: string;
    identification: string;
    salesCount: number;
    total: number;
    averageTicket: number;
    lastPurchaseAt: string;
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

export async function getSalesByCustomerReport(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: SalesByCustomerReportInput,
): Promise<SalesByCustomerReportResult> {
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
        total: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            razonSocial: true,
            identificacion: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const customersMap = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      identification: string;
      salesCount: number;
      total: number;
      lastPurchaseAt: string;
    }
  >();

  let grossTotal = 0;

  for (const sale of sales) {
    const saleTotal = Number(sale.total);
    grossTotal += saleTotal;

    const current = customersMap.get(sale.customer.id) ?? {
      customerId: sale.customer.id,
      customerName: sale.customer.razonSocial,
      identification: sale.customer.identificacion,
      salesCount: 0,
      total: 0,
      lastPurchaseAt: sale.createdAt.toISOString(),
    };

    current.salesCount += 1;
    current.total += saleTotal;

    if (new Date(sale.createdAt).getTime() > new Date(current.lastPurchaseAt).getTime()) {
      current.lastPurchaseAt = sale.createdAt.toISOString();
    }

    customersMap.set(sale.customer.id, current);
  }

  const rows = [...customersMap.values()]
    .map((customer) => ({
      ...customer,
      total: roundMoney(customer.total),
      averageTicket:
        customer.salesCount > 0 ? roundMoney(customer.total / customer.salesCount) : 0,
      participationPercent:
        grossTotal > 0 ? Number(((customer.total / grossTotal) * 100).toFixed(2)) : 0,
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
      customersCount: rows.length,
      salesCount: sales.length,
      grossTotal: roundMoney(grossTotal),
      averageTicket: sales.length > 0 ? roundMoney(grossTotal / sales.length) : 0,
      averageCustomerValue: rows.length > 0 ? roundMoney(grossTotal / rows.length) : 0,
    },
    rows,
  };
}
