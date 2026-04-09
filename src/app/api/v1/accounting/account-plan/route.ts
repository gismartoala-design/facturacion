import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import {
  createAccountingAccount,
  getAccountingAccountPlan,
} from "@/core/accounting/account-plan.service";
import { createAccountingAccountSchema } from "@/core/accounting/schemas";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    const plan = await getAccountingAccountPlan(business.id);
    return ok(plan);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el plan de cuentas",
      400,
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    if (session.role !== "ADMIN") {
      return fail("Solo un administrador puede crear cuentas contables", 403);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const raw = (await request.json()) as unknown;
    const input = createAccountingAccountSchema.parse(raw);
    const account = await createAccountingAccount(business.id, input);

    return ok(account, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos para la cuenta contable", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo crear la cuenta contable",
      400,
    );
  }
}
