import { z } from "zod";

import { deactivateProduct, updateProduct } from "@/core/inventory/inventory.service";
import { fail, ok } from "@/lib/http";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const product = await updateProduct(id, payload);
    return ok(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "No se pudo actualizar producto";
    return fail(message, 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await deactivateProduct(id);
    return ok(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar producto";
    return fail(message, 500);
  }
}
