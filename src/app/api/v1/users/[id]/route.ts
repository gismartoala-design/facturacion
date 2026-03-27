import { z } from "zod";

import { deleteUser, updateUser } from "@/core/auth/auth.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const { id } = await params;
    const payload = await request.json();
    const user = await updateUser(id, payload);
    return ok(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "No se pudo actualizar usuario";
    return fail(message, 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (session.role !== "ADMIN") return fail("Acceso denegado", 403);

    const { id } = await params;
    const user = await deleteUser(id);
    return ok(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar usuario";
    return fail(message, 500);
  }
}
