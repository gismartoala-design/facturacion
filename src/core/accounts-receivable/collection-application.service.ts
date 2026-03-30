import {
  CollectionApplicationStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  applyCollectionSchema,
  reverseCollectionApplicationSchema,
  type ApplyCollectionInput,
  type ReverseCollectionApplicationInput,
} from "./schemas";
import { recalculateReceivableBalance } from "./receivable.service";
import type { CollectionApplicationSummary } from "./types";

function toCollectionApplicationSummary(raw: {
  id: string;
  collectionId: string;
  saleId: string | null;
  receivableId: string | null;
  appliedAmount: Prisma.Decimal;
  status: CollectionApplicationStatus;
  notes: string | null;
  createdById: string | null;
  appliedAt: Date;
  createdAt: Date;
}): CollectionApplicationSummary {
  return {
    id: raw.id,
    collectionId: raw.collectionId,
    saleId: raw.saleId,
    receivableId: raw.receivableId,
    appliedAmount: Number(raw.appliedAmount),
    status: raw.status,
    notes: raw.notes,
    createdById: raw.createdById,
    appliedAt: raw.appliedAt,
    createdAt: raw.createdAt,
  };
}

async function createApplication(
  input: ApplyCollectionInput,
): Promise<CollectionApplicationSummary> {
  const application = await createApplicationInTransaction(prisma, input);

  if (application.receivableId) {
    await recalculateReceivableBalance(application.receivableId);
  }

  return toCollectionApplicationSummary(application);
}

export async function createApplicationInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  input: ApplyCollectionInput,
) {
  return tx.collectionApplication.create({
    data: {
      collectionId: input.collectionId,
      saleId: input.saleId ?? null,
      receivableId: input.receivableId ?? null,
      appliedAmount: input.appliedAmount,
      status: CollectionApplicationStatus.APPLIED,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
      appliedAt: input.appliedAt ?? new Date(),
    },
  });
}

export async function applyCollectionToSaleInTransaction(
  tx: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  rawInput: unknown,
): Promise<CollectionApplicationSummary> {
  const input: ApplyCollectionInput = applyCollectionSchema.parse(rawInput);

  if (!input.saleId) {
    throw new Error("Debes indicar la venta a la que aplicar el cobro");
  }

  const application = await createApplicationInTransaction(tx, {
    ...input,
    receivableId: null,
  });

  return toCollectionApplicationSummary(application);
}

export async function applyCollectionToSale(
  rawInput: unknown,
): Promise<CollectionApplicationSummary> {
  const input: ApplyCollectionInput = applyCollectionSchema.parse(rawInput);

  if (!input.saleId) {
    throw new Error("Debes indicar la venta a la que aplicar el cobro");
  }

  return createApplication({
    ...input,
    receivableId: null,
  });
}

export async function applyCollectionToReceivable(
  rawInput: unknown,
): Promise<CollectionApplicationSummary> {
  const input: ApplyCollectionInput = applyCollectionSchema.parse(rawInput);

  if (!input.receivableId) {
    throw new Error(
      "Debes indicar la cuenta por cobrar a la que aplicar el cobro",
    );
  }

  return createApplication({
    ...input,
    saleId: input.saleId ?? null,
  });
}

export async function reverseCollectionApplication(
  rawInput: unknown,
): Promise<CollectionApplicationSummary> {
  const input: ReverseCollectionApplicationInput =
    reverseCollectionApplicationSchema.parse(rawInput);

  const application = await prisma.collectionApplication.update({
    where: { id: input.applicationId },
    data: {
      status: CollectionApplicationStatus.REVERSED,
      notes: input.notes ?? undefined,
    },
  });

  if (application.receivableId) {
    await recalculateReceivableBalance(application.receivableId);
  }

  return toCollectionApplicationSummary(application);
}
