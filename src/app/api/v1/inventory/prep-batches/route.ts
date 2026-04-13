import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createPrepBatch } from "@/modules/restaurant/restaurant.service";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await createPrepBatch(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar el lote de preproduccion";
    return fail(message, 400);
  }
}
