import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import {
  getStockTakingDetail,
  updateStockTakingDraft,
} from "@/core/inventory/stock-taking.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await params;
    const data = await getStockTakingDetail(session, id);
    return ok(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la toma de inventario";
    return fail(message, 400);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await params;
    const payload = await request.json();
    const data = await updateStockTakingDraft(session, id, payload);
    return ok(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la toma de inventario";
    return fail(message, 400);
  }
}
