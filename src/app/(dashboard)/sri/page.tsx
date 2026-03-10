"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { InvoiceDetailModal } from "@/components/mvp-dashboard-modals";
import { SriSection } from "@/components/mvp-dashboard-sections";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/components/mvp-dashboard-types";

export default function SriPage() {
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SriInvoiceDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadPending() {
    setLoading(true);

    try {
      const result = await fetchJson<PaginatedResult<SriInvoice>>(
        `/api/v1/sri-invoices?status=PENDING_SRI&page=${page}&limit=10`
      );
      setPendingInvoices(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar pendientes SRI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, [page]);

  async function onRetry(invoiceId: string) {
    setSaving(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/retry`, { method: "POST" });
      setMessage("Reintento ejecutado");
      await loadPending();
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
        pendingInvoices={pendingInvoices}
        pagination={{ page, limit: 10, total: 0, totalPages }}
        saving={saving}
        onRetry={onRetry}
        onViewDetails={onViewDetails}
        onPageChange={setPage}
      />
      <InvoiceDetailModal
        isOpen={isDetailOpen}
        invoice={selectedInvoice}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
