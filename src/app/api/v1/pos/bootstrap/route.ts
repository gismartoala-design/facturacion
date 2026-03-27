import { getPosBootstrap } from "@/modules/pos/services/pos.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const data = await getPosBootstrap(session);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar POS";
    return fail(message, 400);
  }
}
