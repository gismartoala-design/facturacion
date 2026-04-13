import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { updateKitchenTicketStatus } from "@/modules/restaurant/restaurant.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await context.params;
    const payload = await request.json();
    const data = await updateKitchenTicketStatus(session, id, payload);
    return ok(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el ticket de cocina";
    return fail(message, 400);
  }
}
