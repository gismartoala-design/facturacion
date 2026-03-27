import { z } from "zod";

import { createProduct, listProducts } from "@/core/inventory/inventory.service";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const products = await listProducts();
    return ok(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron listar productos";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const product = await createProduct(payload);
    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo crear producto";
    return fail(message, 500);
  }
}
