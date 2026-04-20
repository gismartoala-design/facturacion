import { MovementType, Prisma, ReferenceType, StockTakingStatus } from "@prisma/client";

import { stockTakingDraftSchema } from "@/core/inventory/stock-taking.schemas";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";
import type {
  StockTakingDetail,
  StockTakingSummary,
} from "@/modules/inventory/stock-taking/types";

const stockTakingSummaryInclude = {
  createdBy: {
    select: {
      name: true,
    },
  },
  appliedBy: {
    select: {
      name: true,
    },
  },
  items: {
    select: {
      differenceQuantity: true,
    },
  },
} satisfies Prisma.StockTakingInclude;

const stockTakingDetailInclude = {
  ...stockTakingSummaryInclude,
  items: {
    select: {
      id: true,
      productId: true,
      systemQuantity: true,
      countedQuantity: true,
      differenceQuantity: true,
      product: {
        select: {
          nombre: true,
          sku: true,
          secuencial: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.StockTakingInclude;

type StockTakingSummaryRecord = Prisma.StockTakingGetPayload<{
  include: typeof stockTakingSummaryInclude;
}>;

type StockTakingDetailRecord = Prisma.StockTakingGetPayload<{
  include: typeof stockTakingDetailInclude;
}>;

function presentStockTakingSummary(record: StockTakingSummaryRecord): StockTakingSummary {
  return {
    id: record.id,
    takingNumber: record.takingNumber.toString(),
    status: record.status,
    notes: record.notes,
    createdByName: record.createdBy.name,
    appliedByName: record.appliedBy?.name ?? null,
    itemCount: record.items.length,
    rowsWithDifference: record.items.filter(
      (item) => Number(item.differenceQuantity) !== 0,
    ).length,
    createdAt: record.createdAt.toISOString(),
    appliedAt: record.appliedAt?.toISOString() ?? null,
  };
}

function presentStockTakingDetail(record: StockTakingDetailRecord): StockTakingDetail {
  return {
    ...presentStockTakingSummary(record),
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: resolveProductCode(item.product.sku, item.product.secuencial),
      productName: item.product.nombre,
      systemQuantity: Number(item.systemQuantity),
      countedQuantity: Number(item.countedQuantity),
      differenceQuantity: Number(item.differenceQuantity),
    })),
  };
}

async function resolveDraftItemsWithSnapshot(
  rawInput: unknown,
  tx: Prisma.TransactionClient | PrismaClientLike = prisma,
) {
  const input = stockTakingDraftSchema.parse(rawInput);
  const normalizedItems = new Map<string, number>();

  for (const item of input.items) {
    normalizedItems.set(item.productId, item.countedQuantity);
  }

  const productIds = Array.from(normalizedItems.keys());
  const stockLevels = await tx.stockLevel.findMany({
    where: {
      productId: { in: productIds },
      product: {
        activo: true,
        tipoProducto: "BIEN",
      },
    },
    select: {
      productId: true,
      quantity: true,
    },
  });

  if (stockLevels.length !== productIds.length) {
    throw new Error("Uno o mas productos de la toma no existen o no manejan inventario");
  }

  return {
    notes: input.notes?.trim() || null,
    items: stockLevels.map((stockLevel) => {
      const countedQuantity = normalizedItems.get(stockLevel.productId);

      if (countedQuantity === undefined) {
        throw new Error("Conteo invalido para uno o mas productos");
      }

      const systemQuantity = Number(stockLevel.quantity);

      return {
        productId: stockLevel.productId,
        systemQuantity,
        countedQuantity,
        differenceQuantity: countedQuantity - systemQuantity,
      };
    }),
  };
}

type PrismaClientLike = Pick<Prisma.TransactionClient, "stockLevel">;

export async function listStockTakingSummaries(session: SessionPayload) {
  const records = await prisma.stockTaking.findMany({
    where: {
      businessId: session.businessId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 12,
    include: stockTakingSummaryInclude,
  });

  return records.map(presentStockTakingSummary);
}

export async function getStockTakingDetail(session: SessionPayload, id: string) {
  const record = await prisma.stockTaking.findFirst({
    where: {
      id,
      businessId: session.businessId,
    },
    include: stockTakingDetailInclude,
  });

  if (!record) {
    throw new Error("Toma de inventario no encontrada");
  }

  return presentStockTakingDetail(record);
}

export async function createStockTakingDraft(session: SessionPayload, rawInput: unknown) {
  return prisma.$transaction(async (tx) => {
    const draft = await resolveDraftItemsWithSnapshot(rawInput, tx);

    const record = await tx.stockTaking.create({
      data: {
        businessId: session.businessId,
        createdById: session.sub,
        notes: draft.notes,
        items: {
          create: draft.items.map((item) => ({
            productId: item.productId,
            systemQuantity: new Prisma.Decimal(item.systemQuantity),
            countedQuantity: new Prisma.Decimal(item.countedQuantity),
            differenceQuantity: new Prisma.Decimal(item.differenceQuantity),
          })),
        },
      },
      include: stockTakingDetailInclude,
    });

    return presentStockTakingDetail(record);
  });
}

export async function updateStockTakingDraft(
  session: SessionPayload,
  id: string,
  rawInput: unknown,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockTaking.findFirst({
      where: {
        id,
        businessId: session.businessId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      throw new Error("Toma de inventario no encontrada");
    }

    if (existing.status !== StockTakingStatus.DRAFT) {
      throw new Error("Solo puedes editar tomas en borrador");
    }

    const draft = await resolveDraftItemsWithSnapshot(rawInput, tx);

    const record = await tx.stockTaking.update({
      where: { id },
      data: {
        notes: draft.notes,
        items: {
          deleteMany: {},
          create: draft.items.map((item) => ({
            productId: item.productId,
            systemQuantity: new Prisma.Decimal(item.systemQuantity),
            countedQuantity: new Prisma.Decimal(item.countedQuantity),
            differenceQuantity: new Prisma.Decimal(item.differenceQuantity),
          })),
        },
      },
      include: stockTakingDetailInclude,
    });

    return presentStockTakingDetail(record);
  });
}

export async function applyStockTaking(session: SessionPayload, id: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.stockTaking.findFirst({
      where: {
        id,
        businessId: session.businessId,
      },
      include: stockTakingDetailInclude,
    });

    if (!record) {
      throw new Error("Toma de inventario no encontrada");
    }

    if (record.status !== StockTakingStatus.DRAFT) {
      throw new Error("La toma ya fue aplicada");
    }

    const currentStockLevels = await tx.stockLevel.findMany({
      where: {
        productId: {
          in: record.items.map((item) => item.productId),
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    const currentByProductId = new Map(
      currentStockLevels.map((item) => [item.productId, Number(item.quantity)]),
    );

    const changedProducts = record.items.filter((item) => {
      const currentQuantity = currentByProductId.get(item.productId);
      return currentQuantity === undefined || currentQuantity !== Number(item.systemQuantity);
    });

    if (changedProducts.length > 0) {
      const changedNames = changedProducts
        .slice(0, 3)
        .map((item) => item.product.nombre)
        .join(", ");
      throw new Error(
        `El stock cambió desde el borrador. Actualiza la toma antes de aplicar${changedNames ? `: ${changedNames}` : ""}`,
      );
    }

    const movementRows = record.items.filter(
      (item) => Number(item.differenceQuantity) !== 0,
    );

    for (const item of record.items) {
      await tx.stockLevel.update({
        where: {
          productId: item.productId,
        },
        data: {
          quantity: item.countedQuantity,
        },
      });
    }

    if (movementRows.length > 0) {
      await tx.stockMovement.createMany({
        data: movementRows.map((item) => ({
          productId: item.productId,
          movementType: MovementType.ADJUSTMENT,
          referenceType: ReferenceType.MANUAL,
          referenceId: record.id,
          quantity: item.countedQuantity,
          createdById: session.sub,
          notes:
            `Toma #${record.takingNumber.toString()} | sistema ${Number(item.systemQuantity).toFixed(3)} | fisico ${Number(item.countedQuantity).toFixed(3)} | diferencia ${Number(item.differenceQuantity).toFixed(3)}`,
        })),
      });
    }

    const applied = await tx.stockTaking.update({
      where: {
        id: record.id,
      },
      data: {
        status: StockTakingStatus.APPLIED,
        appliedAt: new Date(),
        appliedById: session.sub,
      },
      include: stockTakingDetailInclude,
    });

    return presentStockTakingDetail(applied);
  });
}
