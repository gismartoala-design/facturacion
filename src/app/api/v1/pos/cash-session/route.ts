import { z } from "zod";

import { closeCashSession, listClosedCashSessions, openCashSession } from "@/modules/pos/services/pos.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const data = await listClosedCashSessions(session);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron obtener los cierres de caja";
    return fail(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await openCashSession(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo abrir caja";
    return fail(message, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await closeCashSession(session, payload);
    return ok(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo cerrar caja";
    return fail(message, 400);
  }
}
