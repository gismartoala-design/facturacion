import { z } from "zod";

import { holdSale, listHeldSales } from "@/modules/pos/services/pos.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const data = await listHeldSales(session);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron listar ventas en espera";
    return fail(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await holdSale(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar la venta en espera";
    return fail(message, 400);
  }
}
