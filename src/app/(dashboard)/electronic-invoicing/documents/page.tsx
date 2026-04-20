"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useDeferredValue, useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { InvoiceDetailModal } from "@/shared/dashboard/modals";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/shared/dashboard/types";
import { BillingSection } from "@/modules/billing/components/billing-section";

export type SriStatusFilter = "NOT_AUTHORIZED" | "ALL" | "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
export type SaleStatusFilter = "ALL" | "COMPLETED" | "CANCELLED";
export type RetryFilter = "ALL" | "RETRYABLE" | "NON_RETRYABLE";

type SriToast = {
  message: string;
  severity: "success" | "error" | "info";
};

export default function SriPage() {
  const [invoices, setInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCancelling, setDetailCancelling] = useState(false);
  const [toast, setToast] = useState<SriToast | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SriInvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SriStatusFilter>("NOT_AUTHORIZED");
  const [saleStatusFilter, setSaleStatusFilter] = useState<SaleStatusFilter>("ALL");
  const [retryFilter, setRetryFilter] = useState<RetryFilter>("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const deferredSearch = useDeferredValue(search);

  async function loadInvoices() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (saleStatusFilter !== "ALL") {
        params.set("saleStatus", saleStatusFilter);
      }

      if (retryFilter !== "ALL") {
        params.set("retryable", retryFilter);
      }

      if (deferredSearch.trim()) {
        params.set("search", deferredSearch.trim());
      }

      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const result = await fetchJson<PaginatedResult<SriInvoice>>(`/api/v1/sri-invoices?${params.toString()}`);
      setInvoices(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar facturas SRI",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, saleStatusFilter, retryFilter, deferredSearch, dateFrom, dateTo]);

  function handleFilterChange(value: string) {
    setStatusFilter(value as SriStatusFilter);
    setPage(1);
  }

  function handleSaleStatusFilterChange(value: string) {
    setSaleStatusFilter(value as SaleStatusFilter);
    setPage(1);
  }

  function handleRetryFilterChange(value: string) {
    setRetryFilter(value as RetryFilter);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    setPage(1);
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    setPage(1);
  }

  function handleResetFilters() {
    setStatusFilter("NOT_AUTHORIZED");
    setSaleStatusFilter("ALL");
    setRetryFilter("ALL");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function getRetryableInvoiceIds(source: SriInvoice[]) {
    return source
      .filter(
        (invoice) =>
          (invoice.status === "PENDING_SRI" || invoice.status === "ERROR") &&
          invoice.saleStatus !== "CANCELLED",
      )
      .map((invoice) => invoice.id);
  }

  async function onRetry(invoiceId: string) {
    setSaving(true);
    setToast(null);

    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/retry`, { method: "POST" });
      setToast({ message: "Reintento ejecutado", severity: "success" });
      await loadInvoices();
    } catch (error) {
      setToast({
        message:
          error instanceof Error ? error.message : "No se pudo reintentar",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onRetryVisible() {
    const invoiceIds = getRetryableInvoiceIds(invoices);

    if (invoiceIds.length === 0) {
      setToast({
        message: "No hay facturas visibles pendientes para reintentar",
        severity: "info",
      });
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const result = await fetchJson<{
        processed: number;
        succeeded: number;
        failed: number;
        results: Array<{
          id: string;
          ok: boolean;
          status: string | null;
          retryCount: number | null;
          message: string;
        }>;
      }>("/api/v1/sri-invoices/retry", {
        method: "POST",
        body: JSON.stringify({ invoiceIds }),
      });

      const message =
        result.failed > 0
          ? `Reintentos ejecutados: ${result.succeeded} exitosos, ${result.failed} con error`
          : `Reintentos ejecutados sobre ${result.succeeded} factura${result.succeeded === 1 ? "" : "s"}`;

      setToast({
        message,
        severity: result.failed > 0 ? "info" : "success",
      });
      await loadInvoices();
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo ejecutar el reintento masivo",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onViewDetails(invoiceId: string) {
    setToast(null);
    setSelectedInvoice(null);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchJson<SriInvoiceDetail>(`/api/v1/sri-invoices/${invoiceId}`);
      setSelectedInvoice(detail);
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar detalle de factura",
        severity: "error",
      });
    } finally {
      setDetailLoading(false);
    }
  }

  async function onCancelSaleAndInvoice(invoiceId: string) {
    if (!window.confirm("Se anulara la venta y se revertira el stock. Esta accion no se puede deshacer. ¿Deseas continuar?")) {
      return;
    }

    setDetailCancelling(true);
    setToast(null);
    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/cancel`, { method: "POST" });
      setIsDetailOpen(false);
      setSelectedInvoice(null);
      setToast({
        message: "Venta/factura anulada correctamente",
        severity: "success",
      });
      await loadInvoices();
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo anular la venta/factura",
        severity: "error",
      });
    } finally {
      setDetailCancelling(false);
    }
  }

  return (
    <>
      <BillingSection
        loading={loading}
        invoices={invoices}
        pagination={{ page, limit: 10, total, totalPages }}
        statusFilter={statusFilter}
        saleStatusFilter={saleStatusFilter}
        retryFilter={retryFilter}
        search={search}
        dateFrom={dateFrom}
        dateTo={dateTo}
        saving={saving}
        onRetry={onRetry}
        onRetryVisible={onRetryVisible}
        onViewDetails={onViewDetails}
        onPageChange={setPage}
        onFilterChange={handleFilterChange}
        onSaleStatusFilterChange={handleSaleStatusFilterChange}
        onRetryFilterChange={handleRetryFilterChange}
        onSearchChange={handleSearchChange}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onResetFilters={handleResetFilters}
      />
      <InvoiceDetailModal
        isOpen={isDetailOpen}
        loading={detailLoading}
        cancelling={detailCancelling}
        invoice={selectedInvoice}
        onCancelSaleAndInvoice={onCancelSaleAndInvoice}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailLoading(false);
          setDetailCancelling(false);
          setSelectedInvoice(null);
        }}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4200}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setToast(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          elevation={0}
          variant="filled"
          severity={toast?.severity ?? "info"}
          onClose={() => setToast(null)}
          sx={{
            minWidth: 280,
            borderRadius: "16px",
            boxShadow: "0 18px 38px rgba(74, 60, 88, 0.18)",
          }}
        >
          {toast?.message ?? ""}
        </Alert>
      </Snackbar>
    </>
  );
}
