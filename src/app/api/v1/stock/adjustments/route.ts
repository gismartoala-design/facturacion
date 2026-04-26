import { z } from "zod";

import { adjustStock } from "@/core/inventory/inventory.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autorizado", 401);
    }

    const payload = await request.json();
    const adjustment = await adjustStock(payload, {
      businessId: session.businessId,
      createdById: session.sub,
    });
    return ok(adjustment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo ajustar stock";
    return fail(message, 400);
  }
}
