import { z } from "zod";

import {
  createSupplierPayment,
  listAccountsPayable,
} from "@/core/purchases/accounts-payable.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const payables = await listAccountsPayable(session.businessId);
    return ok(payables);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar cuentas por pagar";
    return fail(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);
    if (!session.businessId) return fail("Negocio no configurado", 400);

    const payload = await request.json();
    const payable = await createSupplierPayment(
      session.businessId,
      session.sub,
      payload,
    );

    return ok(payable, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo registrar pago";
    return fail(message, 500);
  }
}
