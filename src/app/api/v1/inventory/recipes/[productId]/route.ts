import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { getRecipeByProductId } from "@/modules/restaurant/restaurant.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede consultar recetas", 403);
    }

    const { productId } = await params;
    const data = await getRecipeByProductId(session, productId);
    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo consultar la receta";
    return fail(message, 400);
  }
}
