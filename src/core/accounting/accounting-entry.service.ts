import {
  AccountingSourceType,
  AccountingEntryStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createDraftEntrySchema,
  postEntrySchema,
  reverseEntrySchema,
  type CreateDraftEntryInput,
  type PostEntryInput,
  type ReverseEntryInput,
} from "./schemas";
import type {
  AccountingEntryLineSummary,
  AccountingEntrySummary,
} from "./types";

const ACCOUNT_CODES = {
  accountsReceivable: "110101",
  cashDrawer: "110201",
  bankClearing: "110301",
  revenue: "410101",
  vatPayable: "210201",
  refundExpense: "510101",
  cashManualBridge: "230101",
} as const;

function toLineSummary(raw: {
  id: string;
  entryId: string;
  accountCode: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo: string | null;
  createdAt: Date;
}): AccountingEntryLineSummary {
  return {
    id: raw.id,
    entryId: raw.entryId,
    accountCode: raw.accountCode,
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
  return {
    id: raw.id,
    businessId: raw.businessId,
    sourceType: raw.sourceType,
    sourceId: raw.sourceId,
    status: raw.status,
    postedAt: raw.postedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lines: raw.lines.map(toLineSummary),
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

function resolveCollectionDebitAccount(params: {
  paymentMethod: string;
  affectsCashDrawer: boolean;
}) {
  if (params.affectsCashDrawer || params.paymentMethod === "01") {
    return ACCOUNT_CODES.cashDrawer;
  }

  return ACCOUNT_CODES.bankClearing;
}

export async function createDraftEntryInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateDraftEntryInput,
) {
  createDraftEntrySchema.parse(input);
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
