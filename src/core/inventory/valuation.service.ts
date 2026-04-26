import { MovementType, Prisma, ReferenceType } from "@prisma/client";

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundCost(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

type StockValuationState = {
  quantity: number;
  averageCost: number;
  lastCost: number;
  inventoryValue: number;
};

type ValuedMovementInput = {
  productId: string;
  movementType: MovementType;
  quantity: number;
  referenceType: ReferenceType;
  referenceId?: string | null;
  createdById?: string | null;
  notes?: string | null;
  state: StockValuationState;
  unitCost?: number | null;
};

export type ValuedMovementResult = {
  movement: {
    productId: string;
    movementType: MovementType;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    balanceQuantity: Prisma.Decimal;
    balanceAverageCost: Prisma.Decimal;
    balanceValue: Prisma.Decimal;
    referenceType: ReferenceType;
    referenceId?: string | null;
    createdById?: string | null;
    notes?: string | null;
  };
  nextState: StockValuationState;
  signedQuantity: number;
  signedTotalCost: number;
  appliedUnitCost: number;
};

function normalizeState(state: StockValuationState): StockValuationState {
  const quantity = roundQuantity(Math.max(state.quantity, 0));
  const inventoryValue = roundMoney(Math.max(state.inventoryValue, 0));
  const averageCost =
    quantity <= 0.000001 ? 0 : roundCost(Math.max(state.averageCost, 0));
  const lastCost = roundCost(Math.max(state.lastCost, 0));

  return {
    quantity,
    averageCost,
    lastCost,
    inventoryValue,
  };
}

function resolveInboundCost(state: StockValuationState, unitCost?: number | null) {
  const normalizedInput = unitCost !== undefined && unitCost !== null
    ? roundCost(unitCost)
    : null;

  if (normalizedInput !== null && normalizedInput > 0) {
    return normalizedInput;
  }

  if (state.averageCost > 0) {
    return roundCost(state.averageCost);
  }

  if (state.lastCost > 0) {
    return roundCost(state.lastCost);
  }

  return 0;
}

export function buildValuedMovement(
  input: ValuedMovementInput,
): ValuedMovementResult {
  const state = normalizeState(input.state);
  const rawQuantity = roundQuantity(input.quantity);

  if (rawQuantity <= 0 && input.movementType !== MovementType.ADJUSTMENT) {
    throw new Error("La cantidad del movimiento debe ser mayor a cero");
  }

  let signedQuantity = rawQuantity;
  let signedTotalCost = 0;
  let appliedUnitCost = 0;
  let nextQuantity = state.quantity;
  let nextValue = state.inventoryValue;
  let nextAverageCost = state.averageCost;
  let nextLastCost = state.lastCost;

  if (input.movementType === MovementType.IN) {
    appliedUnitCost = resolveInboundCost(state, input.unitCost);
    signedTotalCost = roundMoney(rawQuantity * appliedUnitCost);
    nextQuantity = roundQuantity(state.quantity + rawQuantity);
    nextValue = roundMoney(state.inventoryValue + signedTotalCost);
    nextAverageCost =
      nextQuantity <= 0.000001 ? 0 : roundCost(nextValue / nextQuantity);
    nextLastCost = appliedUnitCost;
  } else if (input.movementType === MovementType.OUT) {
    if (state.quantity + 0.000001 < rawQuantity) {
      throw new Error("Stock insuficiente para salida");
    }

    appliedUnitCost = roundCost(
      input.unitCost && input.unitCost > 0
        ? input.unitCost
        : state.averageCost > 0
          ? state.averageCost
          : state.lastCost,
    );
    signedQuantity = -rawQuantity;
    signedTotalCost =
      rawQuantity + 0.000001 >= state.quantity
        ? -roundMoney(state.inventoryValue)
        : -roundMoney(rawQuantity * appliedUnitCost);
    nextQuantity = roundQuantity(state.quantity - rawQuantity);
    nextValue = roundMoney(state.inventoryValue + signedTotalCost);
    nextAverageCost =
      nextQuantity <= 0.000001 ? 0 : roundCost(nextValue / nextQuantity);
  } else {
    signedQuantity = rawQuantity;

    if (signedQuantity > 0) {
      appliedUnitCost = resolveInboundCost(state, input.unitCost);
      signedTotalCost = roundMoney(signedQuantity * appliedUnitCost);
      nextLastCost = appliedUnitCost;
    } else if (signedQuantity < 0) {
      if (state.quantity + 0.000001 < Math.abs(signedQuantity)) {
        throw new Error("Stock insuficiente para ajuste");
      }

      appliedUnitCost = roundCost(
        input.unitCost && input.unitCost > 0
          ? input.unitCost
          : state.averageCost > 0
            ? state.averageCost
            : state.lastCost,
      );
      signedTotalCost =
        Math.abs(signedQuantity) + 0.000001 >= state.quantity
          ? -roundMoney(state.inventoryValue)
          : -roundMoney(Math.abs(signedQuantity) * appliedUnitCost);
    }

    nextQuantity = roundQuantity(state.quantity + signedQuantity);
    nextValue = roundMoney(state.inventoryValue + signedTotalCost);
    nextAverageCost =
      nextQuantity <= 0.000001 ? 0 : roundCost(nextValue / nextQuantity);
  }

  if (nextQuantity <= 0.000001) {
    nextQuantity = 0;
    nextValue = 0;
    nextAverageCost = 0;
  }

  const nextState = normalizeState({
    quantity: nextQuantity,
    averageCost: nextAverageCost,
    lastCost: nextLastCost,
    inventoryValue: nextValue,
  });

  return {
    movement: {
      productId: input.productId,
      movementType: input.movementType,
      quantity: new Prisma.Decimal(rawQuantity),
      unitCost: new Prisma.Decimal(appliedUnitCost),
      totalCost: new Prisma.Decimal(signedTotalCost),
      balanceQuantity: new Prisma.Decimal(nextState.quantity),
      balanceAverageCost: new Prisma.Decimal(nextState.averageCost),
      balanceValue: new Prisma.Decimal(nextState.inventoryValue),
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      createdById: input.createdById ?? null,
      notes: input.notes ?? null,
    },
    nextState,
    signedQuantity,
    signedTotalCost,
    appliedUnitCost,
  };
}

export function toStockLevelValuationUpdate(state: StockValuationState) {
  const normalized = normalizeState(state);

  return {
    quantity: new Prisma.Decimal(normalized.quantity),
    averageCost: new Prisma.Decimal(normalized.averageCost),
    lastCost: new Prisma.Decimal(normalized.lastCost),
    inventoryValue: new Prisma.Decimal(normalized.inventoryValue),
  };
}

export function resolveStockValuationState(input: {
  quantity: Prisma.Decimal | number;
  averageCost: Prisma.Decimal | number;
  lastCost: Prisma.Decimal | number;
  inventoryValue: Prisma.Decimal | number;
}): StockValuationState {
  return normalizeState({
    quantity: Number(input.quantity),
    averageCost: Number(input.averageCost),
    lastCost: Number(input.lastCost),
    inventoryValue: Number(input.inventoryValue),
  });
}

export function roundInventoryMoney(value: number) {
  return roundMoney(value);
}

export function roundInventoryCost(value: number) {
  return roundCost(value);
}
