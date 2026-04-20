import { MovementType, Prisma, ReferenceType } from "@prisma/client";

import { createProductSchema, stockAdjustmentSchema, updateProductSchema } from "@/core/inventory/schemas";
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

export async function createProduct(rawInput: unknown) {
  const input = createProductSchema.parse(rawInput);
  const normalizedSku = normalizeProductSku(input.sku);
  const normalizedBarcode = input.codigoBarras?.trim() || null;

  await ensureActiveSkuAvailable(normalizedSku);
  await ensureActiveBarcodeAvailable(normalizedBarcode);

  const product = await prisma.product.create({
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
          quantity: input.tipoProducto === "BIEN" ? input.stockInicial : 0,
          minQuantity: input.tipoProducto === "BIEN" ? input.minStock : 0,
        },
      },
    },
    select: productSelect,
  });

  if (input.tipoProducto === "BIEN" && input.stockInicial > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        movementType: MovementType.IN,
        referenceType: ReferenceType.MANUAL,
        quantity: new Prisma.Decimal(input.stockInicial),
        notes: "Stock inicial",
      },
    });
  }

  return productPresenter(product);
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
    lowStock: item.quantity.lte(item.minQuantity),
    updatedAt: item.updatedAt,
  }));
}

export async function adjustStock(rawInput: unknown) {
  const input = stockAdjustmentSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const stockLevel = await tx.stockLevel.findUnique({
      where: { productId: input.productId },
      include: { product: true },
    });

    if (!stockLevel) {
      throw new Error("No existe stock para este producto");
    }

    if (stockLevel.product.tipoProducto === "SERVICIO") {
      throw new Error("Los servicios no manejan inventario");
    }

    const currentQty = Number(stockLevel.quantity);
    let nextQty = currentQty;

    if (input.movementType === MovementType.IN) {
      nextQty += input.quantity;
    }

    if (input.movementType === MovementType.OUT) {
      if (currentQty < input.quantity) {
        throw new Error("Stock insuficiente para salida manual");
      }
      nextQty -= input.quantity;
    }

    if (input.movementType === MovementType.ADJUSTMENT) {
      nextQty = input.quantity;
    }

    const movementQuantity =
      input.movementType === MovementType.ADJUSTMENT
        ? nextQty - currentQty
        : input.quantity;

    const updated = await tx.stockLevel.update({
      where: { productId: input.productId },
      data: {
        quantity: new Prisma.Decimal(nextQty),
      },
      select: {
        productId: true,
        quantity: true,
        minQuantity: true,
        product: {
          select: {
            nombre: true,
            sku: true,
            secuencial: true,
          },
        },
      },
    });

    if (Math.abs(movementQuantity) > 0.000_001) {
      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          movementType: input.movementType,
          referenceType: ReferenceType.MANUAL,
          quantity: new Prisma.Decimal(movementQuantity),
          notes:
            input.notes ||
            (input.movementType === MovementType.ADJUSTMENT
              ? `Ajuste manual | stock anterior ${currentQty.toFixed(3)} | stock nuevo ${nextQty.toFixed(3)}`
              : "Ajuste manual"),
        },
      });
    }

    return {
      productId: updated.productId,
      productName: updated.product.nombre,
      codigo: resolveProductCode(updated.product.sku, updated.product.secuencial),
      quantity: Number(updated.quantity),
      minQuantity: Number(updated.minQuantity),
    };
  });
}
