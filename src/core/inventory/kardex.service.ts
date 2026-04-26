import { MovementType, Prisma, ReferenceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";
import type { KardexEntry } from "@/modules/inventory/kardex/types";

const kardexMovementSelect = {
  id: true,
  productId: true,
  movementType: true,
  quantity: true,
  unitCost: true,
  totalCost: true,
  balanceQuantity: true,
  balanceAverageCost: true,
  balanceValue: true,
  referenceType: true,
  referenceId: true,
  notes: true,
  createdAt: true,
  createdBy: {
    select: {
      name: true,
    },
  },
  product: {
    select: {
      nombre: true,
      sku: true,
      secuencial: true,
    },
  },
} satisfies Prisma.StockMovementSelect;

type KardexMovementRecord = Prisma.StockMovementGetPayload<{
  select: typeof kardexMovementSelect;
}>;

function resolveSignedQuantity(record: KardexMovementRecord) {
  const quantity = Number(record.quantity);

  if (record.movementType === MovementType.OUT) {
    return -quantity;
  }

  return quantity;
}

function movementLabel(movementType: MovementType) {
  switch (movementType) {
    case MovementType.IN:
      return "Ingreso";
    case MovementType.OUT:
      return "Salida";
    case MovementType.ADJUSTMENT:
    default:
      return "Ajuste";
  }
}

function referenceLabel(referenceType: ReferenceType) {
  switch (referenceType) {
    case ReferenceType.SALE:
      return "Venta";
    case ReferenceType.PURCHASE:
      return "Compra";
    case ReferenceType.MANUAL:
    default:
      return "Manual";
  }
}

export async function listKardexEntries() {
  const [movements, stockLevels] = await Promise.all([
    prisma.stockMovement.findMany({
      select: kardexMovementSelect,
      where: {
        product: {
          tipoProducto: "BIEN",
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.stockLevel.findMany({
      where: {
        product: {
          tipoProducto: "BIEN",
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    }),
  ]);

  const runningBalanceByProductId = new Map(
    stockLevels.map((item) => [item.productId, Number(item.quantity)]),
  );

  return movements.map<KardexEntry>((record) => {
    const signedQuantity = resolveSignedQuantity(record);
    const computedBalanceAfter = runningBalanceByProductId.get(record.productId) ?? 0;
    const balanceBefore = computedBalanceAfter - signedQuantity;

    runningBalanceByProductId.set(record.productId, balanceBefore);

    return {
      id: record.id,
      productId: record.productId,
      productCode: resolveProductCode(record.product.sku, record.product.secuencial),
      productName: record.product.nombre,
      movementType: record.movementType,
      movementLabel: movementLabel(record.movementType),
      referenceType: record.referenceType,
      referenceLabel: referenceLabel(record.referenceType),
      referenceId: record.referenceId,
      quantity: Number(record.quantity),
      signedQuantity,
      unitCost: Number(record.unitCost),
      signedTotalCost: Number(record.totalCost),
      balanceBefore,
      balanceAfter: computedBalanceAfter,
      balanceValue: Number(record.balanceValue),
      balanceAverageCost: Number(record.balanceAverageCost),
      createdAt: record.createdAt.toISOString(),
      createdByName: record.createdBy?.name ?? null,
      notes: record.notes,
    };
  });
}
