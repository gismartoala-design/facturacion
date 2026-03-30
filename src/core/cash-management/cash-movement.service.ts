import { CashSessionStatus, type CashMovementType } from "@prisma/client";

import {
  postCashMovementEntryInTransaction,
  postRefundEntryInTransaction,
} from "@/core/accounting/accounting-entry.service";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type { SessionPayload } from "@/lib/auth";
import type { CashRuntime } from "@/modules/cash-management/policies/cash-runtime";
import { registerMovementSchema, type RegisterMovementInput } from "./schemas";

const logger = createLogger("CashMovementService");

export type CashMovementSummary = {
  id: string;
  type: CashMovementType;
  amount: number;
  description: string | null;
  saleId: string | null;
  createdById: string;
  createdAt: Date;
};

function toSummary(raw: {
  id: string;
  type: CashMovementType;
  amount: import("@prisma/client").Prisma.Decimal;
  description: string | null;
  saleId: string | null;
  createdById: string;
  createdAt: Date;
}): CashMovementSummary {
  return {
    id: raw.id,
    type: raw.type,
    amount: Number(raw.amount),
    description: raw.description,
    saleId: raw.saleId,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
  };
}

export async function getSessionMovements(
  sessionId: string,
  businessId: string,
  userId: string,
): Promise<CashMovementSummary[]> {
  // Verificar que la sesión pertenece al negocio y al usuario antes de exponer movimientos.
  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    select: { businessId: true, openedById: true },
  });

  if (!cashSession) {
    throw new Error("Sesion de caja no encontrada");
  }
  if (cashSession.businessId !== businessId) {
    throw new Error("La sesion no pertenece a este negocio");
  }
  if (cashSession.openedById !== userId) {
    throw new Error("No tienes permiso para ver esta sesion");
  }

  const movements = await prisma.cashMovement.findMany({
    where: {
      sessionId,
      businessId,
      type: {
        not: "SALE_CASH_IN",
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return movements.map(toSummary);
}

export async function registerMovement(
  session: SessionPayload,
  businessId: string,
  sessionId: string,
  rawInput: unknown,
  cashRuntime: CashRuntime,
): Promise<CashMovementSummary> {
  const input: RegisterMovementInput = registerMovementSchema.parse(rawInput);

  if (input.type === "WITHDRAWAL" && !cashRuntime.capabilities.withdrawals) {
    throw new Error("Retiros de caja no habilitados en este plan");
  }
  if (input.type === "MANUAL_IN" && !cashRuntime.capabilities.deposits) {
    throw new Error("Aportes de caja no habilitados en este plan");
  }

  // Verificar existencia, pertenencia al negocio, dueño y estado en un solo lookup.
  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    select: { id: true, businessId: true, openedById: true, status: true },
  });

  if (!cashSession) {
    throw new Error("Sesion de caja no encontrada");
  }
  if (cashSession.businessId !== businessId) {
    throw new Error("La sesion no pertenece a este negocio");
  }
  if (cashSession.openedById !== session.sub) {
    throw new Error("No tienes permiso para registrar movimientos en esta sesion");
  }
  if (cashSession.status !== CashSessionStatus.OPEN) {
    throw new Error("La sesion de caja ya fue cerrada");
  }

  const movement = await prisma.$transaction(async (tx) => {
    const created = await tx.cashMovement.create({
      data: {
        businessId,
        sessionId,
        type: input.type,
        amount: input.amount,
        description: input.description || null,
        createdById: session.sub,
      },
    });

    if (input.type === "REFUND_OUT") {
      await postRefundEntryInTransaction(tx, {
        businessId,
        movementId: created.id,
        amount: input.amount,
      });
    } else {
      await postCashMovementEntryInTransaction(tx, {
        businessId,
        movementId: created.id,
        type: input.type,
        amount: input.amount,
      });
    }

    return created;
  });

  logger.info("cash-movement:registered", {
    movementId: movement.id,
    sessionId,
    type: input.type,
    amount: input.amount,
    userId: session.sub,
  });

  return toSummary(movement);
}
