import { fetchJson } from "@/shared/dashboard/api";
import type { Product, StockAdjustmentForm, StockItem } from "@/shared/dashboard/types";

export async function fetchStockItems() {
  return fetchJson<StockItem[]>("/api/v1/stock");
}

export async function fetchInventoryProducts() {
  const products = await fetchJson<Product[]>("/api/v1/products");
  return products.filter((product) => product.tipoProducto === "BIEN");
}

export async function createInventoryAdjustment(adjustment: StockAdjustmentForm) {
  return fetchJson("/api/v1/stock/adjustments", {
    method: "POST",
    body: JSON.stringify({
      productId: adjustment.productId,
      movementType: adjustment.movementType,
      quantity: Number(adjustment.quantity),
      unitCost: adjustment.unitCost === "" ? undefined : Number(adjustment.unitCost),
    }),
  });
}
