import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSalesReport } from "@/core/reports/sales-report.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesPeriodPage } from "@/modules/reports/sales-period/page/sales-period-page";
import type { SalesPeriodReportResponse } from "@/modules/reports/sales-period/page/sales-period-view-model";

export const metadata: Metadata = {
  title: "Ventas por Periodo",
  description:
    "Reporte transaccional de ventas por periodo con filtros de rango de fechas y vendedor.",
};

export default async function SalesPeriodRoutePage({
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

  let initialReport: SalesPeriodReportResponse | null = null;
  let initialError: string | null = null;

  try {
    const filters = await searchParams;
    initialReport = await getSalesReport(prisma, {
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
        : "No se pudo cargar el reporte de ventas por periodo";
  }

  return (
    <SalesPeriodPage initialReport={initialReport} initialError={initialError} />
  );
}
