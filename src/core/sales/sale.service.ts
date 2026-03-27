import { Prisma, ReferenceType, type SaleStatus } from "@prisma/client";

import type { CheckoutInput } from "@/core/sales/schemas";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/utils";

const logger = createLogger("SalesCreate");

type SaleTimingContext = {
  startedAt?: number;
  inventoryTrackingEnabled?: boolean;
};

export type CreatedSaleContext = {
  sale: {
    id: string;
    saleNumber: bigint;
    status: SaleStatus;
  };
  customer: {
    tipoIdentificacion: string;
    identificacion: string;
    razonSocial: string;
    direccion: string | null;
    email: string | null;
    telefono: string | null;
  };
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  lines: Array<{
    productId: string;
    productSku: string | null;
    productSecuencial: bigint;
    productName: string;
    productType: "BIEN" | "SERVICIO";
    quantity: number;
    unitPrice: number;
    discount: number;
    ivaRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
  }>;
  payments: CheckoutInput["payments"];
  documentInput: {
    documentType: CheckoutInput["documentType"];
    issuerId: string;
    fechaEmision: string;
    moneda: string;
    infoAdicional: CheckoutInput["infoAdicional"];
  };
};

export async function createSaleInTransaction(
  tx: Prisma.TransactionClient,
  input: CheckoutInput,
  timing?: SaleTimingContext,
): Promise<CreatedSaleContext> {
  const paymentSum = roundMoney(
    input.payments.reduce((acc, payment) => acc + payment.total, 0),
  );
  const startedAt = timing?.startedAt ?? startTimer();
  const inventoryTrackingEnabled = timing?.inventoryTrackingEnabled ?? true;

  try {
    const customerStartedAt = startTimer();
    const customer = await tx.customer.upsert({
      where: {
        tipoIdentificacion_identificacion: {
          tipoIdentificacion: input.customer.tipoIdentificacion,
          identificacion: input.customer.identificacion,
        },
      },
      update: {
        razonSocial: input.customer.razonSocial,
        direccion: input.customer.direccion || null,
        email: input.customer.email || null,
        telefono: input.customer.telefono || null,
      },
      create: {
        tipoIdentificacion: input.customer.tipoIdentificacion,
        identificacion: input.customer.identificacion,
        razonSocial: input.customer.razonSocial,
        direccion: input.customer.direccion || null,
        email: input.customer.email || null,
        telefono: input.customer.telefono || null,
      },
    });

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const productsStartedAt = startTimer();
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        activo: true,
      },
      include: {
        stockLevel: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("Uno o mas productos no existen o estan inactivos");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const aggregateQty = new Map<string, number>();
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (product?.tipoProducto !== "BIEN") {
        continue;
      }

      aggregateQty.set(
        item.productId,
        (aggregateQty.get(item.productId) ?? 0) + item.cantidad,
      );
    }

    const stockStartedAt = startTimer();
    if (inventoryTrackingEnabled) {
      for (const [productId, qty] of aggregateQty) {
        const updated = await tx.stockLevel.updateMany({
          where: {
            productId,
            quantity: { gte: qty },
          },
          data: {
            quantity: { decrement: qty },
          },
        });

        if (updated.count === 0) {
          const productName = productMap.get(productId)?.nombre ?? productId;
          throw new Error(`Stock insuficiente para ${productName}`);
        }
      }
    }

    const lineComputations = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("Producto no encontrado");
      }

      const quantity = item.cantidad;
      const unitPrice = item.precioUnitario ?? Number(product.precio);
      const discount = item.descuento ?? 0;
      const ivaRate = item.tarifaIva ?? Number(product.tarifaIva);
      const lineSubtotalRaw = quantity * unitPrice - discount;
      const lineSubtotal = roundMoney(lineSubtotalRaw);
      const lineTax = roundMoney((lineSubtotal * ivaRate) / 100);
      const lineTotal = roundMoney(lineSubtotal + lineTax);

      return {
        productId: product.id,
        productSku: product.sku,
        productSecuencial: product.secuencial,
        productName: product.nombre,
        productType: product.tipoProducto,
        quantity,
        unitPrice,
        discount,
        ivaRate,
        lineSubtotal,
        lineTax,
        lineTotal,
      };
    });

    const subtotal = roundMoney(
      lineComputations.reduce((acc, line) => acc + line.lineSubtotal, 0),
    );
    const discountTotal = roundMoney(
      lineComputations.reduce((acc, line) => acc + line.discount, 0),
    );
    const taxTotal = roundMoney(
      lineComputations.reduce((acc, line) => acc + line.lineTax, 0),
    );
    const total = roundMoney(subtotal + taxTotal);

    if (roundMoney(paymentSum) !== total) {
      throw new Error("La suma de pagos no coincide con el total de la venta");
    }

    const persistenceStartedAt = startTimer();
    const sale = await tx.sale.create({
      data: {
        customerId: customer.id,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        createdById: input.createdById,
      },
    });

    await tx.saleItem.createMany({
      data: lineComputations.map((line) => ({
        saleId: sale.id,
        productId: line.productId,
        cantidad: line.quantity,
        precioUnitario: line.unitPrice,
        descuento: line.discount,
        tarifaIva: line.ivaRate,
        subtotal: line.lineSubtotal,
        valorIva: line.lineTax,
        total: line.lineTotal,
      })),
    });

    await tx.salePayment.createMany({
      data: input.payments.map((payment) => ({
        saleId: sale.id,
        formaPago: payment.formaPago,
        amount: payment.total,
        plazo: payment.plazo,
        unidadTiempo: payment.unidadTiempo,
      })),
    });

    const stockMovements = inventoryTrackingEnabled
      ? lineComputations
          .filter((line) => line.productType === "BIEN")
          .map((line) => ({
            productId: line.productId,
            movementType: "OUT" as const,
            referenceType: ReferenceType.SALE,
            referenceId: sale.id,
            quantity: line.quantity,
            createdById: input.createdById,
            notes: `Salida por venta #${sale.saleNumber.toString()}`,
          }))
      : [];

    if (stockMovements.length > 0) {
      await tx.stockMovement.createMany({
        data: stockMovements,
      });
    }

    logger.info("create-sale:completed", {
      saleId: sale.id,
      saleNumber: sale.saleNumber.toString(),
      itemCount: lineComputations.length,
      customerUpsertMs: timerDurationMs(customerStartedAt),
      productLoadMs: timerDurationMs(productsStartedAt),
      stockMs: inventoryTrackingEnabled ? timerDurationMs(stockStartedAt) : 0,
      persistenceMs: timerDurationMs(persistenceStartedAt),
      inventoryTrackingEnabled,
      durationMs: timerDurationMs(startedAt),
    });

    return {
      sale: {
        id: sale.id,
        saleNumber: sale.saleNumber,
        status: sale.status,
      },
      customer: {
        tipoIdentificacion: customer.tipoIdentificacion,
        identificacion: customer.identificacion,
        razonSocial: customer.razonSocial,
        direccion: customer.direccion,
        email: customer.email,
        telefono: customer.telefono,
      },
      totals: {
        subtotal,
        discountTotal,
        taxTotal,
        total,
      },
      lines: lineComputations,
      payments: input.payments,
      documentInput: {
        documentType: input.documentType,
        issuerId: input.issuerId,
        fechaEmision: input.fechaEmision,
        moneda: input.moneda,
        infoAdicional: input.infoAdicional,
      },
    };
  } catch (error) {
    logger.error("create-sale:failed", {
      durationMs: timerDurationMs(startedAt),
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    throw error;
  }
}

export async function createSale(input: CheckoutInput): Promise<CreatedSaleContext> {
  const startedAt = startTimer();
  return prisma.$transaction((tx) =>
    createSaleInTransaction(tx, input, { startedAt }),
  );
}
