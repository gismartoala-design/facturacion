import { z } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { updateRestaurantMenuProductAdmin } from "@/modules/restaurant/restaurant.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const { id } = await params;
    const payload = await request.json();
    const product = await updateRestaurantMenuProductAdmin(session, id, payload);
    return ok(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el producto del menú";
    return fail(message, 500);
  }
}
