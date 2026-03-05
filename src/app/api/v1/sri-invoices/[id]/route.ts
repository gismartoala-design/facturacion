import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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

    return ok(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo obtener factura";
    return fail(message, 500);
  }
}
