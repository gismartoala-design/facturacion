import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { importAccountingAccounts } from "@/core/accounting/account-plan.service";
import { importAccountingAccountsSchema } from "@/core/accounting/schemas";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede importar cuentas contables", 403);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const raw = (await request.json()) as unknown;
    const input = importAccountingAccountsSchema.parse(raw);
    const result = await importAccountingAccounts(business.id, input);

    return ok(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(
        "Datos invalidos para la importacion del plan de cuentas",
        400,
        error.flatten(),
      );
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo importar el plan de cuentas",
      400,
    );
  }
}
