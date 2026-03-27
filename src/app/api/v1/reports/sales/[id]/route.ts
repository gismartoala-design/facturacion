import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSaleReportDetail } from "@/core/reports/sales-report.service";
import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return fail("No autenticado", 401);

    const { id } = await context.params;
    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();

    const detail = await getSaleReportDetail(prisma, {
      businessId: business.id,
      saleId: id,
      sellerId: session.role === "SELLER" ? session.sub : null,
      sellerLocked: session.role === "SELLER",
    });

    return ok({
      ...detail,
      businessName: business.name,
    });
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el detalle de la venta",
      400,
    );
  }
}
