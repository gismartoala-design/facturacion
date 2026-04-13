import { z } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  createRestaurantMenuProductAdmin,
  listRestaurantMenuProductsAdmin,
} from "@/modules/restaurant/restaurant.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const products = await listRestaurantMenuProductsAdmin(session);
    return ok(products);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo listar el menú restaurante";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const payload = await request.json();
    const product = await createRestaurantMenuProductAdmin(session, payload);
    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el plato";
    return fail(message, 500);
  }
}
