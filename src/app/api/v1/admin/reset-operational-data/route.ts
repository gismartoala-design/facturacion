import { z } from "zod";

import {
  RESET_OPERATIONAL_DATA_CONFIRMATION,
  resetOperationalData,
} from "@/core/maintenance/reset-operational-data.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

const resetOperationalDataSchema = z.object({
  confirm: z.literal(RESET_OPERATIONAL_DATA_CONFIRMATION),
  pruneOrphanCustomers: z.boolean().optional(),
  resetDocumentSeries: z.boolean().optional(),
  resetProductStockToZero: z.boolean().optional(),
  clearIntegrationLogs: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    if (process.env.ENABLE_ADMIN_RESET_ENDPOINT !== "true") {
      return fail(
        "El endpoint de reseteo esta deshabilitado. Activa ENABLE_ADMIN_RESET_ENDPOINT=true para usarlo.",
        403,
      );
    }

    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede ejecutar este reseteo", 403);
    }

    const input = resetOperationalDataSchema.parse((await request.json()) as unknown);
    const result = await resetOperationalData({
      pruneOrphanCustomers: input.pruneOrphanCustomers,
      resetDocumentSeries: input.resetDocumentSeries,
      resetProductStockToZero: input.resetProductStockToZero,
      clearIntegrationLogs: input.clearIntegrationLogs,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Solicitud invalida", 400);
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo limpiar la base operativa",
      500,
    );
  }
}
