import { randomUUID } from "node:crypto";

import {
  AccountingAccountNature,
  AccountingEntryStatus,
  AccountingSourceType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ACCOUNT_CODES } from "./chart-of-accounts";
import {
  getAccountingAccountByCodeInTransaction,
  getAccountingAccountNameMapByCodesInTransaction,
} from "./account-plan.service";
import {
  createDraftEntrySchema,
  createManualAdjustmentEntrySchema,
  accountLedgerFiltersSchema,
  listAccountingEntriesFiltersSchema,
  postEntrySchema,
  reverseEntrySchema,
  type AccountLedgerFilters,
  type CreateDraftEntryInput,
  type CreateManualAdjustmentEntryInput,
  type ListAccountingEntriesFilters,
  type PostEntryInput,
  type ReverseEntryInput,
} from "./schemas";
import type {
  AccountingLedgerOverview,
  AccountingLedgerRow,
  AccountingEntryLineSummary,
  AccountingEntryListItem,
  AccountingEntriesOverview,
  AccountingEntrySummary,
} from "./types";

type DbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "01": "Sin utilizacion del sistema financiero",
  "15": "Credito / saldo pendiente",
  "16": "Tarjeta de debito",
  "19": "Tarjeta de credito",
  "20": "Otros con utilizacion del sistema financiero",
};

const ACCOUNT_GROUP_LABELS: Record<string, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  INCOME: "Ingresos",
  EXPENSE: "Gastos",
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

function collectAccountCodesFromEntries(
  entries: Array<{
    lines: Array<{
      accountCode: string;
    }>;
  }>,
) {
  return [...new Set(entries.flatMap((entry) => entry.lines.map((line) => line.accountCode)))];
}

function toLineSummary(raw: {
  id: string;
  entryId: string;
  accountCode: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo: string | null;
  createdAt: Date;
}, accountNames: Map<string, string>): AccountingEntryLineSummary {
  return {
    id: raw.id,
    entryId: raw.entryId,
    accountCode: raw.accountCode,
    accountName: accountNames.get(raw.accountCode) ?? null,
    debit: Number(raw.debit),
    credit: Number(raw.credit),
    memo: raw.memo,
    createdAt: raw.createdAt,
  };
}

function toEntrySummary(raw: {
  id: string;
  businessId: string;
  entryNumber: number | null;
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
}, accountNames: Map<string, string>): AccountingEntrySummary {
  const lines = raw.lines.map((line) => toLineSummary(line, accountNames));
  const metrics = buildEntryMetrics(lines);

  return {
    id: raw.id,
    businessId: raw.businessId,
    entryNumber: raw.entryNumber,
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

async function buildEntrySummaryInTransaction(
  tx: DbClient,
  raw: {
    id: string;
    businessId: string;
    entryNumber: number | null;
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
  },
) {
  const accountNames = await getAccountingAccountNameMapByCodesInTransaction(
    tx,
    raw.businessId,
    collectAccountCodesFromEntries([raw]),
  );

  return toEntrySummary(raw, accountNames);
}

async function buildEntrySummariesInTransaction(
  tx: DbClient,
  raws: Array<{
    id: string;
    businessId: string;
    entryNumber: number | null;
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
  }>,
) {
  if (raws.length === 0) {
    return [];
  }

  const accountNames = await getAccountingAccountNameMapByCodesInTransaction(
    tx,
    raws[0].businessId,
    collectAccountCodesFromEntries(raws),
  );

  return raws.map((raw) => toEntrySummary(raw, accountNames));
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

async function validatePostingLines(
  tx: DbClient,
  businessId: string,
  lines: Array<{
    accountCode: string;
    debit: number;
    credit: number;
  }>,
) {
  for (const line of lines) {
    const account = await getAccountingAccountByCodeInTransaction(
      tx,
      businessId,
      line.accountCode,
    );

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
  entries: Array<{
    id: string;
    sourceType: AccountingSourceType;
    sourceId: string;
  }>,
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

async function nextEntryNumberInTransaction(
  tx: DbClient,
  businessId: string,
): Promise<number> {
  const result = await tx.accountingEntry.aggregate({
    where: { businessId },
    _max: { entryNumber: true },
  });

  return (result._max.entryNumber ?? 0) + 1;
}

export async function createDraftEntryInTransaction(
  tx: DbClient,
  input: CreateDraftEntryInput,
) {
  createDraftEntrySchema.parse(input);
  await validatePostingLines(tx, input.businessId, input.lines);
  validateBalancedLines(input.lines);

  const entryNumber = await nextEntryNumberInTransaction(tx, input.businessId);

  return tx.accountingEntry.create({
    data: {
      businessId: input.businessId,
      entryNumber,
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
  tx: DbClient,
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

  await validatePostingLines(
    tx,
    existing.businessId,
    existing.lines.map((line) => ({
      accountCode: line.accountCode,
      debit: Number(line.debit),
      credit: Number(line.credit),
    })),
  );

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
  tx: DbClient,
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
    return buildEntrySummaryInTransaction(tx, existing);
  }

  if (existing) {
    const postedExisting = await postEntryInTransaction(tx, {
      entryId: existing.id,
    });
    return buildEntrySummaryInTransaction(tx, postedExisting);
  }

  const draft = await createDraftEntryInTransaction(tx, input);
  const posted = await postEntryInTransaction(tx, { entryId: draft.id });
  return buildEntrySummaryInTransaction(tx, posted);
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
  const lines: CreateDraftEntryInput["lines"] = [
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
  ];

  if (input.taxTotal > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.vatPayable,
      debit: 0,
      credit: input.taxTotal,
      memo: "IVA por pagar",
    });
  }

  return ensurePostedEntryInTransaction(tx, {
    businessId: input.businessId,
    sourceType: AccountingSourceType.SALE,
    sourceId: input.saleId,
    lines,
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

  return buildEntrySummaryInTransaction(prisma, entry);
}

export async function postEntry(rawInput: unknown): Promise<AccountingEntrySummary> {
  const entry = await postEntryInTransaction(prisma, rawInput);

  return buildEntrySummaryInTransaction(prisma, entry);
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

  return buildEntrySummaryInTransaction(prisma, entry);
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
      return buildEntrySummaryInTransaction(tx, draft);
    }

    const posted = await postEntryInTransaction(tx, {
      entryId: draft.id,
    });

    return buildEntrySummaryInTransaction(tx, posted);
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

  const summaries = await buildEntrySummariesInTransaction(prisma, entries);
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

export async function getAccountLedgerByBusiness(
  businessId: string,
  rawFilters: unknown,
): Promise<AccountingLedgerOverview> {
  const filters: AccountLedgerFilters = accountLedgerFiltersSchema.parse(rawFilters);
  const from = toDateBoundary(filters.from, false);
  const to = toDateBoundary(filters.to, true);

  return prisma.$transaction(async (tx) => {
    const account = await getAccountingAccountByCodeInTransaction(
      tx,
      businessId,
      filters.accountCode,
    );

    if (!account) {
      throw new Error(
        `La cuenta contable ${filters.accountCode} no existe en el plan de cuentas`,
      );
    }

    const parentAccount = account.parentId
      ? await tx.accountingAccount.findUnique({
          where: { id: account.parentId },
          select: { code: true },
        })
      : null;

    const openingAggregate = from
      ? await tx.accountingEntryLine.aggregate({
          where: {
            accountCode: account.code,
            entry: {
              businessId,
              status: AccountingEntryStatus.POSTED,
              postedAt: { lt: from },
            },
          },
          _sum: {
            debit: true,
            credit: true,
          },
        })
      : {
          _sum: {
            debit: 0,
            credit: 0,
          },
        };

    const entries = await tx.accountingEntry.findMany({
      where: {
        businessId,
        status: AccountingEntryStatus.POSTED,
        ...(from || to
          ? {
              postedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        lines: {
          some: {
            accountCode: account.code,
          },
        },
      },
      include: {
        lines: {
          where: {
            accountCode: account.code,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
      take: filters.limit,
    });

    const sources = await resolveEntrySources(entries);
    const openingDebit = Number(openingAggregate._sum.debit ?? 0);
    const openingCredit = Number(openingAggregate._sum.credit ?? 0);
    let runningBalance =
      account.defaultNature === AccountingAccountNature.DEBIT
        ? openingDebit - openingCredit
        : openingCredit - openingDebit;

    const rows: AccountingLedgerRow[] = [];

    for (const entry of entries) {
      const postedAt = entry.postedAt ?? entry.createdAt;

      for (const line of entry.lines) {
        const debit = Number(line.debit);
        const credit = Number(line.credit);
        runningBalance =
          account.defaultNature === AccountingAccountNature.DEBIT
            ? runningBalance + debit - credit
            : runningBalance + credit - debit;

        rows.push({
          lineId: line.id,
          entryId: entry.id,
          postedAt,
          createdAt: line.createdAt,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
          source: sources.get(entry.id) ?? {
            title: entry.sourceType,
            subtitle: entry.sourceId,
          },
          debit,
          credit,
          memo: line.memo,
          runningBalance,
        });
      }
    }

    const summary = rows.reduce(
      (acc, row) => {
        acc.debitTotal += row.debit;
        acc.creditTotal += row.credit;
        acc.movementCount += 1;
        return acc;
      },
      {
        openingBalance:
          account.defaultNature === "DEBIT"
            ? openingDebit - openingCredit
            : openingCredit - openingDebit,
        debitTotal: 0,
        creditTotal: 0,
        closingBalance:
          account.defaultNature === "DEBIT"
            ? openingDebit - openingCredit
            : openingCredit - openingDebit,
        movementCount: 0,
      },
    );

    summary.closingBalance =
      rows.at(-1)?.runningBalance ?? summary.openingBalance;

    return {
      filters: {
        accountCode: account.code,
        from: filters.from ?? null,
        to: filters.to ?? null,
        limit: filters.limit,
      },
      account: {
        id: account.id,
        businessId: account.businessId,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey,
        groupLabel: ACCOUNT_GROUP_LABELS[account.groupKey] ?? account.groupKey,
        defaultNature: account.defaultNature,
        parentCode: parentAccount?.code ?? null,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        active: account.active,
      },
      summary,
      rows,
    };
  });
}
