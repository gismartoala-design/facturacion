import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { listRestaurantFloor } from "@/modules/restaurant/restaurant.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const data = await listRestaurantFloor(session);
    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el salon";
    return fail(message, 400);
  }
}
