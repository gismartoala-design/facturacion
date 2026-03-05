import { Prisma, ReferenceType, SriInvoiceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatProductCode, roundMoney } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/modules/sales/schemas";
import { pushAndAuthorizeInvoice } from "@/modules/sri/sri.service";

function sriTaxCode(tarifa: number) {
  if (tarifa === 15) {
    return "4";
  }

  return "0";
}

function toInvoicePayload(input: CheckoutInput, saleData: {
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
    total: number;
  };
  lines: Array<{
    productCode: string;
    auxCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineSubtotal: number;
    ivaRate: number;
    ivaAmount: number;
  }>;
}) {
  return {
    issuerId: input.issuerId,
    fechaEmision: input.fechaEmision,
    clienteTipoIdentificacion: saleData.customer.tipoIdentificacion,
    clienteIdentificacion: saleData.customer.identificacion,
    clienteRazonSocial: saleData.customer.razonSocial,
    clienteDireccion: saleData.customer.direccion ?? "",
    clienteEmail: saleData.customer.email ?? "",
    clienteTelefono: saleData.customer.telefono ?? "",
    totalSinImpuestos: saleData.totals.subtotal,
    totalDescuento: saleData.totals.discountTotal,
    propina: 0,
    importeTotal: saleData.totals.total,
    moneda: input.moneda,
    infoAdicional: input.infoAdicional ?? {},
    detalles: saleData.lines.map((line) => ({
      codigoPrincipal: line.productCode,
      codigoAuxiliar: line.auxCode,
      descripcion: line.description,
      cantidad: line.quantity,
      precioUnitario: line.unitPrice,
      descuento: line.discount,
      precioTotalSinImpuesto: line.lineSubtotal,
      detallesAdicionales: {},
      impuestos: [
        {
          codigo: "2",
          codigoPorcentaje: sriTaxCode(line.ivaRate),
          tarifa: line.ivaRate,
          baseImponible: line.lineSubtotal,
          valor: line.ivaAmount,
        },
      ],
    })),
    pagos: input.payments.map((payment) => ({
      formaPago: payment.formaPago,
      total: payment.total,
      plazo: payment.plazo,
      unidadTiempo: payment.unidadTiempo,
    })),
  };
}

export async function checkout(rawInput: unknown) {
  const input = checkoutSchema.parse(rawInput);

  const paymentSum = roundMoney(input.payments.reduce((acc, payment) => acc + payment.total, 0));

  const txResult = await prisma.$transaction(async (tx) => {
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
      aggregateQty.set(item.productId, (aggregateQty.get(item.productId) ?? 0) + item.cantidad);
    }

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
        product,
        quantity,
        unitPrice,
        discount,
        ivaRate,
        lineSubtotal,
        lineTax,
        lineTotal,
      };
    });

    const subtotal = roundMoney(lineComputations.reduce((acc, line) => acc + line.lineSubtotal, 0));
    const discountTotal = roundMoney(lineComputations.reduce((acc, line) => acc + line.discount, 0));
    const taxTotal = roundMoney(lineComputations.reduce((acc, line) => acc + line.lineTax, 0));
    const total = roundMoney(subtotal + taxTotal);

    if (roundMoney(paymentSum) !== total) {
      throw new Error("La suma de pagos no coincide con el total de la venta");
    }

    const sale = await tx.sale.create({
      data: {
        customerId: customer.id,
        subtotal,
        discountTotal,
        taxTotal,
        total,
      },
    });

    await tx.saleItem.createMany({
      data: lineComputations.map((line) => ({
        saleId: sale.id,
        productId: line.product.id,
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

    await tx.stockMovement.createMany({
      data: lineComputations.map((line) => ({
        productId: line.product.id,
        movementType: "OUT",
        referenceType: ReferenceType.SALE,
        referenceId: sale.id,
        quantity: line.quantity,
        notes: `Salida por venta #${sale.saleNumber.toString()}`,
      })),
    });

    const invoicePayload = toInvoicePayload(input, {
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
        total,
      },
      lines: lineComputations.map((line) => ({
        productCode: line.product.sku || formatProductCode(line.product.secuencial),
        auxCode: `AUX${line.product.secuencial.toString()}`,
        description: line.product.nombre,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        lineSubtotal: line.lineSubtotal,
        ivaRate: line.ivaRate,
        ivaAmount: line.lineTax,
      })),
    });

    const sriInvoice = await tx.sriInvoice.create({
      data: {
        saleId: sale.id,
        issuerId: input.issuerId,
        status: SriInvoiceStatus.PENDING_SRI,
        createRequestPayload: invoicePayload as Prisma.InputJsonValue,
      },
    });

    return {
      sale,
      invoicePayload,
      sriInvoiceId: sriInvoice.id,
      totals: {
        subtotal,
        discountTotal,
        taxTotal,
        total,
      },
    };
  });

  await pushAndAuthorizeInvoice(txResult.sriInvoiceId, txResult.invoicePayload);

  const finalInvoice = await prisma.sriInvoice.findUnique({
    where: { id: txResult.sriInvoiceId },
    include: {
      documents: true,
    },
  });

  return {
    saleId: txResult.sale.id,
    saleNumber: txResult.sale.saleNumber.toString(),
    saleStatus: txResult.sale.status,
    totals: txResult.totals,
    invoice: finalInvoice
      ? {
          sriInvoiceId: finalInvoice.id,
          externalInvoiceId: finalInvoice.externalInvoiceId,
          secuencial: finalInvoice.secuencial,
          status: finalInvoice.status,
          authorizationNumber: finalInvoice.authorizationNumber,
          claveAcceso: finalInvoice.claveAcceso,
          lastError: finalInvoice.lastError,
          retryCount: finalInvoice.retryCount,
          documents: finalInvoice.documents,
        }
      : null,
  };
}
