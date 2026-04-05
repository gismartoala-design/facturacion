import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import {
  getSaleInvoicePrintData,
} from "@/modules/billing/services/sale-document-render.service";
import { buildSaleInvoicePdfBuffer } from "@/modules/billing/services/sale-invoice-pdf.service";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return fail("No autenticado", 401);
    }

    const business = session.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const { id } = await params;
    const sale = await getSaleInvoicePrintData(id, business.id);
    const pdfBuffer = await buildSaleInvoicePdfBuffer(
      id,
      business.id,
      business.logoStorageKey,
    );

    return new Response(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="venta-${sale.documentNumber ?? sale.saleNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar la impresion de la venta";
    return fail(message, 500);
  }
}
