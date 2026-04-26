"use client";

import { useEffect, useState } from "react";

import { useAppConfirm } from "@/components/providers/app-confirm-provider";
import { useAppNotifications } from "@/components/providers/app-notification-provider";
import { fetchJson } from "@/shared/dashboard/api";
import { PageLoadingState } from "@/shared/states/page-loading-state";
import type { Quote } from "@/shared/dashboard/types";
import {
  QuotesSection,
  type QuoteFilter,
} from "@/modules/quotes/components/quotes-section";

export default function QuotesPage() {
  const confirm = useAppConfirm();
  const { error: showError, success } = useAppNotifications();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuoteFilter>("ALL");

  async function loadQuotes(filter: QuoteFilter = statusFilter) {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const result = await fetchJson<Quote[]>(`/api/v1/quotes${query}`);
      setQuotes(result);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "No se pudo cargar cotizaciones",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotes(statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onCancelQuote(id: string) {
    const accepted = await confirm({
      title: "Anular cotización",
      message: "Se anulara la cotizacion. Esta accion no se puede deshacer.",
      confirmLabel: "Anular cotización",
      severity: "warning",
      destructive: true,
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v1/quotes/${id}/cancel`, { method: "POST" });
      success("Cotizacion anulada correctamente");
      await loadQuotes(statusFilter);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "No se pudo anular la cotizacion",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoadingState message="Cargando cotizaciones..." />;
  }

  return (
    <>
      <QuotesSection
        quotes={quotes}
        saving={saving}
        statusFilter={statusFilter}
        onCreateQuote={() => {
          window.location.href = "/sales?mode=quote";
        }}
        onStatusFilterChange={setStatusFilter}
        onRefresh={() => {
          void loadQuotes(statusFilter);
        }}
        onEditQuote={(quoteId) => {
          window.location.href = `/sales?mode=quote&edit=${quoteId}`;
        }}
        onInvoiceQuote={(quoteId) => {
          window.location.href = `/sales?quote=${quoteId}`;
        }}
        onPrintQuote={(quoteId) => {
          window.open(`/api/v1/quotes/${quoteId}/pdf`, "_blank", "noopener,noreferrer");
        }}
        onCancelQuote={(quoteId) => {
          void onCancelQuote(quoteId);
        }}
      />
    </>
  );
}
