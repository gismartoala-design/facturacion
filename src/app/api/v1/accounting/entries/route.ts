import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import {
  createManualAdjustmentEntry,
  listAccountingEntriesByBusiness,
} from "@/core/accounting/accounting-entry.service";
import {
  createManualAdjustmentEntrySchema,
  listAccountingEntriesFiltersSchema,
} from "@/core/accounting/schemas";
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
    const filters = listAccountingEntriesFiltersSchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      sourceType: url.searchParams.get("sourceType") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const entries = await listAccountingEntriesByBusiness(business.id, filters);
    return ok(entries);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Filtros invalidos", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los asientos contables",
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
      return fail("Solo un administrador puede registrar asientos manuales", 403);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const raw = (await request.json()) as unknown;
    const input = createManualAdjustmentEntrySchema.parse(raw);
    const entry = await createManualAdjustmentEntry(business.id, input);

    return ok(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Datos invalidos para el asiento manual", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo registrar el asiento manual",
      400,
    );
  }
}
