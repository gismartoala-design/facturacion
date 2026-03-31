import { after } from "next/server";
import { z } from "zod";

import { ensureDefaultBusiness, getBusinessContextById } from "@/core/business/business.service";
import { getActiveCashSession } from "@/core/cash-management/cash-session.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { resolveBillingRuntime } from "@/modules/billing/policies/resolve-billing-runtime";
import { authorizePendingSaleDocument } from "@/modules/billing/services/sale-document-authorization.service";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";
import { resolveCashRuntime } from "@/modules/cash-management/policies/resolve-cash-runtime";
import { runPosCheckout } from "@/modules/pos/services/pos-checkout.service";

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
      createdById:
        typeof payload?.createdById === "string" ? payload.createdById : session.sub,
    };
    const billingRuntime = resolveBillingRuntime({
      blueprint: business.blueprint,
      taxProfile: business.taxProfile,
    });
    const posRuntime = resolvePosRuntime({
      blueprint: business.blueprint,
    });
    const cashRuntime = resolveCashRuntime(business.blueprint);

    if (!billingRuntime.capabilities.electronicBilling) {
      normalizedPayload.documentType = "NONE";
    }

    // Obtener sesión de caja activa antes del checkout si Cash Management está habilitado
    const activeCashSession = cashRuntime.enabled
      ? await getActiveCashSession(business.id, session.sub)
      : null;

    if (cashRuntime.enabled && cashRuntime.capabilities.sessionRequired && !activeCashSession) {
      return fail("Debes abrir una caja antes de registrar cobros en el POS", 400);
    }

    const result = await runPosCheckout(
      normalizedPayload,
      {
        inventoryTrackingEnabled: posRuntime.operationalRules.trackInventoryOnSale,
        businessId: business.id,
        cashSessionId: activeCashSession?.id ?? null,
        saleSource: "POS",
        collectionRegisteredById: session.sub,
        createImmediateCollections: true,
      },
      {
        scheduleDocumentAuthorization(task) {
          after(async () => {
            await authorizePendingSaleDocument(task);
          });
        },
      },
    );

    return ok(
      {
        ...result,
        business: {
          id: business.id,
          name: business.name,
          legalName: business.legalName,
          ruc: business.ruc,
          address: business.address,
          phone: business.phone,
          email: business.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Payload invalido", 400, error.flatten());
    }

    const message =
      error instanceof Error ? error.message : "No se pudo procesar checkout POS";
    return fail(message, 400);
  }
}
