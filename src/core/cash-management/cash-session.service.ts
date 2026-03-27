import { CashSessionStatus, Prisma } from "@prisma/client";

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

async function computeExpectedClosing(sessionId: string): Promise<Prisma.Decimal> {
  const movements = await prisma.cashMovement.findMany({
    where: { sessionId },
    select: { type: true, amount: true },
  });

  return movements.reduce((acc, m) => {
    const amount = m.amount;
    if (
      m.type === "OPENING_FLOAT" ||
      m.type === "SALE_CASH_IN" ||
      m.type === "MANUAL_IN"
    ) {
      return acc.add(amount);
    }
    if (
      m.type === "WITHDRAWAL" ||
      m.type === "REFUND_OUT" ||
      m.type === "CLOSING_ADJUSTMENT"
    ) {
      return acc.sub(amount);
    }
    return acc;
  }, new Prisma.Decimal(0));
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
  const movements = await prisma.cashMovement.findMany({
    where: { sessionId: raw.id },
    select: { type: true, amount: true },
  });

  const salesCashTotal = movements
    .filter((m) => m.type === "SALE_CASH_IN")
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const movementsTotal = movements
    .filter((m) => m.type === "MANUAL_IN" || m.type === "WITHDRAWAL" || m.type === "REFUND_OUT")
    .reduce((acc, m) => {
      const sign = m.type === "WITHDRAWAL" || m.type === "REFUND_OUT" ? -1 : 1;
      return acc + sign * Number(m.amount);
    }, 0);

  return {
    id: raw.id,
    status: raw.status,
    openingAmount: Number(raw.openingAmount),
    declaredClosing: raw.declaredClosing ? Number(raw.declaredClosing) : null,
    expectedClosing: raw.expectedClosing ? Number(raw.expectedClosing) : null,
    difference: raw.difference ? Number(raw.difference) : null,
    notes: raw.notes,
    openedAt: raw.openedAt,
    closedAt: raw.closedAt,
    openedById: raw.openedById,
    salesCashTotal,
    movementsTotal,
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

  const expectedClosing = await computeExpectedClosing(existing.id);
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
