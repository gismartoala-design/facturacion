import { z } from "zod";

import { fail, ok } from "@/lib/http";
import { retrySriInvoiceAuthorization } from "@/modules/billing/services/sri.service";

const retryBatchSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1).max(25),
});

export async function POST(request: Request) {
  try {
    const payload = retryBatchSchema.parse(await request.json());
    const uniqueInvoiceIds = Array.from(new Set(payload.invoiceIds));

    const results: Array<{
      id: string;
      ok: boolean;
      status: string | null;
      retryCount: number | null;
      message: string;
    }> = [];

    for (const invoiceId of uniqueInvoiceIds) {
      try {
        const result = await retrySriInvoiceAuthorization(invoiceId);
        results.push({
          id: invoiceId,
          ok: true,
          status: result.status,
          retryCount: result.retryCount,
          message: "Reintento ejecutado",
        });
      } catch (error) {
        results.push({
          id: invoiceId,
          ok: false,
          status: null,
          retryCount: null,
          message:
            error instanceof Error
              ? error.message
              : "No se pudo ejecutar reintento",
        });
      }
    }

    return ok({
      processed: results.length,
      succeeded: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar el reintento masivo";
    return fail(message, 400);
  }
}
