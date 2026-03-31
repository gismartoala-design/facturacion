import { CashSessionStatus, CollectionStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type { SessionPayload } from "@/lib/auth";
import {
  openCashSessionSchema,
  closeCashSessionSchema,
  type OpenCashSessionInput,
  type CloseCashSessionInput,
} from "./schemas";

const logger = createLogger("CashSessionService");

export type CashSessionSummary = {
  id: string;
  status: CashSessionStatus;
  openingAmount: number;
  declaredClosing: number | null;
  expectedClosing: number | null;
  difference: number | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  openedById: string;
  salesCashTotal: number;
  movementsTotal: number;
};

type CashSessionComputedTotals = {
  salesCashTotal: Prisma.Decimal;
  movementsTotal: Prisma.Decimal;
  expectedClosing: Prisma.Decimal;
};

async function computeSessionTotals(params: {
  sessionId: string;
  openingAmount: Prisma.Decimal;
}): Promise<CashSessionComputedTotals> {
  const [collectionsAggregate, movements] = await Promise.all([
    prisma.collection.aggregate({
      where: {
        cashSessionId: params.sessionId,
        status: CollectionStatus.APPLIED,
        affectsCashDrawer: true,
      },
      _sum: { amount: true },
    }),
    prisma.cashMovement.findMany({
      where: {
        sessionId: params.sessionId,
        type: {
          in: ["MANUAL_IN", "WITHDRAWAL", "REFUND_OUT", "CLOSING_ADJUSTMENT"],
        },
      },
      select: { type: true, amount: true },
    }),
  ]);

  const salesCashTotal = new Prisma.Decimal(collectionsAggregate._sum.amount ?? 0);
  const movementsTotal = movements.reduce((acc, movement) => {
    if (movement.type === "MANUAL_IN") {
      return acc.add(movement.amount);
    }

    return acc.sub(movement.amount);
  }, new Prisma.Decimal(0));

  return {
    salesCashTotal,
    movementsTotal,
    expectedClosing: params.openingAmount.add(salesCashTotal).add(movementsTotal),
  };
}

async function toCashSessionSummary(raw: {
  id: string;
  status: CashSessionStatus;
  openingAmount: Prisma.Decimal;
  declaredClosing: Prisma.Decimal | null;
  expectedClosing: Prisma.Decimal | null;
  difference: Prisma.Decimal | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  openedById: string;
}): Promise<CashSessionSummary> {
  const totals = await computeSessionTotals({
    sessionId: raw.id,
    openingAmount: raw.openingAmount,
  });
  const expectedClosing = raw.expectedClosing ?? totals.expectedClosing;
  const difference =
    raw.difference ??
    (raw.declaredClosing ? raw.declaredClosing.sub(expectedClosing) : null);

  return {
    id: raw.id,
    status: raw.status,
    openingAmount: Number(raw.openingAmount),
    declaredClosing: raw.declaredClosing ? Number(raw.declaredClosing) : null,
    expectedClosing: Number(expectedClosing),
    difference: difference ? Number(difference) : null,
    notes: raw.notes,
    openedAt: raw.openedAt,
    closedAt: raw.closedAt,
    openedById: raw.openedById,
    salesCashTotal: Number(totals.salesCashTotal),
    movementsTotal: Number(totals.movementsTotal),
  };
}

export async function getActiveCashSession(
  businessId: string,
  userId: string,
): Promise<CashSessionSummary | null> {
  const session = await prisma.cashSession.findFirst({
    where: { businessId, openedById: userId, status: CashSessionStatus.OPEN },
    orderBy: { openedAt: "desc" },
  });

  if (!session) return null;
  return toCashSessionSummary(session);
}

export async function listClosedCashSessionsByUser(
  businessId: string,
  userId: string,
  take = 30,
): Promise<CashSessionSummary[]> {
  const sessions = await prisma.cashSession.findMany({
    where: {
      businessId,
      openedById: userId,
      status: CashSessionStatus.CLOSED,
    },
    orderBy: {
      closedAt: "desc",
    },
    take,
  });

  return Promise.all(sessions.map((session) => toCashSessionSummary(session)));
}

export async function openCashSession(
  session: SessionPayload,
  businessId: string,
  rawInput: unknown,
): Promise<CashSessionSummary> {
  const input: OpenCashSessionInput = openCashSessionSchema.parse(rawInput);

  const existing = await getActiveCashSession(businessId, session.sub);
  if (existing) {
    throw new Error("Ya existe una caja abierta para este usuario");
  }

  const cashSession = await prisma.$transaction(async (tx) => {
    const created = await tx.cashSession.create({
      data: {
        businessId,
        openedById: session.sub,
        openingAmount: input.openingAmount,
        notes: input.notes || null,
      },
    });

    await tx.cashMovement.create({
      data: {
        businessId,
        sessionId: created.id,
        type: "OPENING_FLOAT",
        amount: input.openingAmount,
        description: "Fondo inicial de apertura",
        createdById: session.sub,
      },
    });

    return created;
  });

  logger.info("cash-session:opened", { sessionId: cashSession.id, businessId, userId: session.sub });
  return toCashSessionSummary(cashSession);
}

export async function closeCashSession(
  session: SessionPayload,
  businessId: string,
  rawInput: unknown,
): Promise<CashSessionSummary> {
  const input: CloseCashSessionInput = closeCashSessionSchema.parse(rawInput);

  // Lookup explícito por ID + negocio + dueño + estado OPEN.
  // Esto evita que un usuario cierre la sesión de otro.
  const existing = await prisma.cashSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!existing) {
    throw new Error("Sesion de caja no encontrada");
  }
  if (existing.businessId !== businessId) {
    throw new Error("La sesion no pertenece a este negocio");
  }
  if (existing.openedById !== session.sub) {
    throw new Error("No tienes permiso para cerrar esta sesion");
  }
  if (existing.status !== CashSessionStatus.OPEN) {
    throw new Error("La sesion ya fue cerrada");
  }

  const totals = await computeSessionTotals({
    sessionId: existing.id,
    openingAmount: existing.openingAmount,
  });
  const expectedClosing = totals.expectedClosing;
  const declaredDecimal = new Prisma.Decimal(input.declaredAmount);
  const difference = declaredDecimal.sub(expectedClosing);

  const closedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.cashSession.update({
      where: { id: existing.id },
      data: {
        status: CashSessionStatus.CLOSED,
        declaredClosing: declaredDecimal,
        expectedClosing,
        difference,
        closedAt,
        closedById: session.sub,
        notes: input.notes || existing.notes,
      },
    });

    await tx.cashReconciliation.create({
      data: {
        sessionId: existing.id,
        expectedAmount: expectedClosing,
        declaredAmount: declaredDecimal,
        difference,
      },
    });

    return result;
  });

  logger.info("cash-session:closed", {
    sessionId: existing.id,
    businessId,
    userId: session.sub,
    expectedClosing: expectedClosing.toNumber(),
    declaredAmount: input.declaredAmount,
    difference: difference.toNumber(),
  });

  return toCashSessionSummary(updated);
}
