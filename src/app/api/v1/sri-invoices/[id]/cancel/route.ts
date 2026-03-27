import { cancelSaleBySriInvoiceId } from "@/core/sales/cancel.service";
import { fail, ok } from "@/lib/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await cancelSaleBySriInvoiceId(id);
    return ok(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo anular la venta/factura";
    return fail(message, 400);
  }
}
