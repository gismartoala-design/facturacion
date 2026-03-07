"use client";

import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { SriSection } from "@/components/mvp-dashboard-sections";
import { type SriInvoice } from "@/components/mvp-dashboard-types";

export default function SriPage() {
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPending() {
    setLoading(true);

    try {
      const result = await fetchJson<SriInvoice[]>("/api/v1/sri-invoices?status=PENDING_SRI");
      setPendingInvoices(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar pendientes SRI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPending();
  }, []);

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

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <SriSection loading={loading} pendingInvoices={pendingInvoices} saving={saving} onRetry={onRetry} />
    </>
  );
}
