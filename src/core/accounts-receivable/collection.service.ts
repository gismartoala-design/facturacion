import {
  CollectionStatus,
  type Prisma,
} from "@prisma/client";

import { postCollectionEntryInTransaction } from "@/core/accounting/accounting-entry.service";
import { prisma } from "@/lib/prisma";
import {
  createCollectionDraftSchema,
  createCollectionSchema,
  type CreateCollectionDraftInput,
  type CreateCollectionInput,
} from "./schemas";
import type { CollectionSummary } from "./types";

function toCollectionSummary(raw: {
  id: string;
  businessId: string;
  customerId: string;
  cashSessionId: string | null;
  amount: Prisma.Decimal;
  paymentMethod: string;
  status: CollectionStatus;
  affectsCashDrawer: boolean;
  requiresBankReconciliation: boolean;
  externalReference: string | null;
  notes: string | null;
  registeredById: string | null;
  collectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): CollectionSummary {
  return {
    id: raw.id,
    businessId: raw.businessId,
    customerId: raw.customerId,
    cashSessionId: raw.cashSessionId,
    amount: Number(raw.amount),
    paymentMethod: raw.paymentMethod,
    status: raw.status,
    affectsCashDrawer: raw.affectsCashDrawer,
    requiresBankReconciliation: raw.requiresBankReconciliation,
    externalReference: raw.externalReference,
    notes: raw.notes,
    registeredById: raw.registeredById,
    collectedAt: raw.collectedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function createCollectionDraft(
  rawInput: unknown,
): Promise<CollectionSummary> {
  const input: CreateCollectionDraftInput = createCollectionDraftSchema.parse(
    rawInput,
  );

  const collection = await createCollectionDraftInTransaction(prisma, input);

  return toCollectionSummary(collection);
}

export async function createCollection(
  rawInput: unknown,
): Promise<CollectionSummary> {
  const input: CreateCollectionInput = createCollectionSchema.parse(rawInput);

  const collection = await prisma.$transaction(async (tx) => {
    const created = await createCollectionInTransaction(tx, input);
    if (input.status === CollectionStatus.APPLIED) {
      await postCollectionEntryInTransaction(tx, {
        businessId: input.businessId,
        collectionId: created.id,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        affectsCashDrawer: input.affectsCashDrawer,
      });
    }
    return created;
  });

  return toCollectionSummary(collection);
}

export async function createCollectionDraftInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateCollectionDraftInput,
) {
  return tx.collection.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      cashSessionId: input.cashSessionId ?? null,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: CollectionStatus.PENDING,
      affectsCashDrawer: input.affectsCashDrawer,
      requiresBankReconciliation: input.requiresBankReconciliation,
      externalReference: input.externalReference ?? null,
      notes: input.notes ?? null,
      registeredById: input.registeredById ?? null,
      collectedAt: input.collectedAt ?? new Date(),
    },
  });
}

export async function createCollectionInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: CreateCollectionInput,
) {
  return tx.collection.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      cashSessionId: input.cashSessionId ?? null,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: input.status,
      affectsCashDrawer: input.affectsCashDrawer,
      requiresBankReconciliation: input.requiresBankReconciliation,
      externalReference: input.externalReference ?? null,
      notes: input.notes ?? null,
      registeredById: input.registeredById ?? null,
      collectedAt: input.collectedAt ?? new Date(),
    },
  });
}

export async function getCollectionById(
  collectionId: string,
): Promise<CollectionSummary | null> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  return collection ? toCollectionSummary(collection) : null;
}

export async function listCollectionsByBusiness(
  businessId: string,
): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { businessId },
    orderBy: { collectedAt: "desc" },
  });

  return collections.map(toCollectionSummary);
}
