import { z } from "zod";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSalesReport } from "@/core/reports/sales-report.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const reportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  sellerId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const url = new URL(request.url);
    const parsed = reportQuerySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      sellerId: url.searchParams.get("sellerId") ?? undefined,
    });

    const report = await getSalesReport(prisma, {
      businessId: business.id,
      from: parsed.from,
      to: parsed.to,
      sellerId: session.role === "SELLER" ? session.sub : parsed.sellerId,
      sellerLocked: session.role === "SELLER",
    });

    return ok(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Filtros invalidos", 400, error.flatten());
    }

    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el reporte de ventas",
      400,
    );
  }
}
