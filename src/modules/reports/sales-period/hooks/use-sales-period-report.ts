"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useMemo, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  fetchSalePeriodDetail,
  fetchSalesPeriodReport,
} from "@/modules/reports/sales-period/services/sales-period-client";
import { PAYMENT_METHODS } from "@/shared/dashboard/types";

import type {
  SalePeriodDetailResponse,
  SalesPeriodFiltersForm,
  SalesPeriodReportResponse,
  SalesPeriodRow,
} from "../page/sales-period-view-model";

function paymentMethodLabel(code: string) {
  return PAYMENT_METHODS.find((method) => method.code === code)?.label ?? code;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

function buildSalesCsv(rows: SalesPeriodRow[]) {
  const header = [
    "Venta",
    "Fecha",
    "Cliente",
    "Vendedor",
    "Documento",
    "Pagos",
    "Lineas",
    "Subtotal",
    "IVA",
    "Descuento",
    "Total",
  ];

  const body = rows.map((row) =>
    [
      row.saleNumber,
      formatDateTime(row.createdAt),
      row.customerName,
      row.sellerName,
      row.documentLabel,
      row.paymentMethods.map(paymentMethodLabel).join(" | "),
      row.itemCount,
      row.subtotal.toFixed(2),
      row.taxTotal.toFixed(2),
      row.discountTotal.toFixed(2),
      row.total.toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function createFiltersFromReport(
  report: SalesPeriodReportResponse | null,
): SalesPeriodFiltersForm {
  return {
    from: report?.filters.from ?? "",
    to: report?.filters.to ?? "",
    sellerId: report?.filters.sellerId ?? "",
  };
}

export function useSalesPeriodReport(params: {
  initialReport: SalesPeriodReportResponse | null;
  initialError?: string | null;
}) {
  const { initialReport, initialError = null } = params;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<SalesPeriodReportResponse | null>(initialReport);
  const [filters, setFilters] = useState<SalesPeriodFiltersForm>(
    createFiltersFromReport(initialReport),
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!initialReport && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedSaleDetail, setSelectedSaleDetail] =
    useState<SalePeriodDetailResponse | null>(null);
  const [isPending, startRoutingTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    const query = searchParams.toString();

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const nextReport = await fetchSalesPeriodReport(query);
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
            : "No se pudo cargar el reporte de ventas por periodo",
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
    if (!normalized) return report.salesRows;

    return report.salesRows.filter((row) => {
      const payments = row.paymentMethods.map(paymentMethodLabel).join(" ");
      return (
        row.saleNumber.toLowerCase().includes(normalized) ||
        row.customerName.toLowerCase().includes(normalized) ||
        row.sellerName.toLowerCase().includes(normalized) ||
        row.documentLabel.toLowerCase().includes(normalized) ||
        payments.toLowerCase().includes(normalized)
      );
    });
  }, [report, search]);

  const visibleTotals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          acc.subtotal += row.subtotal;
          acc.taxTotal += row.taxTotal;
          acc.discountTotal += row.discountTotal;
          acc.total += row.total;
          acc.salesCount += 1;
          acc.lineCount += row.itemCount;
          return acc;
        },
        {
          subtotal: 0,
          taxTotal: 0,
          discountTotal: 0,
          total: 0,
          salesCount: 0,
          lineCount: 0,
        },
      ),
    [filteredRows],
  );

  const selectedSellerName = useMemo(() => {
    if (!report?.filters.sellerId) return "Todos los vendedores";
    return (
      report.sellerOptions.find((seller) => seller.id === report.filters.sellerId)
        ?.name ?? "Vendedor filtrado"
    );
  }, [report]);

  async function openSaleDetail(saleId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await fetchSalePeriodDetail(saleId);
      setSelectedSaleDetail(detail);
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle de la venta",
      );
      setSelectedSaleDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function printSaleById(saleId: string) {
    try {
      const printWindow = window.open(
        `/api/v1/sales/${saleId}/print`,
        "_blank",
        "noopener,noreferrer",
      );

      if (!printWindow) {
        throw new Error("El navegador bloqueo la ventana de impresion");
      }
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : "No se pudo imprimir la venta",
      );
    }
  }

  function exportVisibleRows() {
    if (!filteredRows.length) {
      setError("No hay filas visibles para exportar");
      return;
    }

    const csv = buildSalesCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `reporte-ventas-periodo-${filters.from || "desde"}-${filters.to || "hasta"}.csv`;

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
    detailOpen,
    setDetailOpen,
    detailLoading,
    detailError,
    setDetailError,
    selectedSaleDetail,
    isPending,
    filteredRows,
    visibleTotals,
    selectedSellerName,
    openSaleDetail,
    printSaleById,
    exportVisibleRows,
    applyFilters,
    resetFilters,
    paymentMethodLabel,
  };
}
