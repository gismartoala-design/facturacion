import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import { closeCashSession } from "@/core/cash-management/cash-session.service";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

const uuidSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id: sessionId } = await params;
    if (!uuidSchema.safeParse(sessionId).success) {
      return fail("ID de sesion invalido", 400);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    const cashRuntime = resolveCashRuntime(business.blueprint);
    if (!cashRuntime.enabled) return fail("Modulo Cash Management no habilitado", 403);

    const payload = await request.json();
    // sessionId viene del parámetro de ruta — no del body — para que no sea manipulable.
    const data = await closeCashSession(session, business.id, {
      ...payload,
      sessionId,
    });
    return ok(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.issues);
    }
    const message = error instanceof Error ? error.message : "No se pudo cerrar caja";
    return fail(message, 400);
  }
}
