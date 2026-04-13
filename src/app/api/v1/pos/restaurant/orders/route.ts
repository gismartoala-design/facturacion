import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createRestaurantOrder } from "@/modules/restaurant/restaurant.service";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await createRestaurantOrder(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo crear la orden";
    return fail(message, 400);
  }
}
