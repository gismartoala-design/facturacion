import { NextResponse } from "next/server";

import { getBusinessLogoAsset, storeBusinessLogo } from "@/core/business/business-logo.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { message: "No autenticado" } },
        { status: 401 },
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      select: {
        logoStorageKey: true,
      },
    });

    const asset = await getBusinessLogoAsset(business?.logoStorageKey);
    if (!asset) {
      return new Response(null, { status: 404 });
    }

    return new Response(asset.bytes, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el logo",
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
          error: { message: "Solo un administrador puede actualizar el logo" },
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { message: "No se recibio ningun archivo" } },
        { status: 400 },
      );
    }

    if (file.type !== "image/png") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "El logo debe cargarse como PNG",
          },
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "El logo supera el limite de 5 MB" },
        },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const storedLogo = await storeBusinessLogo({
      businessId: session.businessId,
      bytes,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: storedLogo.logoUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo actualizar el logo",
        },
      },
      { status: 400 },
    );
  }
}
