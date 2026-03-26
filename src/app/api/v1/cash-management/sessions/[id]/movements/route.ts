import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import { getSessionMovements, registerMovement } from "@/core/cash-management/cash-movement.service";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

const uuidSchema = z.string().uuid();

export async function GET(
  _request: Request,
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

    const movements = await getSessionMovements(sessionId, business.id, session.sub);
    return ok(movements);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener movimientos";
    return fail(message, 400);
  }
}

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
    const movement = await registerMovement(session, business.id, sessionId, payload, cashRuntime);
    return ok(movement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "No se pudo registrar movimiento";
    return fail(message, 400);
  }
}
