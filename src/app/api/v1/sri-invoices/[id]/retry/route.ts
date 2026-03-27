import { fail, ok } from "@/lib/http";
import { retrySriInvoiceAuthorization } from "@/modules/billing/services/sri.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await retrySriInvoiceAuthorization(id);

    return ok({
      id: result.id,
      externalInvoiceId: result.externalInvoiceId,
      status: result.status,
      retryCount: result.retryCount,
      lastError: result.lastError,
      authorizationNumber: result.authorizationNumber,
      claveAcceso: result.claveAcceso,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo ejecutar reintento";
    return fail(message, 400);
  }
}
