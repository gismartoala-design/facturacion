import { after } from "next/server";
import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { resolveBillingRuntime } from "@/modules/billing/policies/resolve-billing-runtime";
import { authorizePendingSaleDocument } from "@/modules/billing/services/sale-document-authorization.service";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { runDirectSaleCheckout } from "@/modules/sales/services/direct-sale-checkout.service";

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
    const billingRuntime = resolveBillingRuntime({
      blueprint: business.blueprint,
      taxProfile: business.taxProfile,
    });
    const posRuntime = resolvePosRuntime({
      blueprint: business.blueprint,
    });

    if (!billingRuntime.capabilities.electronicBilling) {
      normalizedPayload.documentType = "NONE";
    }

    const result = await runDirectSaleCheckout(
      normalizedPayload,
      {
        inventoryTrackingEnabled: posRuntime.operationalRules.trackInventoryOnSale,
      },
      {
        scheduleDocumentAuthorization(task) {
          after(async () => {
            await authorizePendingSaleDocument(task);
          });
        },
      },
    );

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message = error instanceof Error ? error.message : "No se pudo procesar checkout";
    return fail(message, 400);
  }
}
