import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
  updateBusinessSettings,
} from "@/core/business/business.service";
import { updateBusinessSettingsSchema } from "@/core/business/schemas";
import { getSession } from "@/lib/auth";
import { resolveBillingRuntime } from "@/modules/billing/policies/resolve-billing-runtime";
import { posBlueprintToEditorValue } from "@/modules/pos/policies/pos-policy-editor";
import { resolvePosRuntime } from "@/modules/pos/policies/resolve-pos-runtime";

function enrichBusinessContext<
  T extends {
    blueprint: Parameters<typeof resolveBillingRuntime>[0]["blueprint"];
    taxProfile: Parameters<typeof resolveBillingRuntime>[0]["taxProfile"];
    posSettings?: unknown;
  },
>(business: T) {
  const { blueprint } = business;
  const businessData = { ...business } as Record<string, unknown>;
  delete businessData.blueprint;
  delete businessData.posSettings;

  return {
    ...businessData,
    billingRuntime: resolveBillingRuntime({
      blueprint,
      taxProfile: business.taxProfile,
    }),
    posPolicy: posBlueprintToEditorValue(blueprint),
    posRuntime: resolvePosRuntime({
      blueprint,
    }),
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { message: "No autenticado" } },
        { status: 401 },
      );
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    return NextResponse.json({
      success: true,
      data: enrichBusinessContext(business),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la configuracion de la compania",
        },
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { message: "No autenticado" } },
        { status: 401 },
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Solo un administrador puede actualizar la compania" },
        },
        { status: 403 },
      );
    }

    const raw = (await request.json()) as unknown;
    const input = updateBusinessSettingsSchema.parse(raw);
    const business = session.businessId
      ? await updateBusinessSettings(session.businessId, input)
      : await updateBusinessSettings((await ensureDefaultBusiness()).id, input);

    return NextResponse.json({
      success: true,
      data: enrichBusinessContext(business),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.issues[0]?.message ?? "Datos invalidos" },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo actualizar la compania",
        },
      },
      { status: 400 },
    );
  }
}
