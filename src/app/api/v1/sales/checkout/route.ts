import { after } from "next/server";
import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById, hasBusinessFeature } from "@/core/business/business.service";
import {
  authorizePendingSaleDocument,
  checkout,
} from "@/core/sales/checkout.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const payload = await request.json();
    const normalizedPayload = {
      ...payload,
      createdById: typeof payload?.createdById === "string" ? payload.createdById : session.sub,
    };
    const billingEnabled = hasBusinessFeature(session.features, "BILLING");

    if (!billingEnabled || !business.taxProfile?.requiresElectronicBilling) {
      normalizedPayload.documentType = "NONE";
    }

    const result = await checkout(normalizedPayload);
    const { backgroundDocumentTask, ...response } = result;

    if (backgroundDocumentTask) {
      after(async () => {
        await authorizePendingSaleDocument(backgroundDocumentTask);
      });
    }

    return ok(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo procesar checkout";
    return fail(message, 400);
  }
}
