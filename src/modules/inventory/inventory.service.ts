import { MovementType, Prisma, ReferenceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatProductCode } from "@/lib/utils";
import { createProductSchema, stockAdjustmentSchema, updateProductSchema } from "@/modules/inventory/schemas";

const productSelect = {
  id: true,
  secuencial: true,
  sku: true,
  nombre: true,
  descripcion: true,
  precio: true,
  tarifaIva: true,
  activo: true,
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
    codigo: formatProductCode(product.secuencial),
    sku: product.sku,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: Number(product.precio),
    tarifaIva: Number(product.tarifaIva),
    activo: product.activo,
    stock: Number(product.stockLevel?.quantity ?? 0),
    minStock: Number(product.stockLevel?.minQuantity ?? 0),
    createdAt: product.createdAt,
  };
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

  const product = await prisma.product.create({
    data: {
      sku: input.sku || null,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      precio: input.precio,
      tarifaIva: input.tarifaIva,
      stockLevel: {
        create: {
          quantity: input.stockInicial,
          minQuantity: input.minStock,
        },
      },
    },
    select: productSelect,
  });

  if (input.stockInicial > 0) {
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

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.sku !== undefined ? { sku: input.sku || null } : {}),
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion || null } : {}),
      ...(input.precio !== undefined ? { precio: input.precio } : {}),
      ...(input.tarifaIva !== undefined ? { tarifaIva: input.tarifaIva } : {}),
      ...(input.minStock !== undefined
        ? { stockLevel: { update: { minQuantity: input.minStock } } }
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
        },
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
    sku: item.product.sku,
    secuencial: item.product.secuencial.toString(),
    codigo: formatProductCode(item.product.secuencial),
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
            secuencial: true,
          },
        },
      },
    });

    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: input.movementType,
        referenceType: ReferenceType.MANUAL,
        quantity: new Prisma.Decimal(input.quantity),
        notes: input.notes || "Ajuste manual",
      },
    });

    return {
      productId: updated.productId,
      productName: updated.product.nombre,
      codigo: formatProductCode(updated.product.secuencial),
      quantity: Number(updated.quantity),
      minQuantity: Number(updated.minQuantity),
    };
  });
}
