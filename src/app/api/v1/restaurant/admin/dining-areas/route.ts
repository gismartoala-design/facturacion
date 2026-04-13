import { z } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  createDiningArea,
  listRestaurantFloorLayout,
} from "@/modules/restaurant/restaurant.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const layout = await listRestaurantFloorLayout(session);
    return ok(layout.areas);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar las áreas";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const payload = await request.json();
    const area = await createDiningArea(session, payload);
    return ok(area, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo crear el área";
    return fail(message, 500);
  }
}
