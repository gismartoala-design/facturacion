"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { useAppConfirm } from "@/components/providers/app-confirm-provider";
import { useAppNotifications } from "@/components/providers/app-notification-provider";
import { fetchJson } from "@/shared/dashboard/api";
import { InvoiceDetailModal } from "@/shared/dashboard/modals";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/shared/dashboard/types";
import { BillingSection } from "@/modules/billing/components/billing-section";

export type SriStatusFilter = "NOT_AUTHORIZED" | "ALL" | "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
export type SaleStatusFilter = "ALL" | "COMPLETED" | "CANCELLED";
export type RetryFilter = "ALL" | "RETRYABLE" | "NON_RETRYABLE";

export default function SriPage() {
  const confirm = useAppConfirm();
  const { error: showError, info, success } = useAppNotifications();
  const [invoices, setInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCancelling, setDetailCancelling] = useState(false);
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
      showError(
        error instanceof Error ? error.message : "No se pudo cargar facturas SRI",
      );
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

    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/retry`, { method: "POST" });
      success("Reintento ejecutado");
      await loadInvoices();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo reintentar");
    } finally {
      setSaving(false);
    }
  }

  async function onRetryVisible() {
    const invoiceIds = getRetryableInvoiceIds(invoices);

    if (invoiceIds.length === 0) {
      info("No hay facturas visibles pendientes para reintentar");
      return;
    }

    setSaving(true);

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

      if (result.failed > 0) {
        info(message);
      } else {
        success(message);
      }
      await loadInvoices();
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar el reintento masivo",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onViewDetails(invoiceId: string) {
    setSelectedInvoice(null);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchJson<SriInvoiceDetail>(`/api/v1/sri-invoices/${invoiceId}`);
      setSelectedInvoice(detail);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar detalle de factura",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function onCancelSaleAndInvoice(invoiceId: string) {
    const accepted = await confirm({
      title: "Anular venta y factura",
      message:
        "Se anulara la venta y se revertira el stock.\nEsta accion no se puede deshacer.",
      confirmLabel: "Anular venta",
      severity: "error",
      destructive: true,
    });
    if (!accepted) {
      return;
    }

    setDetailCancelling(true);
    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/cancel`, { method: "POST" });
      setIsDetailOpen(false);
      setSelectedInvoice(null);
      success("Venta/factura anulada correctamente");
      await loadInvoices();
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "No se pudo anular la venta/factura",
      );
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
    </>
  );
}
