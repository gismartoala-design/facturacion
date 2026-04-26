import { z } from "zod";

import { createProduct, listProducts } from "@/core/inventory/inventory.service";
import { getSession } from "@/lib/auth";
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
    const session = await getSession();
    if (!session) {
      return fail("No autorizado", 401);
    }

    const payload = await request.json();
    const product = await createProduct(payload, {
      businessId: session.businessId,
      createdById: session.sub,
    });
    return ok(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo crear producto";
    return fail(message, 500);
  }
}
