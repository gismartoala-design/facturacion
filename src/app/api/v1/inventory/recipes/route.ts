import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createRecipe } from "@/modules/restaurant/restaurant.service";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede configurar recetas", 403);
    }

    const payload = await request.json();
    const data = await createRecipe(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo registrar la receta";
    return fail(message, 400);
  }
}
