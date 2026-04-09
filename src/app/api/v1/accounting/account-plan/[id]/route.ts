import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { updateAccountingAccount } from "@/core/accounting/account-plan.service";
import { updateAccountingAccountSchema } from "@/core/accounting/schemas";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede actualizar cuentas contables", 403);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const { id } = await params;
    const raw = (await request.json()) as unknown;
    const input = updateAccountingAccountSchema.parse({
      ...(typeof raw === "object" && raw !== null ? raw : {}),
      id,
    });
    const account = await updateAccountingAccount(business.id, input);

    return ok(account);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos para la cuenta contable", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la cuenta contable",
      400,
    );
  }
}
