import { z } from "zod";

import { adjustStock } from "@/core/inventory/inventory.service";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const adjustment = await adjustStock(payload);
    return ok(adjustment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo ajustar stock";
    return fail(message, 400);
  }
}
