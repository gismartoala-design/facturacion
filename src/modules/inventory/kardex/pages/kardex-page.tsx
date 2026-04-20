"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

import { KardexSection } from "../components/kardex-section";
import { useKardexPage } from "../hooks/use-kardex-page";
import type { KardexEntry } from "../types";

type KardexPageProps = {
  initialEntries: KardexEntry[];
  initialError?: string | null;
};

export function KardexPage({
  initialEntries,
  initialError = null,
}: KardexPageProps) {
  const kardexPage = useKardexPage({
    initialEntries,
  });

  return (
    <Stack spacing={2}>
      {initialError ? (
        <Alert severity="error" variant="outlined">
          {initialError}
        </Alert>
      ) : null}

      <KardexSection
        entries={kardexPage.entries}
        selectedProductId={kardexPage.selectedProductId}
        onSelectedProductIdChange={kardexPage.setSelectedProductId}
        dateFrom={kardexPage.dateFrom}
        onDateFromChange={kardexPage.setDateFrom}
        dateTo={kardexPage.dateTo}
        onDateToChange={kardexPage.setDateTo}
        movementFilter={kardexPage.movementFilter}
        onMovementFilterChange={kardexPage.setMovementFilter}
        onClearFilters={kardexPage.clearFilters}
        productOptions={kardexPage.productOptions}
        summary={kardexPage.summary}
      />
    </Stack>
  );
}
