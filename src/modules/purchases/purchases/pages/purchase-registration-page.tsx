"use client";

import Stack from "@mui/material/Stack";

import { PageErrorState } from "@/shared/states/page-error-state";
import { PurchaseRegistrationSection } from "../components/purchase-registration-section";
import {
  PurchasesSection,
  VoidPurchaseDialog,
} from "../components/purchases-section";
import { usePurchaseRegistrationPage } from "../hooks/use-purchase-registration-page";
import type { PurchaseRegistrationBootstrap } from "../types";

type PurchaseRegistrationPageProps = PurchaseRegistrationBootstrap & {
  initialError?: string | null;
  mode?: "register" | "list";
};

export function PurchaseRegistrationPage({
  suppliers,
  products,
  purchases,
  initialError = null,
  mode = "register",
}: PurchaseRegistrationPageProps) {
  const purchasePage = usePurchaseRegistrationPage({
    initialSuppliers: suppliers,
    initialProducts: products,
    initialPurchases: purchases,
  });

  if (initialError) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <Stack spacing={2.5}>
      {mode === "register" ? (
        <PurchaseRegistrationSection
          suppliers={purchasePage.suppliers}
          products={purchasePage.products}
          form={purchasePage.form}
          setForm={purchasePage.setForm}
          saving={purchasePage.saving}
          totals={purchasePage.totals}
          onSelectProduct={purchasePage.selectProduct}
          onUpdateLine={purchasePage.updateLine}
          onAddLine={purchasePage.addLine}
          onRemoveLine={purchasePage.removeLine}
          onSubmit={purchasePage.handleSubmit}
        />
      ) : null}

      {mode === "list" ? (
        <PurchasesSection
          purchases={purchasePage.purchases}
          onVoidPurchase={purchasePage.openVoidDialog}
        />
      ) : null}

      <VoidPurchaseDialog
        isOpen={purchasePage.voidingPurchase !== null}
        purchase={purchasePage.voidingPurchase}
        reason={purchasePage.voidReason}
        saving={purchasePage.voiding}
        onReasonChange={purchasePage.setVoidReason}
        onClose={purchasePage.closeVoidDialog}
        onConfirm={() => {
          void purchasePage.handleVoidPurchase();
        }}
      />
    </Stack>
  );
}
