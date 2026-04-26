"use client";

import Stack from "@mui/material/Stack";

import type { Product, StockItem } from "@/shared/dashboard/types";
import { PageErrorState } from "@/shared/states/page-error-state";

import { InventoryAdjustmentDialog } from "../components/inventory-adjustment-dialog";
import { InventoryAdjustmentSection } from "../components/inventory-adjustment-section";
import { useInventoryAdjustmentPage } from "../hooks/use-inventory-adjustment-page";

type InventoryAdjustmentPageProps = {
  initialProducts: Product[];
  initialStock: StockItem[];
  initialError?: string | null;
};

export function InventoryAdjustmentPage({
  initialProducts,
  initialStock,
  initialError = null,
}: InventoryAdjustmentPageProps) {
  const page = useInventoryAdjustmentPage({
    initialProducts,
    initialStock,
  });

  if (initialError) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <Stack spacing={2}>
      <InventoryAdjustmentSection
        stock={page.stock}
        onOpenStockModal={page.openDialog}
      />

      <InventoryAdjustmentDialog
        isOpen={page.isDialogOpen}
        products={page.products}
        adjustment={page.adjustment}
        setAdjustment={page.setAdjustment}
        saving={page.saving}
        onClose={page.closeDialog}
        onSubmit={page.handleSubmit}
      />
    </Stack>
  );
}
