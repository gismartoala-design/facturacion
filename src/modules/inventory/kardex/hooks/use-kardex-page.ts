"use client";

import { useMemo, useState } from "react";

import type { KardexEntry, KardexMovementType } from "../types";

export type KardexMovementFilter = "ALL" | KardexMovementType;

type UseKardexPageOptions = {
  initialEntries: KardexEntry[];
};

function resolveDateRange(dateFrom: string, dateTo: string) {
  return {
    from: dateFrom ? new Date(`${dateFrom}T00:00:00`) : null,
    to: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null,
  };
}

export function useKardexPage({ initialEntries }: UseKardexPageOptions) {
  const [selectedProductId, setSelectedProductId] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [movementFilter, setMovementFilter] =
    useState<KardexMovementFilter>("ALL");

  const productOptions = useMemo(() => {
    return Array.from(
      new Map(
        initialEntries.map((entry) => [
          entry.productId,
          {
            productId: entry.productId,
            label: `${entry.productCode} · ${entry.productName}`,
          },
        ]),
      ).values(),
    ).sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [initialEntries]);

  const entriesAfterBaseFilters = useMemo(() => {
    const dateRange = resolveDateRange(dateFrom, dateTo);

    return initialEntries.filter((entry) => {
      const createdAt = new Date(entry.createdAt);

      const matchesProduct =
        selectedProductId === "ALL" || entry.productId === selectedProductId;

      if (!matchesProduct) {
        return false;
      }

      if (dateRange.from && createdAt < dateRange.from) {
        return false;
      }

      if (dateRange.to && createdAt > dateRange.to) {
        return false;
      }

      return true;
    });
  }, [dateFrom, dateTo, initialEntries, selectedProductId]);

  const filteredEntries = useMemo(() => {
    return entriesAfterBaseFilters.filter((entry) => {

      if (movementFilter === "ALL") {
        return true;
      }

      return entry.movementType === movementFilter;
    });
  }, [entriesAfterBaseFilters, movementFilter]);

  function clearFilters() {
    setSelectedProductId("ALL");
    setDateFrom("");
    setDateTo("");
    setMovementFilter("ALL");
  }

  const baseSummary = {
    total: entriesAfterBaseFilters.length,
    incomes: entriesAfterBaseFilters.filter((entry) => entry.movementType === "IN")
      .length,
    outcomes: entriesAfterBaseFilters.filter((entry) => entry.movementType === "OUT")
      .length,
    adjustments: entriesAfterBaseFilters.filter(
      (entry) => entry.movementType === "ADJUSTMENT",
    ).length,
  };

  return {
    entries: filteredEntries,
    productOptions,
    selectedProductId,
    dateFrom,
    dateTo,
    movementFilter,
    setDateFrom,
    setDateTo,
    setMovementFilter,
    setSelectedProductId,
    clearFilters,
    summary: {
      total: baseSummary.total,
      visible: filteredEntries.length,
      incomes: baseSummary.incomes,
      outcomes: baseSummary.outcomes,
      adjustments: baseSummary.adjustments,
    },
  };
}
