import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSalesByProductReport } from "@/core/reports/sales-by-product-report.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesByProductPage } from "@/modules/reports/sales-by-product/page/sales-by-product-page";
import type { SalesByProductReportResponse } from "@/modules/reports/sales-by-product/page/sales-by-product-view-model";

export const metadata: Metadata = {
  title: "Ventas por Producto",
  description:
    "Reporte analitico para identificar los productos con mayor rotacion y facturacion.",
};

export default async function SalesByProductRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sellerId?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialReport: SalesByProductReportResponse | null = null;
  let initialError: string | null = null;

  try {
    const filters = await searchParams;
    initialReport = await getSalesByProductReport(prisma, {
      businessId: business.id,
      from: filters.from,
      to: filters.to,
      sellerId: session.role === "SELLER" ? session.sub : filters.sellerId ?? null,
      sellerLocked: session.role === "SELLER",
    });
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el reporte de ventas por producto";
  }

  return (
    <SalesByProductPage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
