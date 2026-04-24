import { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  createPurchase,
  listPurchases,
} from "@/core/purchases/purchase.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const purchases = await listPurchases(session.businessId);
    return ok(purchases);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar compras";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const payload = await request.json();
    const purchase = await createPurchase(session.businessId, session.sub, payload);

    return ok(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail(
        "Ya existe una compra con ese proveedor, tipo y numero de documento",
        409,
      );
    }

    const message =
      error instanceof Error ? error.message : "No se pudo registrar compra";
    return fail(message, 500);
  }
}
