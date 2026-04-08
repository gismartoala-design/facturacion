import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getAccountingAccountPlan } from "@/core/accounting/accounting-entry.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

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
