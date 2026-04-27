import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listPurchases } from "@/core/purchases/purchase.service";
import { getSession } from "@/lib/auth";
import { PurchaseListPage } from "@/modules/purchases/purchase-records/pages/purchase-list-page";
import type { Purchase } from "@/modules/purchases/purchase-records/types";

export const metadata: Metadata = {
  title: "Compras",
  description: "Listado de compras registradas.",
};

export default async function PurchasesRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let purchases: Purchase[] = [];
  let initialError: string | null = null;

  try {
    if (session.businessId) {
      purchases = await listPurchases(session.businessId);
    }
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudieron cargar compras";
  }

  return (
    <PurchaseListPage
      purchases={purchases}
      initialError={initialError}
    />
  );
}
