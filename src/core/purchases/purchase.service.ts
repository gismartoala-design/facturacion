import {
  AccountingSourceType,
  MovementType,
  Prisma,
  PurchaseStatus,
  ReferenceType,
} from "@prisma/client";

import {
  postPurchaseEntryInTransaction,
  reversePostedEntryBySourceInTransaction,
} from "@/core/accounting/accounting-entry.service";
import {
  cancelPayableForPurchaseInTransaction,
  createPayableForPurchaseInTransaction,
} from "@/core/purchases/accounts-payable.service";
import {
  createPurchaseSchema,
  voidPurchaseSchema,
} from "@/core/purchases/purchase.schemas";
import { prisma } from "@/lib/prisma";
import { resolveProductCode } from "@/lib/utils";

const purchaseSelect = {
  id: true,
  purchaseNumber: true,
  businessId: true,
  supplierId: true,
  documentType: true,
  documentNumber: true,
  authorizationNumber: true,
  issuedAt: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  total: true,
  status: true,
  notes: true,
  voidedAt: true,
  voidedById: true,
  voidReason: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      id: true,
      razonSocial: true,
      nombreComercial: true,
      identificacion: true,
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      unitCost: true,
      discount: true,
      taxRate: true,
      subtotal: true,
      taxTotal: true,
      total: true,
      product: {
        select: {
          nombre: true,
          sku: true,
          secuencial: true,
          tipoProducto: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PurchaseSelect;

type PurchasePayload = Prisma.PurchaseGetPayload<{ select: typeof purchaseSelect }>;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function nullableText(value: string | undefined) {
  return value?.trim() || null;
}

function purchasePresenter(purchase: PurchasePayload) {
  return {
    id: purchase.id,
    purchaseNumber: purchase.purchaseNumber.toString(),
    businessId: purchase.businessId,
    supplierId: purchase.supplierId,
    supplierName:
      purchase.supplier.nombreComercial || purchase.supplier.razonSocial,
    supplierIdentification: purchase.supplier.identificacion,
    documentType: purchase.documentType,
    documentNumber: purchase.documentNumber,
    authorizationNumber: purchase.authorizationNumber,
    issuedAt: purchase.issuedAt.toISOString(),
    subtotal: Number(purchase.subtotal),
    discountTotal: Number(purchase.discountTotal),
    taxTotal: Number(purchase.taxTotal),
    total: Number(purchase.total),
    status: purchase.status,
    notes: purchase.notes,
    voidedAt: purchase.voidedAt?.toISOString() ?? null,
    voidedById: purchase.voidedById,
    voidReason: purchase.voidReason,
    createdAt: purchase.createdAt.toISOString(),
    updatedAt: purchase.updatedAt.toISOString(),
    items: purchase.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: resolveProductCode(item.product.sku, item.product.secuencial),
      productName: item.product.nombre,
      productType: item.product.tipoProducto,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      discount: Number(item.discount),
      taxRate: Number(item.taxRate),
      subtotal: Number(item.subtotal),
      taxTotal: Number(item.taxTotal),
      total: Number(item.total),
    })),
  };
}

export async function listPurchases(businessId: string) {
  const purchases = await prisma.purchase.findMany({
    select: purchaseSelect,
    where: {
      businessId,
    },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return purchases.map(purchasePresenter);
}

export async function createPurchase(
  businessId: string,
  createdById: string | null,
  rawInput: unknown,
) {
  const input = createPurchaseSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: {
        id: input.supplierId,
        businessId,
        activo: true,
      },
      select: { id: true, diasCredito: true },
    });

    if (!supplier) {
      throw new Error("Proveedor no encontrado");
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        tipoProducto: true,
      },
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== productIds.length) {
      throw new Error("Uno o mas productos no existen o estan inactivos");
    }

    const calculatedItems = input.items.map((item) => {
      const gross = roundMoney(item.quantity * item.unitCost);
      const discount = roundMoney(item.discount);

      if (discount > gross) {
        throw new Error("El descuento no puede superar el subtotal de una linea");
      }

      const subtotal = roundMoney(gross - discount);
      const taxTotal = roundMoney(subtotal * (item.taxRate / 100));
      const total = roundMoney(subtotal + taxTotal);

      return {
        productId: item.productId,
        productType: productById.get(item.productId)?.tipoProducto,
        quantity: roundQuantity(item.quantity),
        unitCost: roundMoney(item.unitCost),
        discount,
        taxRate: roundMoney(item.taxRate),
        subtotal,
        taxTotal,
        total,
      };
    });

    const subtotal = roundMoney(
      calculatedItems.reduce((sum, item) => sum + item.subtotal, 0),
    );
    const discountTotal = roundMoney(
      calculatedItems.reduce((sum, item) => sum + item.discount, 0),
    );
    const taxTotal = roundMoney(
      calculatedItems.reduce((sum, item) => sum + item.taxTotal, 0),
    );
    const total = roundMoney(
      calculatedItems.reduce((sum, item) => sum + item.total, 0),
    );
    const inventorySubtotal = roundMoney(
      calculatedItems
        .filter((item) => item.productType === "BIEN")
        .reduce((sum, item) => sum + item.subtotal, 0),
    );
    const serviceSubtotal = roundMoney(
      calculatedItems
        .filter((item) => item.productType !== "BIEN")
        .reduce((sum, item) => sum + item.subtotal, 0),
    );

    const purchase = await tx.purchase.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        documentType: input.documentType,
        documentNumber: input.documentNumber.trim(),
        authorizationNumber: nullableText(input.authorizationNumber),
        issuedAt: input.issuedAt,
        subtotal: new Prisma.Decimal(subtotal),
        discountTotal: new Prisma.Decimal(discountTotal),
        taxTotal: new Prisma.Decimal(taxTotal),
        total: new Prisma.Decimal(total),
        notes: nullableText(input.notes),
        createdById,
        items: {
          create: calculatedItems.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitCost: new Prisma.Decimal(item.unitCost),
            discount: new Prisma.Decimal(item.discount),
            taxRate: new Prisma.Decimal(item.taxRate),
            subtotal: new Prisma.Decimal(item.subtotal),
            taxTotal: new Prisma.Decimal(item.taxTotal),
            total: new Prisma.Decimal(item.total),
          })),
        },
      },
      select: purchaseSelect,
    });

    await createPayableForPurchaseInTransaction(tx, {
      businessId,
      supplierId: input.supplierId,
      purchaseId: purchase.id,
      documentType: input.documentType,
      documentNumber: purchase.documentNumber,
      issuedAt: purchase.issuedAt,
      total,
      supplierCreditDays: supplier.diasCredito,
    });

    await postPurchaseEntryInTransaction(tx, {
      businessId,
      purchaseId: purchase.id,
      inventorySubtotal,
      serviceSubtotal,
      taxTotal,
      total,
    });

    for (const item of calculatedItems) {
      if (item.productType !== "BIEN") {
        continue;
      }

      await tx.stockLevel.upsert({
        where: { productId: item.productId },
        create: {
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          minQuantity: new Prisma.Decimal(0),
        },
        update: {
          quantity: {
            increment: new Prisma.Decimal(item.quantity),
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: MovementType.IN,
          referenceType: ReferenceType.PURCHASE,
          referenceId: purchase.id,
          quantity: new Prisma.Decimal(item.quantity),
          createdById,
          notes: `Compra #${purchase.purchaseNumber.toString()} | ${purchase.documentNumber}`,
        },
      });
    }

    return purchasePresenter(purchase);
  });
}

export async function voidPurchase(
  businessId: string,
  voidedById: string | null,
  purchaseId: string,
  rawInput: unknown,
) {
  const input = voidPurchaseSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: {
        id: purchaseId,
        businessId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                nombre: true,
                tipoProducto: true,
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      throw new Error("Compra no encontrada");
    }

    if (purchase.status === PurchaseStatus.VOIDED) {
      throw new Error("La compra ya fue anulada");
    }

    await cancelPayableForPurchaseInTransaction(tx, purchase.id, input.reason);
    await reversePostedEntryBySourceInTransaction(tx, {
      businessId,
      sourceType: AccountingSourceType.PURCHASE,
      sourceId: purchase.id,
    });

    const productQuantities = new Map<string, { name: string; quantity: number }>();
    for (const item of purchase.items) {
      if (item.product.tipoProducto !== "BIEN") {
        continue;
      }

      const current = productQuantities.get(item.productId);
      productQuantities.set(item.productId, {
        name: item.product.nombre,
        quantity: (current?.quantity ?? 0) + Number(item.quantity),
      });
    }

    for (const [productId, item] of productQuantities.entries()) {
      const stockLevel = await tx.stockLevel.findUnique({
        where: { productId },
        select: { quantity: true },
      });
      const currentQuantity = Number(stockLevel?.quantity ?? 0);

      if (!stockLevel || currentQuantity < item.quantity) {
        throw new Error(
          `No se puede anular la compra porque el stock de ${item.name} ya fue consumido`,
        );
      }
    }

    for (const [productId, item] of productQuantities.entries()) {
      const updated = await tx.stockLevel.updateMany({
        where: {
          productId,
          quantity: {
            gte: new Prisma.Decimal(item.quantity),
          },
        },
        data: {
          quantity: {
            decrement: new Prisma.Decimal(item.quantity),
          },
        },
      });

      if (updated.count === 0) {
        throw new Error(
          `No se pudo revertir el stock de ${item.name}; intenta nuevamente`,
        );
      }
    }

    if (productQuantities.size > 0) {
      await tx.stockMovement.createMany({
        data: Array.from(productQuantities.entries()).map(
          ([productId, item]) => ({
            productId,
            movementType: MovementType.OUT,
            referenceType: ReferenceType.PURCHASE,
            referenceId: purchase.id,
            quantity: new Prisma.Decimal(item.quantity),
            createdById: voidedById,
            notes: `Salida por anulacion de compra #${purchase.purchaseNumber.toString()} | ${input.reason}`,
          }),
        ),
      });
    }

    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: PurchaseStatus.VOIDED,
        voidedAt: new Date(),
        voidedById,
        voidReason: input.reason,
      },
      select: purchaseSelect,
    });

    return purchasePresenter(updatedPurchase);
  });
}
