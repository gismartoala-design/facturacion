"use client";

import { PageErrorState } from "@/shared/states/page-error-state";
import { PurchaseRegistrationSection } from "../components/purchase-registration-section";
import { usePurchaseRegistrationPage } from "../hooks/use-purchase-registration-page";
import type { Supplier } from "../../suppliers/types";
import type { Product } from "@/shared/dashboard/types";

type PurchaseRegistrationPageProps = {
  suppliers: Supplier[];
  products: Product[];
  initialError?: string | null;
};

export function PurchaseRegistrationPage({
  suppliers,
  products,
  initialError = null,
}: PurchaseRegistrationPageProps) {
  const page = usePurchaseRegistrationPage({
    initialSuppliers: suppliers,
    initialProducts: products,
    initialPurchases: [],
  });

  if (initialError) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <PurchaseRegistrationSection
      suppliers={page.suppliers}
      products={page.products}
      form={page.form}
      setForm={page.setForm}
      draft={page.draft}
      draftError={page.draftError}
      supplierIdSearch={page.supplierIdSearch}
      selectedSupplier={page.selectedSupplier}
      selectedDraftProduct={page.selectedDraftProduct}
      lineRows={page.lineRows}
      saving={page.saving}
      totals={page.totals}
      onSupplierSelect={page.handleSupplierSelect}
      onSupplierIdSearch={page.handleSupplierIdSearch}
      onUpdateDraft={page.updateDraft}
      onSelectDraftProduct={page.selectDraftProduct}
      onSearchDraftByCode={page.searchDraftByCode}
      onCommitDraftLine={page.commitDraftLine}
      onRemoveLine={page.removeLine}
      onSubmit={page.handleSubmit}
    />
  );
}
