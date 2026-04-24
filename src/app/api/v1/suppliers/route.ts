import { z } from "zod";

import {
  createSupplier,
  listSuppliers,
} from "@/core/purchases/supplier.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const suppliers = await listSuppliers(session.businessId, search);

    return ok(suppliers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron listar proveedores";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const payload = await request.json();
    const supplier = await createSupplier(session.businessId, payload);

    return ok(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo crear proveedor";
    return fail(message, 500);
  }
}
