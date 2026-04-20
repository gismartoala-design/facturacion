import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSalesByCustomerReport } from "@/core/reports/sales-by-customer-report.service";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SalesByCustomerPage } from "@/modules/reports/sales-by-customer/page/sales-by-customer-page";
import type { SalesByCustomerReportResponse } from "@/modules/reports/sales-by-customer/page/sales-by-customer-view-model";

export const metadata: Metadata = {
  title: "Ventas por Cliente",
  description:
    "Ranking comercial para identificar que clientes compran mas dentro de un periodo.",
};

export default async function SalesByCustomerRoutePage({
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

  let initialReport: SalesByCustomerReportResponse | null = null;
  let initialError: string | null = null;

  try {
    const filters = await searchParams;
    initialReport = await getSalesByCustomerReport(prisma, {
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
        : "No se pudo cargar el reporte de ventas por cliente";
  }

  return (
    <SalesByCustomerPage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
