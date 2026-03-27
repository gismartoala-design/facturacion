import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import { openCashSession, getActiveCashSession } from "@/core/cash-management/cash-session.service";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    const cashRuntime = resolveCashRuntime(business.blueprint);
    if (!cashRuntime.enabled) return fail("Modulo Cash Management no habilitado", 403);

    const cashSession = await getActiveCashSession(business.id, session.sub);
    return ok(cashSession);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener sesion de caja";
    return fail(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    const cashRuntime = resolveCashRuntime(business.blueprint);
    if (!cashRuntime.enabled) return fail("Modulo Cash Management no habilitado", 403);

    const payload = await request.json();
    const data = await openCashSession(session, business.id, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "No se pudo abrir caja";
    return fail(message, 400);
  }
}
