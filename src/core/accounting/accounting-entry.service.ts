import { randomUUID } from "node:crypto";

import {
  AccountingEntryStatus,
  AccountingSourceType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_CODES,
  getAccountingAccountByCode,
  listAccountingAccounts,
} from "./chart-of-accounts";
import {
  createDraftEntrySchema,
  createManualAdjustmentEntrySchema,
  listAccountingEntriesFiltersSchema,
  postEntrySchema,
  reverseEntrySchema,
  type CreateDraftEntryInput,
  type CreateManualAdjustmentEntryInput,
  type ListAccountingEntriesFilters,
  type PostEntryInput,
  type ReverseEntryInput,
} from "./schemas";
import type {
  AccountingAccountPlanOverview,
  AccountingEntryLineSummary,
  AccountingEntryListItem,
  AccountingEntriesOverview,
  AccountingEntrySummary,
} from "./types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "01": "Sin utilizacion del sistema financiero",
  "15": "Credito / saldo pendiente",
  "16": "Tarjeta de debito",
  "19": "Tarjeta de credito",
  "20": "Otros con utilizacion del sistema financiero",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function paymentMethodLabel(code: string) {
  return PAYMENT_METHOD_LABELS[code] ?? code;
}

function cashMovementTypeLabel(type: string) {
  switch (type) {
    case "OPENING_FLOAT":
      return "Apertura de caja";
    case "SALE_CASH_IN":
      return "Ingreso por venta";
    case "MANUAL_IN":
      return "Aporte de caja";
    case "WITHDRAWAL":
      return "Retiro de caja";
    case "REFUND_OUT":
      return "Devolucion desde caja";
    case "CLOSING_ADJUSTMENT":
      return "Ajuste de cierre";
    default:
      return type;
  }
}

function buildEntryMetrics(
  lines: Array<{
    debit: number;
    credit: number;
  }>,
) {
  const debitTotal = lines.reduce((acc, line) => acc + line.debit, 0);
  const creditTotal = lines.reduce((acc, line) => acc + line.credit, 0);

  return {
    debitTotal,
    creditTotal,
    balanceDifference: debitTotal - creditTotal,
    lineCount: lines.length,
  };
}

function toDateBoundary(value: string | undefined, endOfDay: boolean) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha invalida: ${value}`);
  }

  return date;
}

function toLineSummary(raw: {
  id: string;
  entryId: string;
  accountCode: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo: string | null;
  createdAt: Date;
}): AccountingEntryLineSummary {
  const account = getAccountingAccountByCode(raw.accountCode);

  return {
    id: raw.id,
    entryId: raw.entryId,
    accountCode: raw.accountCode,
    accountName: account?.name ?? null,
    debit: Number(raw.debit),
    credit: Number(raw.credit),
    memo: raw.memo,
    createdAt: raw.createdAt,
  };
}

function toEntrySummary(raw: {
  id: string;
  businessId: string;
  sourceType: import("@prisma/client").AccountingSourceType;
  sourceId: string;
  status: AccountingEntryStatus;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    entryId: string;
    accountCode: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
    memo: string | null;
    createdAt: Date;
  }>;
}): AccountingEntrySummary {
  const lines = raw.lines.map(toLineSummary);
  const metrics = buildEntryMetrics(lines);

  return {
    id: raw.id,
    businessId: raw.businessId,
    sourceType: raw.sourceType,
    sourceId: raw.sourceId,
    status: raw.status,
    postedAt: raw.postedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...metrics,
    lines,
  };
}

function validateBalancedLines(
  lines: Array<{
    debit: number;
    credit: number;
  }>,
) {
  const debit = lines.reduce((acc, line) => acc + line.debit, 0);
  const credit = lines.reduce((acc, line) => acc + line.credit, 0);

  if (Math.abs(debit - credit) > 0.0001) {
    throw new Error("El asiento no cuadra entre debitos y creditos");
  }
}

function validatePostingLines(
  lines: Array<{
    accountCode: string;
    debit: number;
    credit: number;
  }>,
) {
  for (const line of lines) {
    const account = getAccountingAccountByCode(line.accountCode);

    if (!account) {
      throw new Error(
        `La cuenta contable ${line.accountCode} no existe en el plan de cuentas`,
      );
    }

    if (!account.acceptsPostings) {
      throw new Error(
        `La cuenta contable ${line.accountCode} no acepta registros directos`,
      );
    }

    if (line.debit <= 0 && line.credit <= 0) {
      throw new Error(
        `La cuenta contable ${line.accountCode} debe registrar un debito o un credito`,
      );
    }

    if (line.debit > 0 && line.credit > 0) {
      throw new Error(
        `La cuenta contable ${line.accountCode} no puede tener debito y credito simultaneamente`,
      );
    }
  }
}

function resolveCollectionDebitAccount(params: {
  paymentMethod: string;
  affectsCashDrawer: boolean;
}) {
  if (params.affectsCashDrawer || params.paymentMethod === "01") {
    return ACCOUNT_CODES.cashDrawer;
  }

  return ACCOUNT_CODES.bankClearing;
}

async function resolveEntrySources(
  entries: AccountingEntrySummary[],
): Promise<Map<string, AccountingEntryListItem["source"]>> {
  const saleIds = entries
    .filter((entry) => entry.sourceType === AccountingSourceType.SALE)
    .map((entry) => entry.sourceId);
  const collectionIds = entries
    .filter((entry) => entry.sourceType === AccountingSourceType.COLLECTION)
    .map((entry) => entry.sourceId);
  const movementIds = entries
    .filter(
      (entry) =>
        entry.sourceType === AccountingSourceType.CASH_MOVEMENT ||
        entry.sourceType === AccountingSourceType.REFUND,
    )
    .map((entry) => entry.sourceId);

  const [sales, collections, movements] = await Promise.all([
    saleIds.length
      ? prisma.sale.findMany({
          where: { id: { in: saleIds } },
          select: {
            id: true,
            saleNumber: true,
            total: true,
            customer: {
              select: {
                razonSocial: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    collectionIds.length
      ? prisma.collection.findMany({
          where: { id: { in: collectionIds } },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            customer: {
              select: {
                razonSocial: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    movementIds.length
      ? prisma.cashMovement.findMany({
          where: { id: { in: movementIds } },
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const salesMap = new Map(sales.map((sale) => [sale.id, sale]));
  const collectionsMap = new Map(
    collections.map((collection) => [collection.id, collection]),
  );
  const movementsMap = new Map(movements.map((movement) => [movement.id, movement]));
  const resolved = new Map<string, AccountingEntryListItem["source"]>();

  for (const entry of entries) {
    if (entry.sourceType === AccountingSourceType.SALE) {
      const sale = salesMap.get(entry.sourceId);
      resolved.set(entry.id, {
        title: sale
          ? `Venta #${sale.saleNumber.toString()}`
          : "Venta registrada",
        subtitle: sale
          ? `${sale.customer.razonSocial} · ${formatCurrency(Number(sale.total))}`
          : entry.sourceId,
      });
      continue;
    }

    if (entry.sourceType === AccountingSourceType.COLLECTION) {
      const collection = collectionsMap.get(entry.sourceId);
      resolved.set(entry.id, {
        title: collection
          ? `Cobro ${paymentMethodLabel(collection.paymentMethod)}`
          : "Cobro registrado",
        subtitle: collection
          ? `${collection.customer.razonSocial} · ${formatCurrency(Number(collection.amount))}`
          : entry.sourceId,
      });
      continue;
    }

    if (
      entry.sourceType === AccountingSourceType.CASH_MOVEMENT ||
      entry.sourceType === AccountingSourceType.REFUND
    ) {
      const movement = movementsMap.get(entry.sourceId);
      resolved.set(entry.id, {
        title: movement
          ? cashMovementTypeLabel(movement.type)
          : entry.sourceType === AccountingSourceType.REFUND
            ? "Devolucion registrada"
            : "Movimiento de caja",
        subtitle: movement
          ? movement.description?.trim() || formatCurrency(Number(movement.amount))
          : entry.sourceId,
      });
      continue;
    }

    resolved.set(entry.id, {
      title: "Asiento manual",
      subtitle: entry.sourceId,
    });
  }

  return resolved;
}

function toEntryListItem(
  entry: AccountingEntrySummary,
  source: AccountingEntryListItem["source"],
): AccountingEntryListItem {
  return {
    ...entry,
    accountCodes: [...new Set(entry.lines.map((line) => line.accountCode))],
    source,
  };
}

export async function createDraftEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateDraftEntryInput,
) {
  createDraftEntrySchema.parse(input);
  validatePostingLines(input.lines);
  validateBalancedLines(input.lines);

  return tx.accountingEntry.create({
    data: {
      businessId: input.businessId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: AccountingEntryStatus.DRAFT,
      lines: {
        create: input.lines.map((line) => ({
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo ?? null,
        })),
      },
    },
    include: {
      lines: true,
    },
  });
}

export async function postEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  rawInput: unknown,
) {
  const input: PostEntryInput = postEntrySchema.parse(rawInput);

  const existing = await tx.accountingEntry.findUnique({
    where: { id: input.entryId },
    include: { lines: true },
  });

  if (!existing) {
    throw new Error("Asiento contable no encontrado");
  }

  validateBalancedLines(
    existing.lines.map((line) => ({
      debit: Number(line.debit),
      credit: Number(line.credit),
    })),
  );

  if (existing.status === AccountingEntryStatus.POSTED) {
    return existing;
  }

  return tx.accountingEntry.update({
    where: { id: input.entryId },
    data: {
      status: AccountingEntryStatus.POSTED,
      postedAt: new Date(),
    },
    include: {
      lines: true,
    },
  });
}

async function ensurePostedEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateDraftEntryInput,
): Promise<AccountingEntrySummary> {
  const existing = await tx.accountingEntry.findFirst({
    where: {
      businessId: input.businessId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    include: {
      lines: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing?.status === AccountingEntryStatus.POSTED) {
    return toEntrySummary(existing);
  }

  if (existing) {
    const postedExisting = await postEntryInTransaction(tx, {
      entryId: existing.id,
    });
    return toEntrySummary(postedExisting);
  }

  const draft = await createDraftEntryInTransaction(tx, input);
  const posted = await postEntryInTransaction(tx, { entryId: draft.id });
  return toEntrySummary(posted);
}

export async function postSaleEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    businessId: string;
    saleId: string;
    subtotal: number;
    taxTotal: number;
    total: number;
  },
): Promise<AccountingEntrySummary> {
  return ensurePostedEntryInTransaction(tx, {
    businessId: input.businessId,
    sourceType: AccountingSourceType.SALE,
    sourceId: input.saleId,
    lines: [
      {
        accountCode: ACCOUNT_CODES.accountsReceivable,
        debit: input.total,
        credit: 0,
        memo: "Devengo de venta",
      },
      {
        accountCode: ACCOUNT_CODES.revenue,
        debit: 0,
        credit: input.subtotal,
        memo: "Ingreso por ventas",
      },
      {
        accountCode: ACCOUNT_CODES.vatPayable,
        debit: 0,
        credit: input.taxTotal,
        memo: "IVA por pagar",
      },
    ],
  });
}

export async function postCollectionEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    businessId: string;
    collectionId: string;
    amount: number;
    paymentMethod: string;
    affectsCashDrawer: boolean;
  },
): Promise<AccountingEntrySummary> {
  return ensurePostedEntryInTransaction(tx, {
    businessId: input.businessId,
    sourceType: AccountingSourceType.COLLECTION,
    sourceId: input.collectionId,
    lines: [
      {
        accountCode: resolveCollectionDebitAccount({
          paymentMethod: input.paymentMethod,
          affectsCashDrawer: input.affectsCashDrawer,
        }),
        debit: input.amount,
        credit: 0,
        memo: "Cobro recibido",
      },
      {
        accountCode: ACCOUNT_CODES.accountsReceivable,
        debit: 0,
        credit: input.amount,
        memo: "Aplicacion de cobro",
      },
    ],
  });
}

export async function postRefundEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    businessId: string;
    movementId: string;
    amount: number;
  },
): Promise<AccountingEntrySummary> {
  return ensurePostedEntryInTransaction(tx, {
    businessId: input.businessId,
    sourceType: AccountingSourceType.REFUND,
    sourceId: input.movementId,
    lines: [
      {
        accountCode: ACCOUNT_CODES.refundExpense,
        debit: input.amount,
        credit: 0,
        memo: "Devolucion registrada desde caja",
      },
      {
        accountCode: ACCOUNT_CODES.cashDrawer,
        debit: 0,
        credit: input.amount,
        memo: "Salida de efectivo por devolucion",
      },
    ],
  });
}

export async function postCashMovementEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: {
    businessId: string;
    movementId: string;
    type: "MANUAL_IN" | "WITHDRAWAL";
    amount: number;
  },
): Promise<AccountingEntrySummary> {
  const isManualIn = input.type === "MANUAL_IN";

  return ensurePostedEntryInTransaction(tx, {
    businessId: input.businessId,
    sourceType: AccountingSourceType.CASH_MOVEMENT,
    sourceId: input.movementId,
    lines: [
      {
        accountCode: isManualIn
          ? ACCOUNT_CODES.cashDrawer
          : ACCOUNT_CODES.cashManualBridge,
        debit: input.amount,
        credit: 0,
        memo: isManualIn ? "Ingreso manual a caja" : "Salida manual desde caja",
      },
      {
        accountCode: isManualIn
          ? ACCOUNT_CODES.cashManualBridge
          : ACCOUNT_CODES.cashDrawer,
        debit: 0,
        credit: input.amount,
        memo: isManualIn ? "Contrapartida aporte caja" : "Caja",
      },
    ],
  });
}

export async function createDraftEntry(
  rawInput: unknown,
): Promise<AccountingEntrySummary> {
  const input: CreateDraftEntryInput = createDraftEntrySchema.parse(rawInput);
  const entry = await createDraftEntryInTransaction(prisma, input);

  return toEntrySummary(entry);
}

export async function postEntry(rawInput: unknown): Promise<AccountingEntrySummary> {
  const entry = await postEntryInTransaction(prisma, rawInput);

  return toEntrySummary(entry);
}

export async function reverseEntry(
  rawInput: unknown,
): Promise<AccountingEntrySummary> {
  const input: ReverseEntryInput = reverseEntrySchema.parse(rawInput);

  const entry = await prisma.accountingEntry.update({
    where: { id: input.entryId },
    data: {
      status: AccountingEntryStatus.REVERSED,
    },
    include: {
      lines: true,
    },
  });

  return toEntrySummary(entry);
}

export async function createManualAdjustmentEntry(
  businessId: string,
  rawInput: unknown,
): Promise<AccountingEntrySummary> {
  const input: CreateManualAdjustmentEntryInput =
    createManualAdjustmentEntrySchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const draft = await createDraftEntryInTransaction(tx, {
      businessId,
      sourceType: AccountingSourceType.ADJUSTMENT,
      sourceId: randomUUID(),
      lines: input.lines,
    });

    if (!input.autoPost) {
      return toEntrySummary(draft);
    }

    const posted = await postEntryInTransaction(tx, {
      entryId: draft.id,
    });

    return toEntrySummary(posted);
  });
}

export async function listAccountingEntriesByBusiness(
  businessId: string,
  rawFilters: unknown = {},
): Promise<AccountingEntriesOverview> {
  const filters: ListAccountingEntriesFilters =
    listAccountingEntriesFiltersSchema.parse(rawFilters);
  const from = toDateBoundary(filters.from, false);
  const to = toDateBoundary(filters.to, true);

  const entries = await prisma.accountingEntry.findMany({
    where: {
      businessId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      lines: {
        orderBy: [{ createdAt: "asc" }, { accountCode: "asc" }],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: filters.limit,
  });

  const summaries = entries.map(toEntrySummary);
  const sources = await resolveEntrySources(summaries);
  const rows = summaries.map((entry) =>
    toEntryListItem(entry, {
      title: sources.get(entry.id)?.title ?? entry.sourceType,
      subtitle: sources.get(entry.id)?.subtitle ?? entry.sourceId,
    }),
  );
  const summary = rows.reduce(
    (acc, entry) => {
      acc.entryCount += 1;
      acc.debitTotal += entry.debitTotal;
      acc.creditTotal += entry.creditTotal;
      acc.balanceDifference += entry.balanceDifference;

      if (entry.status === AccountingEntryStatus.POSTED) {
        acc.postedCount += 1;
      } else if (entry.status === AccountingEntryStatus.DRAFT) {
        acc.draftCount += 1;
      } else if (entry.status === AccountingEntryStatus.REVERSED) {
        acc.reversedCount += 1;
      }

      return acc;
    },
    {
      entryCount: 0,
      postedCount: 0,
      draftCount: 0,
      reversedCount: 0,
      debitTotal: 0,
      creditTotal: 0,
      balanceDifference: 0,
    },
  );

  return {
    filters: {
      status: filters.status ?? null,
      sourceType: filters.sourceType ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
      limit: filters.limit,
    },
    summary,
    rows,
  };
}

export async function getAccountingAccountPlan(
  businessId: string,
): Promise<AccountingAccountPlanOverview> {
  const postedEntries = await prisma.accountingEntry.findMany({
    where: {
      businessId,
      status: AccountingEntryStatus.POSTED,
    },
    select: {
      postedAt: true,
      lines: {
        select: {
          accountCode: true,
          debit: true,
          credit: true,
        },
      },
    },
  });

  const usage = new Map<
    string,
    {
      usageCount: number;
      debitTotal: number;
      creditTotal: number;
      lastPostedAt: Date | null;
    }
  >();

  for (const entry of postedEntries) {
    for (const line of entry.lines) {
      const current = usage.get(line.accountCode) ?? {
        usageCount: 0,
        debitTotal: 0,
        creditTotal: 0,
        lastPostedAt: null,
      };

      current.usageCount += 1;
      current.debitTotal += Number(line.debit);
      current.creditTotal += Number(line.credit);
      current.lastPostedAt =
        !current.lastPostedAt ||
        (entry.postedAt && entry.postedAt > current.lastPostedAt)
          ? entry.postedAt
          : current.lastPostedAt;

      usage.set(line.accountCode, current);
    }
  }

  const accounts = listAccountingAccounts().map((account) => {
    const stats = usage.get(account.code);
    const debitTotal = stats?.debitTotal ?? 0;
    const creditTotal = stats?.creditTotal ?? 0;

    return {
      ...account,
      usageCount: stats?.usageCount ?? 0,
      debitTotal,
      creditTotal,
      balance:
        account.defaultNature === "DEBIT"
          ? debitTotal - creditTotal
          : creditTotal - debitTotal,
      lastPostedAt: stats?.lastPostedAt ?? null,
    };
  });

  const summary = accounts.reduce(
    (acc, account) => {
      acc.configuredAccounts += 1;

      if (account.acceptsPostings) {
        acc.postableAccounts += 1;
      }

      if (account.acceptsPostings && account.usageCount > 0) {
        acc.activeAccounts += 1;
      }

      acc.debitTotal += account.debitTotal;
      acc.creditTotal += account.creditTotal;

      return acc;
    },
    {
      configuredAccounts: 0,
      postableAccounts: 0,
      activeAccounts: 0,
      debitTotal: 0,
      creditTotal: 0,
    },
  );

  const groups = accounts
    .filter((account) => account.acceptsPostings)
    .reduce<Map<string, AccountingAccountPlanOverview["groups"][number]>>(
      (acc, account) => {
        const current = acc.get(account.groupKey) ?? {
          groupKey: account.groupKey,
          groupLabel: account.groupLabel,
          defaultNature: account.defaultNature,
          configuredAccounts: 0,
          activeAccounts: 0,
          debitTotal: 0,
          creditTotal: 0,
        };

        current.configuredAccounts += 1;
        if (account.usageCount > 0) {
          current.activeAccounts += 1;
        }
        current.debitTotal += account.debitTotal;
        current.creditTotal += account.creditTotal;

        acc.set(account.groupKey, current);
        return acc;
      },
      new Map(),
    );

  return {
    summary,
    groups: [...groups.values()],
    accounts,
  };
}
