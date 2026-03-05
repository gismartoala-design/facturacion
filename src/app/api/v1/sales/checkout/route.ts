import { z } from "zod";

import { fail, ok } from "@/lib/http";
import { checkout } from "@/modules/sales/checkout.service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await checkout(payload);
    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo procesar checkout";
    return fail(message, 400);
  }
}
