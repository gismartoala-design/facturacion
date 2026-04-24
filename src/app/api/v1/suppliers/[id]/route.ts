import { z } from "zod";

import {
  deactivateSupplier,
  updateSupplier,
} from "@/core/purchases/supplier.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const { id } = await params;
    const payload = await request.json();
    const supplier = await updateSupplier(session.businessId, id, payload);

    return ok(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo actualizar proveedor";
    return fail(message, 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const { id } = await params;
    const supplier = await deactivateSupplier(session.businessId, id);

    return ok(supplier);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo desactivar proveedor";
    return fail(message, 500);
  }
}
