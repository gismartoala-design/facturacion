import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getBalanceSheetByBusiness } from "@/core/accounting/accounting-report.service";
import { balanceSheetFiltersSchema } from "@/core/accounting/schemas";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const url = new URL(request.url);
    const filters = balanceSheetFiltersSchema.parse({
      to: url.searchParams.get("to") ?? undefined,
      includeZeroBalances: url.searchParams.get("includeZeroBalances") ?? undefined,
      includeInactive: url.searchParams.get("includeInactive") ?? undefined,
    });

    const balanceSheet = await getBalanceSheetByBusiness(business.id, filters);
    return ok(balanceSheet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Filtros invalidos para el balance general", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el balance general",
      400,
    );
  }
}
