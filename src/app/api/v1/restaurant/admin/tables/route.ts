import { z } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  createRestaurantTable,
  listRestaurantFloorLayout,
} from "@/modules/restaurant/restaurant.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const layout = await listRestaurantFloorLayout(session);
    return ok(layout.tables);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar las mesas";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const payload = await request.json();
    const table = await createRestaurantTable(session, payload);
    return ok(table, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo crear la mesa";
    return fail(message, 500);
  }
}
