import { deleteHeldSale } from "@/modules/pos/services/pos.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await context.params;
    const data = await deleteHeldSale(session, id);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la venta en espera";
    return fail(message, 400);
  }
}
