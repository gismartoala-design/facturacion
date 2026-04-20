import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listProducts } from "@/core/inventory/inventory.service";
import { getSession } from "@/lib/auth";
import { ProductsPage } from "@/modules/inventory/products/pages/products-page";
import type { Product } from "@/shared/dashboard/types";

export const metadata: Metadata = {
  title: "Productos",
  description: "Registro y mantenimiento del catalogo base de productos.",
};

export default async function InventoryProductsRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialProducts: Product[] = [];
  let initialError: string | null = null;

  try {
    initialProducts = await listProducts();
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudieron cargar productos";
  }

  return (
    <ProductsPage
      initialProducts={initialProducts}
      initialError={initialError}
    />
  );
}
