import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listProducts, listStock } from "@/core/inventory/inventory.service";
import { getSession } from "@/lib/auth";
import { InventoryAdjustmentPage } from "@/modules/inventory/inventory-adjustment/pages/inventory-adjustment-page";
import type { Product, StockItem } from "@/shared/dashboard/types";

export const metadata: Metadata = {
  title: "Ajustes de Inventario",
  description: "Entradas, salidas y correcciones manuales sobre stock.",
};

export default async function InventoryAdjustmentRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialStock: StockItem[] = [];
  let initialProducts: Product[] = [];
  let initialError: string | null = null;

  try {
    const [stock, products] = await Promise.all([listStock(), listProducts()]);
    initialStock = stock;
    initialProducts = products.filter((product) => product.tipoProducto === "BIEN");
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudo cargar inventario";
  }

  return (
    <InventoryAdjustmentPage
      initialProducts={initialProducts}
      initialStock={initialStock}
      initialError={initialError}
    />
  );
}
