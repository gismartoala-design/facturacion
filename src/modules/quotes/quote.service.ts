import { QuoteStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { resolveProductCode, roundMoney } from "@/lib/utils";
import { checkout } from "@/modules/sales/checkout.service";
import { checkoutSchema } from "@/modules/sales/schemas";

const createQuoteSchema = checkoutSchema.extend({
  notes: z.string().trim().max(500).optional(),
});

function quotePresenter(quote: {
  id: string;
  quoteNumber: bigint;
  status: QuoteStatus;
  issuerId: string;
  fechaEmision: string;
  moneda: string;
  formaPago: string;
  subtotal: { toString(): string };
  discountTotal: { toString(): string };
  taxTotal: { toString(): string };
  total: { toString(): string };
  notes: string | null;
  convertedSaleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    razonSocial: string;
    identificacion: string;
  };
}) {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber.toString(),
    status: quote.status,
    issuerId: quote.issuerId,
    fechaEmision: quote.fechaEmision,
    moneda: quote.moneda,
    formaPago: quote.formaPago,
    subtotal: Number(quote.subtotal),
    discountTotal: Number(quote.discountTotal),
    taxTotal: Number(quote.taxTotal),
    total: Number(quote.total),
    notes: quote.notes,
    convertedSaleId: quote.convertedSaleId,
    customerName: quote.customer.razonSocial,
    customerIdentification: quote.customer.identificacion,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}

export async function createQuote(rawInput: unknown) {
  const input = createQuoteSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
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
    });

    if (products.length !== productIds.length) {
      throw new Error("Uno o mas productos no existen o estan inactivos");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const lineComputations = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Producto no encontrado");

      const quantity = item.cantidad;
      const unitPrice = item.precioUnitario ?? Number(product.precio);
      const discount = item.descuento ?? 0;
      const ivaRate = item.tarifaIva ?? Number(product.tarifaIva);
      const lineSubtotal = roundMoney(quantity * unitPrice - discount);
      const lineTax = roundMoney((lineSubtotal * ivaRate) / 100);
      const lineTotal = roundMoney(lineSubtotal + lineTax);

      return {
        productId: product.id,
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
    const paymentTotal = roundMoney(input.payments.reduce((acc, payment) => acc + payment.total, 0));

    if (paymentTotal !== total) {
      throw new Error("La suma de pagos no coincide con el total de la cotizacion");
    }

    const quote = await tx.quote.create({
      data: {
        customerId: customer.id,
        status: QuoteStatus.OPEN,
        issuerId: input.issuerId,
        fechaEmision: input.fechaEmision,
        moneda: input.moneda,
        formaPago: input.payments[0].formaPago,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        notes: input.notes || null,
        items: {
          create: lineComputations.map((line) => ({
            productId: line.productId,
            cantidad: line.quantity,
            precioUnitario: line.unitPrice,
            descuento: line.discount,
            tarifaIva: line.ivaRate,
            subtotal: line.lineSubtotal,
            valorIva: line.lineTax,
            total: line.lineTotal,
          })),
        },
      },
      include: {
        customer: {
          select: {
            razonSocial: true,
            identificacion: true,
          },
        },
      },
    });

    return quotePresenter(quote);
  });
}

export async function listQuotes(status?: string) {
  const where =
    status && status !== "ALL"
      ? { status: status as QuoteStatus }
      : undefined;

  const quotes = await prisma.quote.findMany({
    where,
    include: {
      customer: {
        select: {
          razonSocial: true,
          identificacion: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return quotes.map(quotePresenter);
}

export async function getQuoteDetail(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
      convertedSale: {
        include: {
          sriInvoice: true,
        },
      },
    },
  });

  if (!quote) throw new Error("Cotizacion no encontrada");

  return {
    ...quotePresenter({
      ...quote,
      customer: {
        razonSocial: quote.customer.razonSocial,
        identificacion: quote.customer.identificacion,
      },
    }),
    customer: {
      id: quote.customer.id,
      tipoIdentificacion: quote.customer.tipoIdentificacion,
      identificacion: quote.customer.identificacion,
      razonSocial: quote.customer.razonSocial,
      direccion: quote.customer.direccion,
      email: quote.customer.email,
      telefono: quote.customer.telefono,
    },
    items: quote.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: resolveProductCode(item.product.sku, item.product.secuencial),
      productName: item.product.nombre,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      descuento: Number(item.descuento),
      tarifaIva: Number(item.tarifaIva),
      subtotal: Number(item.subtotal),
      valorIva: Number(item.valorIva),
      total: Number(item.total),
    })),
    convertedInvoice: quote.convertedSale?.sriInvoice
      ? {
          sriInvoiceId: quote.convertedSale.sriInvoice.id,
          externalInvoiceId: quote.convertedSale.sriInvoice.externalInvoiceId,
          status: quote.convertedSale.sriInvoice.status,
          secuencial: quote.convertedSale.sriInvoice.secuencial,
        }
      : null,
  };
}

export async function convertQuoteToSale(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!quote) throw new Error("Cotizacion no encontrada");
  if (quote.status === QuoteStatus.CANCELLED) throw new Error("No se puede convertir una cotizacion anulada");
  if (quote.status === QuoteStatus.CONVERTED) throw new Error("La cotizacion ya fue convertida");

  const result = await checkout({
    issuerId: quote.issuerId,
    fechaEmision: quote.fechaEmision,
    moneda: quote.moneda,
    customer: {
      tipoIdentificacion: quote.customer.tipoIdentificacion,
      identificacion: quote.customer.identificacion,
      razonSocial: quote.customer.razonSocial,
      direccion: quote.customer.direccion ?? "",
      email: quote.customer.email ?? "",
      telefono: quote.customer.telefono ?? "",
    },
    items: quote.items.map((item) => ({
      productId: item.productId,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      descuento: Number(item.descuento),
      tarifaIva: Number(item.tarifaIva),
    })),
    payments: [
      {
        formaPago: quote.formaPago,
        total: Number(quote.total),
        plazo: 0,
        unidadTiempo: "DIAS",
      },
    ],
    infoAdicional: {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber.toString(),
    },
  });

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.CONVERTED,
      convertedSaleId: result.saleId,
    },
  });

  return result;
}

export async function cancelQuote(quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });

  if (!quote) throw new Error("Cotizacion no encontrada");
  if (quote.status === QuoteStatus.CONVERTED) throw new Error("No se puede anular una cotizacion convertida");
  if (quote.status === QuoteStatus.CANCELLED) throw new Error("La cotizacion ya esta anulada");

  return prisma.quote.update({
    where: { id: quoteId },
    data: { status: QuoteStatus.CANCELLED },
    include: {
      customer: {
        select: {
          razonSocial: true,
          identificacion: true,
        },
      },
    },
  }).then(quotePresenter);
}

export async function updateQuote(quoteId: string, rawInput: unknown) {
  const input = createQuoteSchema.parse(rawInput);
  const existingQuote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!existingQuote) throw new Error("Cotizacion no encontrada");
  if (existingQuote.status !== QuoteStatus.OPEN) {
    throw new Error("Solo se pueden editar cotizaciones en estado ABIERTA");
  }

  return prisma.$transaction(async (tx) => {
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
    });

    if (products.length !== productIds.length) {
      throw new Error("Uno o mas productos no existen o estan inactivos");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    const lineComputations = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Producto no encontrado");

      const quantity = item.cantidad;
      const unitPrice = item.precioUnitario ?? Number(product.precio);
      const discount = item.descuento ?? 0;
      const ivaRate = item.tarifaIva ?? Number(product.tarifaIva);
      const lineSubtotal = roundMoney(quantity * unitPrice - discount);
      const lineTax = roundMoney((lineSubtotal * ivaRate) / 100);
      const lineTotal = roundMoney(lineSubtotal + lineTax);

      return {
        productId: product.id,
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
    const paymentTotal = roundMoney(input.payments.reduce((acc, payment) => acc + payment.total, 0));

    if (paymentTotal !== total) {
      throw new Error("La suma de pagos no coincide con el total de la cotizacion");
    }

    // Borrar items anteriores y crear nuevos
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const quote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: customer.id,
        issuerId: input.issuerId,
        fechaEmision: input.fechaEmision,
        moneda: input.moneda,
        formaPago: input.payments[0].formaPago,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        notes: input.notes || null,
        items: {
          create: lineComputations.map((line) => ({
            productId: line.productId,
            cantidad: line.quantity,
            precioUnitario: line.unitPrice,
            descuento: line.discount,
            tarifaIva: line.ivaRate,
            subtotal: line.lineSubtotal,
            valorIva: line.lineTax,
            total: line.lineTotal,
          })),
        },
      },
      include: {
        customer: {
          select: {
            razonSocial: true,
            identificacion: true,
          },
        },
      },
    });

    return quotePresenter(quote);
  });
}
