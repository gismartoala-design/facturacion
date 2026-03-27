import { z } from "zod";

import { createUser, listUsers } from "@/core/auth/auth.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const users = await listUsers();
    return ok(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo listar usuarios";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const payload = await request.json();
    const user = await createUser(payload);
    return ok(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "No se pudo crear usuario";
    return fail(message, 500);
  }
}
