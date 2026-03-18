"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { InvoiceDetailModal } from "@/components/mvp-dashboard-modals";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/components/mvp-dashboard-types";
import { SriSection } from "@/features/sri/components/sri-section";

export type SriStatusFilter = "NOT_AUTHORIZED" | "ALL" | "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";

export default function SriPage() {
  const [invoices, setInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCancelling, setDetailCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SriInvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SriStatusFilter>("NOT_AUTHORIZED");

  async function loadInvoices() {
    setLoading(true);

    try {
      const statusParam = statusFilter === "ALL" ? "" : `&status=${statusFilter}`;
      const result = await fetchJson<PaginatedResult<SriInvoice>>(
        `/api/v1/sri-invoices?page=${page}&limit=10${statusParam}`
      );
      setInvoices(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar facturas SRI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  function handleFilterChange(value: string) {
    setStatusFilter(value as SriStatusFilter);
    setPage(1);
  }

  async function onRetry(invoiceId: string) {
    setSaving(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/retry`, { method: "POST" });
      setMessage("Reintento ejecutado");
      await loadInvoices();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reintentar");
    } finally {
      setSaving(false);
    }
  }

  async function onViewDetails(invoiceId: string) {
    setMessage("");
    setSelectedInvoice(null);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchJson<SriInvoiceDetail>(`/api/v1/sri-invoices/${invoiceId}`);
      setSelectedInvoice(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar detalle de factura");
    } finally {
      setDetailLoading(false);
    }
  }

  async function onCancelSaleAndInvoice(invoiceId: string) {
    if (!window.confirm("Se anulara la venta y se revertira el stock. Esta accion no se puede deshacer. ¿Deseas continuar?")) {
      return;
    }

    setDetailCancelling(true);
    setMessage("");
    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/cancel`, { method: "POST" });
      setIsDetailOpen(false);
      setSelectedInvoice(null);
      setMessage("Venta/factura anulada correctamente");
      await loadInvoices();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo anular la venta/factura");
    } finally {
      setDetailCancelling(false);
    }
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <SriSection
        loading={loading}
        invoices={invoices}
        pagination={{ page, limit: 10, total, totalPages }}
        statusFilter={statusFilter}
        saving={saving}
        onRetry={onRetry}
        onViewDetails={onViewDetails}
        onPageChange={setPage}
        onFilterChange={handleFilterChange}
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
