import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listStock } from "@/core/inventory/inventory.service";
import { listStockTakingSummaries } from "@/core/inventory/stock-taking.service";
import { getSession } from "@/lib/auth";
import { StockTakingPage } from "@/modules/inventory/stock-taking/pages/stock-taking-page";
import type { StockTakingSummary } from "@/modules/inventory/stock-taking/types";
import type { StockItem } from "@/shared/dashboard/types";

export const metadata: Metadata = {
  title: "Toma de Inventario",
  description: "Conteo fisico y conciliacion de existencias.",
};

export default async function InventoryStockTakingRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialStock: StockItem[] = [];
  let initialTakings: StockTakingSummary[] = [];
  let initialError: string | null = null;

  const [stockResult, takingsResult] = await Promise.allSettled([
    listStock(),
    listStockTakingSummaries(session),
  ]);

  if (stockResult.status === "fulfilled") {
    initialStock = stockResult.value;
  }

  if (takingsResult.status === "fulfilled") {
    initialTakings = takingsResult.value;
  }

  const errors = [stockResult, takingsResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : "No se pudo cargar la toma de inventario",
    );

  if (errors.length > 0) {
    initialError = errors.join(" | ");
  }

  return (
    <StockTakingPage
      initialStock={initialStock}
      initialTakings={initialTakings}
      initialError={initialError}
    />
  );
}
