import { z } from "zod";

import { voidPurchase } from "@/core/purchases/purchase.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const { id } = await params;
    const payload = await request.json();
    const purchase = await voidPurchase(
      session.businessId,
      session.sub,
      id,
      payload,
    );

    return ok(purchase);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo anular compra";
    return fail(message, 500);
  }
}
