import { after } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { authorizePendingSaleDocument } from "@/modules/billing/services/sale-document-authorization.service";
import { preparePendingSaleDocumentAuthorization } from "@/modules/billing/services/sale-document-preparation.service";
import { settleRestaurantOrder } from "@/modules/restaurant/restaurant.service";

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
    const result = await settleRestaurantOrder(session, id, payload);

    if (result.backgroundDocumentTask) {
      const backgroundTask = result.backgroundDocumentTask;
      await preparePendingSaleDocumentAuthorization(backgroundTask);
      after(async () => {
        await authorizePendingSaleDocument(backgroundTask);
      });
    }

    const data = {
      saleId: result.saleId,
      saleNumber: result.saleNumber,
      saleStatus: result.saleStatus,
      totals: result.totals,
      document: result.document,
      invoice: result.invoice,
      receivable: result.receivable,
      order: result.order,
    };
    return ok(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo liquidar la orden";
    return fail(message, 400);
  }
}
