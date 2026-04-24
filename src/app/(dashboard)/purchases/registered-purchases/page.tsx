import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listProducts } from "@/core/inventory/inventory.service";
import { listPurchases } from "@/core/purchases/purchase.service";
import { listSuppliers } from "@/core/purchases/supplier.service";
import { getSession } from "@/lib/auth";
import { PurchaseRegistrationPage } from "@/modules/purchases/purchases/pages/purchase-registration-page";
import type { Purchase } from "@/modules/purchases/purchases/types";
import type { Supplier } from "@/modules/purchases/suppliers/types";
import type { Product } from "@/shared/dashboard/types";

export const metadata: Metadata = {
  title: "Compras",
  description: "Listado de compras registradas.",
};

export default async function PurchasesRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let suppliers: Supplier[] = [];
  let products: Product[] = [];
  let purchases: Purchase[] = [];
  let initialError: string | null = null;

  try {
    if (session.businessId) {
      [suppliers, products, purchases] = await Promise.all([
        listSuppliers(session.businessId),
        listProducts(),
        listPurchases(session.businessId),
      ]);
    }
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudieron cargar compras";
  }

  return (
    <PurchaseRegistrationPage
      suppliers={suppliers}
      products={products}
      purchases={purchases}
      initialError={initialError}
      mode="list"
    />
  );
}
