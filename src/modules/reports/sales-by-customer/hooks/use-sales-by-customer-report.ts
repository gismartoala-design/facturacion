"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useMemo, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { fetchSalesByCustomerReport } from "@/modules/reports/sales-by-customer/services/sales-by-customer-client";

import type {
  SalesByCustomerFiltersForm,
  SalesByCustomerReportResponse,
  SalesByCustomerRow,
} from "../page/sales-by-customer-view-model";

function escapeCsvCell(value: string | number) {
  const serialized = String(value ?? "");
  if (
    !serialized.includes(",") &&
    !serialized.includes("\"") &&
    !serialized.includes("\n")
  ) {
    return serialized;
  }

  return `"${serialized.replaceAll("\"", "\"\"")}"`;
}

function buildSalesByCustomerCsv(rows: SalesByCustomerRow[]) {
  const header = [
    "Cliente",
    "Identificacion",
    "Compras",
    "Total comprado",
    "Ticket promedio",
    "Ultima compra",
    "Participacion %",
  ];

  const body = rows.map((row) =>
    [
      row.customerName,
      row.identification,
      row.salesCount,
      row.total.toFixed(2),
      row.averageTicket.toFixed(2),
      row.lastPurchaseAt,
      row.participationPercent.toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function createFiltersFromReport(
  report: SalesByCustomerReportResponse | null,
): SalesByCustomerFiltersForm {
  return {
    from: report?.filters.from ?? "",
    to: report?.filters.to ?? "",
    sellerId: report?.filters.sellerId ?? "",
  };
}

export function useSalesByCustomerReport(params: {
  initialReport: SalesByCustomerReportResponse | null;
  initialError?: string | null;
}) {
  const { initialReport, initialError = null } = params;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<SalesByCustomerReportResponse | null>(initialReport);
  const [filters, setFilters] = useState<SalesByCustomerFiltersForm>(
    createFiltersFromReport(initialReport),
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!initialReport && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startRoutingTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    const query = searchParams.toString();

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const nextReport = await fetchSalesByCustomerReport(query);
        if (!mounted) return;

        startTransition(() => {
          setReport(nextReport);
          setFilters(createFiltersFromReport(nextReport));
        });
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de ventas por cliente",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (initialReport && !searchParams.toString()) {
      return () => {
        mounted = false;
      };
    }

    void loadReport();

    return () => {
      mounted = false;
    };
  }, [initialReport, searchParams]);

  const filteredRows = useMemo(() => {
    if (!report) return [];
    const normalized = search.trim().toLowerCase();
    if (!normalized) return report.rows;

    return report.rows.filter((row) =>
      [row.customerName, row.identification]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [report, search]);

  const selectedSellerName = useMemo(() => {
    if (!report?.filters.sellerId) return "Todos los vendedores";
    return (
      report.sellerOptions.find((seller) => seller.id === report.filters.sellerId)
        ?.name ?? "Vendedor filtrado"
    );
  }, [report]);

  function exportVisibleRows() {
    if (!filteredRows.length) {
      setError("No hay filas visibles para exportar");
      return;
    }

    const csv = buildSalesByCustomerCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `reporte-ventas-cliente-${filters.from || "desde"}-${filters.to || "hasta"}.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }

    if (filters.sellerId) {
      params.set("sellerId", filters.sellerId);
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startRoutingTransition(() => {
      router.replace(newUrl);
    });
  }

  function resetFilters() {
    startRoutingTransition(() => {
      router.replace(pathname);
    });
  }

  return {
    report,
    filters,
    setFilters,
    search,
    setSearch,
    loading,
    error,
    isPending,
    filteredRows,
    selectedSellerName,
    exportVisibleRows,
    applyFilters,
    resetFilters,
  };
}
