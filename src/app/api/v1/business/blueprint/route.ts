import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  ensureDefaultBusiness,
  updateBusinessBlueprint,
} from "@/core/business/business.service";
import { businessBlueprintSchema } from "@/core/platform/schemas";
import { getSession } from "@/lib/auth";

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
        { success: false, error: { message: "Solo un administrador puede actualizar la plataforma" } },
        { status: 403 },
      );
    }

    const raw = (await request.json()) as unknown;
    const blueprint = businessBlueprintSchema.parse(raw);
    const businessId = session.businessId ?? (await ensureDefaultBusiness()).id;
    const saved = await updateBusinessBlueprint(businessId, blueprint);

    return NextResponse.json({ success: true, data: { blueprint: saved } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { message: error.issues[0]?.message ?? "Datos invalidos" } },
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
              : "No se pudo actualizar la plataforma",
        },
      },
      { status: 400 },
    );
  }
}
