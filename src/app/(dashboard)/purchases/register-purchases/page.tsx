import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listProducts } from "@/core/inventory/inventory.service";
import { listSuppliers } from "@/core/purchases/supplier.service";
import { getSession } from "@/lib/auth";
import { PurchaseRegistrationPage } from "@/modules/purchases/purchase-records/pages/purchase-registration-page";
import type { Supplier } from "@/modules/purchases/suppliers/types";
import type { Product } from "@/shared/dashboard/types";

export const metadata: Metadata = {
  title: "Registrar compra",
  description: "Registro basico de compras con ingreso de inventario.",
};

export default async function NewPurchaseRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let suppliers: Supplier[] = [];
  let products: Product[] = [];
  let initialError: string | null = null;

  try {
    if (session.businessId) {
      [suppliers, products] = await Promise.all([
        listSuppliers(session.businessId),
        listProducts(),
      ]);
    }
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar datos para registrar compras";
  }

  return (
    <PurchaseRegistrationPage
      suppliers={suppliers}
      products={products}
      initialError={initialError}
    />
  );
}
