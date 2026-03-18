"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import type { Quote, QuoteStatus } from "@/components/mvp-dashboard-types";
import {
  QuotesSection,
  type QuoteFilter,
} from "@/features/quotes/components/quotes-section";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuoteFilter>("ALL");
  const [message, setMessage] = useState("");

  async function loadQuotes(filter: QuoteFilter = statusFilter) {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const result = await fetchJson<Quote[]>(`/api/v1/quotes${query}`);
      setQuotes(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotes(statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onConvertQuote(id: string) {
    if (!window.confirm("Se convertira la cotizacion a venta/factura. ¿Deseas continuar?")) return;
    setSaving(true);
    setMessage("");
    try {
      await fetchJson(`/api/v1/quotes/${id}/convert`, { method: "POST" });
      setMessage("Cotizacion convertida a venta correctamente");
      await loadQuotes(statusFilter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo convertir la cotizacion");
    } finally {
      setSaving(false);
    }
  }

  async function onCancelQuote(id: string) {
    if (!window.confirm("Se anulara la cotizacion. ¿Deseas continuar?")) return;
    setSaving(true);
    setMessage("");
    try {
      await fetchJson(`/api/v1/quotes/${id}/cancel`, { method: "POST" });
      setMessage("Cotizacion anulada correctamente");
      await loadQuotes(statusFilter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo anular la cotizacion");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#e8d5e5] bg-[#fdfcf5] p-4 text-[#4a3c58]">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando cotizaciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <QuotesSection
        quotes={quotes}
        saving={saving}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={() => {
          void loadQuotes(statusFilter);
        }}
        onEditQuote={(quoteId) => {
          window.location.href = `/checkout?edit=${quoteId}`;
        }}
        onConvertQuote={(quoteId) => {
          void onConvertQuote(quoteId);
        }}
        onCancelQuote={(quoteId) => {
          void onCancelQuote(quoteId);
        }}
      />
    </div>
  );
}
