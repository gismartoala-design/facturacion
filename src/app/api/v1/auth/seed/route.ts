import { countUsers, createUser } from "@/core/auth/auth.service";
import { fail, ok } from "@/lib/http";

/**
 * POST /api/v1/auth/seed
 * Crea el primer usuario ADMIN solo si no existe ningún usuario.
 * Útil para entornos frescos. Desactiva en producción si lo deseas.
 */
export async function POST(request: Request) {
  try {
    const total = await countUsers();
    if (total > 0) {
      return fail("Ya existe al menos un usuario registrado", 409);
    }

    const payload = await request.json();
    const admin = await createUser({ ...payload, role: "ADMIN" });
    return ok(admin, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear admin inicial";
    return fail(message, 500);
  }
}
