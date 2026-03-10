import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { formatProductCode } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await prisma.sriInvoice.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
            payments: true,
          },
        },
        documents: true,
      },
    });

    if (!invoice) {
      return fail("Factura no encontrada", 404);
    }

    const formattedInvoice = {
      ...invoice,
      sale: {
        ...invoice.sale,
        saleNumber: invoice.sale.saleNumber.toString(),
        subtotal: Number(invoice.sale.subtotal),
        discountTotal: Number(invoice.sale.discountTotal),
        taxTotal: Number(invoice.sale.taxTotal),
        total: Number(invoice.sale.total),
        items: invoice.sale.items.map((item) => ({
          ...item,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precioUnitario),
          descuento: Number(item.descuento),
          tarifaIva: Number(item.tarifaIva),
          subtotal: Number(item.subtotal),
          valorIva: Number(item.valorIva),
          total: Number(item.total),
          product: {
            ...item.product,
            secuencial: item.product.secuencial.toString(),
            codigo: item.product.sku || formatProductCode(item.product.secuencial),
            precio: Number(item.product.precio),
            tarifaIva: Number(item.product.tarifaIva),
          },
        })),
        payments: invoice.sale.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    };

    return ok(formattedInvoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener factura";
    return fail(message, 500);
  }
}
