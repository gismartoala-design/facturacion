import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { applyStockTaking } from "@/core/inventory/stock-taking.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await params;
    const data = await applyStockTaking(session, id);
    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo aplicar la toma de inventario";
    return fail(message, 400);
  }
}
