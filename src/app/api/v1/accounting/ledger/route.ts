import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getAccountLedgerByBusiness } from "@/core/accounting/accounting-entry.service";
import { accountLedgerFiltersSchema } from "@/core/accounting/schemas";
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
    const filters = accountLedgerFiltersSchema.parse({
      accountCode: url.searchParams.get("accountCode") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const ledger = await getAccountLedgerByBusiness(business.id, filters);
    return ok(ledger);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Filtros invalidos para el libro mayor", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el libro mayor",
      400,
    );
  }
}
