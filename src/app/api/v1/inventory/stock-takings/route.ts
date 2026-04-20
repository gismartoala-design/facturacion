import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  createStockTakingDraft,
  listStockTakingSummaries,
} from "@/core/inventory/stock-taking.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const data = await listStockTakingSummaries(session);
    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las tomas de inventario";
    return fail(message, 400);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const payload = await request.json();
    const data = await createStockTakingDraft(session, payload);
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo guardar la toma de inventario";
    return fail(message, 400);
  }
}
