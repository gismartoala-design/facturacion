"use client";

import Stack from "@mui/material/Stack";

import type { StockItem } from "@/shared/dashboard/types";
import type { StockTakingSummary } from "@/modules/inventory/stock-taking/types";
import { PageErrorState } from "@/shared/states/page-error-state";

import { StockTakingSection } from "../components/stock-taking-section";
import { useStockTakingPage } from "../hooks/use-stock-taking-page";

type StockTakingPageProps = {
  initialStock: StockItem[];
  initialTakings: StockTakingSummary[];
  initialError?: string | null;
};

export function StockTakingPage({
  initialStock,
  initialTakings,
  initialError = null,
}: StockTakingPageProps) {
  const stockTakingPage = useStockTakingPage({
    initialStock,
    initialTakings,
  });

  if (initialError && initialStock.length === 0 && initialTakings.length === 0) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <Stack spacing={2}>
      {initialError ? <PageErrorState message={initialError} /> : null}

      <StockTakingSection
        rows={stockTakingPage.filteredRows}
        search={stockTakingPage.search}
        onSearchChange={stockTakingPage.setSearch}
        filter={stockTakingPage.filter}
        onFilterChange={stockTakingPage.setFilter}
        notes={stockTakingPage.notes}
        onNotesChange={stockTakingPage.setNotes}
        onCountChange={stockTakingPage.updateCount}
        onCountFocus={stockTakingPage.startEditingCount}
        onCountBlur={stockTakingPage.finishEditingCount}
        onFillWithSystemStock={stockTakingPage.fillWithSystemStock}
        onClearCounts={stockTakingPage.clearCounts}
        onStartNewTaking={stockTakingPage.startNewTaking}
        onSaveDraft={stockTakingPage.saveDraft}
        onApplyTaking={stockTakingPage.applyActiveTaking}
        onOpenTaking={stockTakingPage.openTaking}
        takings={stockTakingPage.takings}
        activeTaking={stockTakingPage.activeTaking}
        saving={stockTakingPage.saving}
        loadingTakingId={stockTakingPage.loadingTakingId}
        canEdit={stockTakingPage.canEdit}
        canSaveDraft={stockTakingPage.canSaveDraft}
        canApplyTaking={stockTakingPage.canApplyTaking}
        draftDirty={stockTakingPage.draftDirty}
        summary={stockTakingPage.summary}
      />
    </Stack>
  );
}
