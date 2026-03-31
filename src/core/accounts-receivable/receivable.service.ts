import {
  AccountsReceivableStatus,
  CollectionApplicationStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createReceivableSchema,
  type CreateReceivableInput,
} from "./schemas";
import type { AccountsReceivableSummary } from "./types";

function toReceivableSummary(raw: {
  id: string;
  businessId: string;
  customerId: string;
  saleId: string | null;
  documentType: string;
  documentId: string | null;
  currency: string;
  issuedAt: Date;
  dueAt: Date | null;
  originalAmount: Prisma.Decimal;
  appliedAmount: Prisma.Decimal;
  pendingAmount: Prisma.Decimal;
  status: AccountsReceivableStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AccountsReceivableSummary {
  return {
    id: raw.id,
    businessId: raw.businessId,
    customerId: raw.customerId,
    saleId: raw.saleId,
    documentType: raw.documentType,
    documentId: raw.documentId,
    currency: raw.currency,
    issuedAt: raw.issuedAt,
    dueAt: raw.dueAt,
    originalAmount: Number(raw.originalAmount),
    appliedAmount: Number(raw.appliedAmount),
    pendingAmount: Number(raw.pendingAmount),
    status: raw.status,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function resolveReceivableStatus(params: {
  originalAmount: number;
  pendingAmount: number;
  dueAt: Date | null;
}) {
  if (params.pendingAmount <= 0) {
    return AccountsReceivableStatus.PAID;
  }

  if (params.pendingAmount < params.originalAmount) {
    return params.dueAt && params.dueAt < new Date()
      ? AccountsReceivableStatus.OVERDUE
      : AccountsReceivableStatus.PARTIALLY_PAID;
  }

  return params.dueAt && params.dueAt < new Date()
    ? AccountsReceivableStatus.OVERDUE
    : AccountsReceivableStatus.OPEN;
}

export async function createReceivable(
  rawInput: unknown,
): Promise<AccountsReceivableSummary> {
  const input: CreateReceivableInput = createReceivableSchema.parse(rawInput);

  const receivable = await createReceivableInTransaction(prisma, input);

  return toReceivableSummary(receivable);
}

export async function createReceivableInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateReceivableInput,
) {
  createReceivableSchema.parse(input);

  if (input.appliedAmount > input.originalAmount) {
    throw new Error("El valor aplicado no puede exceder el valor original");
  }

  if (input.pendingAmount > input.originalAmount) {
    throw new Error("El saldo pendiente no puede exceder el valor original");
  }

  return tx.accountsReceivable.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      saleId: input.saleId ?? null,
      documentType: input.documentType,
      documentId: input.documentId ?? null,
      currency: input.currency,
      issuedAt: input.issuedAt,
      dueAt: input.dueAt ?? null,
      originalAmount: input.originalAmount,
      appliedAmount: input.appliedAmount,
      pendingAmount: input.pendingAmount,
      status: resolveReceivableStatus({
        originalAmount: input.originalAmount,
        pendingAmount: input.pendingAmount,
        dueAt: input.dueAt ?? null,
      }),
      notes: input.notes ?? null,
    },
  });
}

export async function recalculateReceivableBalance(
  receivableId: string,
): Promise<AccountsReceivableSummary> {
  const receivable = await prisma.accountsReceivable.findUnique({
    where: { id: receivableId },
  });

  if (!receivable) {
    throw new Error("Cuenta por cobrar no encontrada");
  }

  const aggregate = await prisma.collectionApplication.aggregate({
    where: {
      receivableId,
      status: CollectionApplicationStatus.APPLIED,
    },
    _sum: {
      appliedAmount: true,
    },
  });

  const appliedAmount = Number(aggregate._sum.appliedAmount ?? 0);
  const originalAmount = Number(receivable.originalAmount);
  const pendingAmount = Math.max(originalAmount - appliedAmount, 0);
  const status = resolveReceivableStatus({
    originalAmount,
    pendingAmount,
    dueAt: receivable.dueAt,
  });

  const updated = await prisma.accountsReceivable.update({
    where: { id: receivableId },
    data: {
      appliedAmount,
      pendingAmount,
      status,
    },
  });

  return toReceivableSummary(updated);
}

export async function getReceivableById(
  receivableId: string,
): Promise<AccountsReceivableSummary | null> {
  const receivable = await prisma.accountsReceivable.findUnique({
    where: { id: receivableId },
  });

  return receivable ? toReceivableSummary(receivable) : null;
}

export async function listReceivablesByBusiness(
  businessId: string,
): Promise<AccountsReceivableSummary[]> {
  const receivables = await prisma.accountsReceivable.findMany({
    where: { businessId },
    orderBy: [{ status: "asc" }, { issuedAt: "desc" }],
  });

  return receivables.map(toReceivableSummary);
}
