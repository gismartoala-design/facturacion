"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { InvoiceDetailModal } from "@/components/mvp-dashboard-modals";
import { SriSection } from "@/components/mvp-dashboard-sections";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/components/mvp-dashboard-types";

export type SriStatusFilter = "NOT_AUTHORIZED" | "ALL" | "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";

export default function SriPage() {
  const [invoices, setInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SriInvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
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
    try {
      const detail = await fetchJson<SriInvoiceDetail>(`/api/v1/sri-invoices/${invoiceId}`);
      setSelectedInvoice(detail);
      setIsDetailOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar detalle de factura");
    }
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <SriSection
        loading={loading}
        invoices={invoices}
        pagination={{ page, limit: 10, total: 0, totalPages }}
        statusFilter={statusFilter}
        saving={saving}
        onRetry={onRetry}
        onViewDetails={onViewDetails}
        onPageChange={setPage}
        onFilterChange={handleFilterChange}
      />
      <InvoiceDetailModal
        isOpen={isDetailOpen}
        invoice={selectedInvoice}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
