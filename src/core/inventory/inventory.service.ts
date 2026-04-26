import { MovementType, Prisma, ReferenceType } from "@prisma/client";

import { postInventoryAdjustmentEntryInTransaction } from "@/core/accounting/accounting-entry.service";
import { createProductSchema, stockAdjustmentSchema, updateProductSchema } from "@/core/inventory/schemas";
import {
  buildValuedMovement,
  resolveStockValuationState,
  toStockLevelValuationUpdate,
} from "@/core/inventory/valuation.service";
import { prisma } from "@/lib/prisma";
import { normalizeProductSku, resolveProductCode } from "@/lib/utils";

const productSelect = {
  id: true,
  secuencial: true,
  sku: true,
  codigoBarras: true,
  tipoProducto: true,
  nombre: true,
  descripcion: true,
  precio: true,
  tarifaIva: true,
  activo: true,
  restaurantVisible: true,
  restaurantCategory: true,
  restaurantStationCode: true,
  allowsModifiers: true,
  prepTimeMinutes: true,
  createdAt: true,
  stockLevel: {
    select: {
      quantity: true,
      minQuantity: true,
      averageCost: true,
      lastCost: true,
      inventoryValue: true,
    },
  },
} satisfies Prisma.ProductSelect;

function productPresenter(product: Prisma.ProductGetPayload<{ select: typeof productSelect }>) {
  return {
    id: product.id,
    secuencial: product.secuencial.toString(),
    codigo: resolveProductCode(product.sku, product.secuencial),
    sku: normalizeProductSku(product.sku),
    codigoBarras: product.codigoBarras,
    tipoProducto: product.tipoProducto,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: Number(product.precio),
    tarifaIva: Number(product.tarifaIva),
    activo: product.activo,
    restaurantVisible: product.restaurantVisible,
    restaurantCategory: product.restaurantCategory,
    restaurantStationCode: product.restaurantStationCode,
    allowsModifiers: product.allowsModifiers,
    prepTimeMinutes: product.prepTimeMinutes,
    stock: Number(product.stockLevel?.quantity ?? 0),
    minStock: Number(product.stockLevel?.minQuantity ?? 0),
    averageCost: Number(product.stockLevel?.averageCost ?? 0),
    lastCost: Number(product.stockLevel?.lastCost ?? 0),
    inventoryValue: Number(product.stockLevel?.inventoryValue ?? 0),
    createdAt: product.createdAt,
  };
}

async function ensureActiveSkuAvailable(sku: string | null, excludeProductId?: string) {
  if (!sku) return;

  const existing = await prisma.product.findFirst({
    where: {
      sku: { equals: sku, mode: "insensitive" },
      activo: true,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(`Ya existe un producto activo con el codigo ${sku}`);
  }
}

async function ensureActiveBarcodeAvailable(
  codigoBarras: string | null,
  excludeProductId?: string,
) {
  if (!codigoBarras) return;

  const existing = await prisma.product.findFirst({
    where: {
      codigoBarras: { equals: codigoBarras, mode: "insensitive" },
      activo: true,
      ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      `Ya existe un producto activo con el codigo de barras ${codigoBarras}`,
    );
  }
}

export async function listProducts() {
  const products = await prisma.product.findMany({
    select: productSelect,
    where: { activo: true },
    orderBy: { secuencial: "asc" },
  });

  return products.map(productPresenter);
}

export async function createProduct(
  rawInput: unknown,
  context?: { businessId?: string | null; createdById?: string | null },
) {
  const input = createProductSchema.parse(rawInput);
  const normalizedSku = normalizeProductSku(input.sku);
  const normalizedBarcode = input.codigoBarras?.trim() || null;

  await ensureActiveSkuAvailable(normalizedSku);
  await ensureActiveBarcodeAvailable(normalizedBarcode);

  return prisma.$transaction(async (tx) => {
    const initialState = resolveStockValuationState({
      quantity: 0,
      averageCost: 0,
      lastCost: 0,
      inventoryValue: 0,
    });
    const initialMovement =
      input.tipoProducto === "BIEN" && input.stockInicial > 0
        ? buildValuedMovement({
            productId: "",
            movementType: MovementType.IN,
            quantity: input.stockInicial,
            unitCost: input.initialUnitCost,
            referenceType: ReferenceType.MANUAL,
            createdById: context?.createdById ?? null,
            notes: "Stock inicial",
            state: initialState,
          })
        : null;

    const product = await tx.product.create({
      data: {
        sku: normalizedSku,
        codigoBarras: normalizedBarcode,
        tipoProducto: input.tipoProducto,
        nombre: input.nombre,
        descripcion: input.descripcion || null,
        precio: input.precio,
        tarifaIva: input.tarifaIva,
        restaurantVisible: input.restaurantVisible,
        restaurantCategory: input.restaurantCategory || null,
        restaurantStationCode: input.restaurantStationCode || null,
        allowsModifiers: input.allowsModifiers,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        stockLevel: {
          create: {
            quantity:
              input.tipoProducto === "BIEN"
                ? new Prisma.Decimal(initialMovement?.nextState.quantity ?? 0)
                : new Prisma.Decimal(0),
            minQuantity: input.tipoProducto === "BIEN" ? input.minStock : 0,
            averageCost:
              input.tipoProducto === "BIEN"
                ? new Prisma.Decimal(initialMovement?.nextState.averageCost ?? 0)
                : new Prisma.Decimal(0),
            lastCost:
              input.tipoProducto === "BIEN"
                ? new Prisma.Decimal(initialMovement?.nextState.lastCost ?? 0)
                : new Prisma.Decimal(0),
            inventoryValue:
              input.tipoProducto === "BIEN"
                ? new Prisma.Decimal(initialMovement?.nextState.inventoryValue ?? 0)
                : new Prisma.Decimal(0),
          },
        },
      },
      select: productSelect,
    });

    if (initialMovement) {
      const movement = {
        ...initialMovement.movement,
        productId: product.id,
      };

      await tx.stockMovement.create({ data: movement });

      if (context?.businessId) {
        await postInventoryAdjustmentEntryInTransaction(tx, {
          businessId: context.businessId,
          sourceId: product.id,
          totalCost: initialMovement.signedTotalCost,
        });
      }
    }

    return productPresenter(product);
  });
}

export async function updateProduct(id: string, rawInput: unknown) {
  const input = updateProductSchema.parse(rawInput);
  const normalizedSku = input.sku !== undefined ? normalizeProductSku(input.sku) : undefined;
  const normalizedBarcode =
    input.codigoBarras !== undefined ? input.codigoBarras.trim() || null : undefined;

  if (normalizedSku !== undefined) {
    await ensureActiveSkuAvailable(normalizedSku, id);
  }

  if (normalizedBarcode !== undefined) {
    await ensureActiveBarcodeAvailable(normalizedBarcode, id);
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      tipoProducto: true,
      stockLevel: {
        select: {
          quantity: true,
          averageCost: true,
          lastCost: true,
          inventoryValue: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error("Producto no encontrado");
  }

  const nextTipoProducto = input.tipoProducto ?? existing.tipoProducto;
  const currentStock = Number(existing.stockLevel?.quantity ?? 0);

  if (existing.tipoProducto === "BIEN" && nextTipoProducto === "SERVICIO" && currentStock > 0) {
    throw new Error("No se puede cambiar a servicio mientras el producto tenga stock disponible");
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.sku !== undefined ? { sku: normalizedSku } : {}),
      ...(input.codigoBarras !== undefined
        ? { codigoBarras: normalizedBarcode }
        : {}),
      ...(input.tipoProducto !== undefined ? { tipoProducto: input.tipoProducto } : {}),
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion || null } : {}),
      ...(input.precio !== undefined ? { precio: input.precio } : {}),
      ...(input.tarifaIva !== undefined ? { tarifaIva: input.tarifaIva } : {}),
      ...(input.restaurantVisible !== undefined
        ? { restaurantVisible: input.restaurantVisible }
        : {}),
      ...(input.restaurantCategory !== undefined
        ? { restaurantCategory: input.restaurantCategory || null }
        : {}),
      ...(input.restaurantStationCode !== undefined
        ? { restaurantStationCode: input.restaurantStationCode || null }
        : {}),
      ...(input.allowsModifiers !== undefined
        ? { allowsModifiers: input.allowsModifiers }
        : {}),
      ...(input.prepTimeMinutes !== undefined
        ? { prepTimeMinutes: input.prepTimeMinutes ?? null }
        : {}),
      ...((input.minStock !== undefined || nextTipoProducto === "SERVICIO")
        ? { stockLevel: { update: { minQuantity: nextTipoProducto === "SERVICIO" ? 0 : (input.minStock ?? 0) } } }
        : {}),
    },
    select: productSelect,
  });

  return productPresenter(product);
}

export async function deactivateProduct(id: string) {
  const product = await prisma.product.update({
    where: { id },
    data: { activo: false },
    select: productSelect,
  });

  return productPresenter(product);
}

export async function listStock() {
  const stock = await prisma.stockLevel.findMany({
    select: {
      productId: true,
      quantity: true,
      minQuantity: true,
      averageCost: true,
      lastCost: true,
      inventoryValue: true,
      updatedAt: true,
      product: {
        select: {
          nombre: true,
          sku: true,
          secuencial: true,
          tipoProducto: true,
        },
      },
    },
    where: {
      product: {
        activo: true,
        tipoProducto: "BIEN",
      },
    },
    orderBy: {
      product: {
        secuencial: "asc",
      },
    },
  });

  return stock.map((item) => ({
    productId: item.productId,
    productName: item.product.nombre,
    sku: normalizeProductSku(item.product.sku),
    secuencial: item.product.secuencial.toString(),
    codigo: resolveProductCode(item.product.sku, item.product.secuencial),
    quantity: Number(item.quantity),
    minQuantity: Number(item.minQuantity),
    averageCost: Number(item.averageCost),
    lastCost: Number(item.lastCost),
    inventoryValue: Number(item.inventoryValue),
    lowStock: item.quantity.lte(item.minQuantity),
    updatedAt: item.updatedAt,
  }));
}

export async function adjustStock(
  rawInput: unknown,
  context?: { businessId?: string | null; createdById?: string | null },
) {
  const input = stockAdjustmentSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const stockLevel = await tx.stockLevel.findUnique({
      where: { productId: input.productId },
      include: {
        product: true,
      },
    });

    if (!stockLevel) {
      throw new Error("No existe stock para este producto");
    }

    if (stockLevel.product.tipoProducto === "SERVICIO") {
      throw new Error("Los servicios no manejan inventario");
    }

    const currentQty = Number(stockLevel.quantity);
    const currentState = resolveStockValuationState({
      quantity: stockLevel.quantity,
      averageCost: stockLevel.averageCost,
      lastCost: stockLevel.lastCost,
      inventoryValue: stockLevel.inventoryValue,
    });

    const movementType = input.movementType as MovementType;
    let movementQuantity = input.quantity;

    if (movementType === MovementType.ADJUSTMENT) {
      movementQuantity = Number(input.quantity) - currentQty;
    }

    if (movementType === MovementType.OUT && currentQty < input.quantity) {
      throw new Error("Stock insuficiente para salida manual");
    }

    if (movementType === MovementType.ADJUSTMENT && currentQty + movementQuantity < -0.000001) {
      throw new Error("El ajuste no puede dejar stock negativo");
    }

    if (
      movementQuantity > 0 &&
      currentState.averageCost <= 0 &&
      currentState.lastCost <= 0 &&
      (!input.unitCost || input.unitCost <= 0)
    ) {
      throw new Error(
        "Debes indicar un costo unitario cuando el producto no tiene costo promedio previo",
      );
    }

    const valuedMovement = buildValuedMovement({
      productId: input.productId,
      movementType,
      quantity: movementQuantity,
      unitCost: input.unitCost,
      referenceType: ReferenceType.MANUAL,
      createdById: context?.createdById ?? null,
      notes:
        input.notes ||
        (input.movementType === MovementType.ADJUSTMENT
          ? `Ajuste manual | stock anterior ${currentQty.toFixed(3)} | stock nuevo ${(currentQty + movementQuantity).toFixed(3)}`
          : "Ajuste manual"),
      state: currentState,
    });

    const updated = await tx.stockLevel.update({
      where: { productId: input.productId },
      data: toStockLevelValuationUpdate(valuedMovement.nextState),
      select: {
        productId: true,
        quantity: true,
        minQuantity: true,
        averageCost: true,
        lastCost: true,
        inventoryValue: true,
        product: {
          select: {
            nombre: true,
            sku: true,
            secuencial: true,
          },
        },
      },
    });

    let movementId: string | null = null;

    if (Math.abs(valuedMovement.signedQuantity) > 0.000_001) {
      const movement = await tx.stockMovement.create({
        data: valuedMovement.movement,
        select: { id: true },
      });
      movementId = movement.id;
    }

    if (movementId && context?.businessId) {
      await postInventoryAdjustmentEntryInTransaction(tx, {
        businessId: context.businessId,
        sourceId: movementId,
        totalCost: valuedMovement.signedTotalCost,
      });
    }

    return {
      productId: updated.productId,
      productName: updated.product.nombre,
      codigo: resolveProductCode(updated.product.sku, updated.product.secuencial),
      quantity: Number(updated.quantity),
      minQuantity: Number(updated.minQuantity),
      averageCost: Number(updated.averageCost),
      lastCost: Number(updated.lastCost),
      inventoryValue: Number(updated.inventoryValue),
    };
  });
}
