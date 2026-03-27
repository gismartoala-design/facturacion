"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import type { Quote, QuoteStatus } from "@/shared/dashboard/types";
import {
  QuotesSection,
  type QuoteFilter,
} from "@/modules/quotes/components/quotes-section";

type QuotesToast = {
  message: string;
  severity: "success" | "error" | "info";
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuoteFilter>("ALL");
  const [toast, setToast] = useState<QuotesToast | null>(null);

  async function loadQuotes(filter: QuoteFilter = statusFilter) {
    setLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const result = await fetchJson<Quote[]>(`/api/v1/quotes${query}`);
      setQuotes(result);
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar cotizaciones",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuotes(statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onCancelQuote(id: string) {
    if (!window.confirm("Se anulara la cotizacion. ¿Deseas continuar?")) return;
    setSaving(true);
    setToast(null);
    try {
      await fetchJson(`/api/v1/quotes/${id}/cancel`, { method: "POST" });
      setToast({
        message: "Cotizacion anulada correctamente",
        severity: "success",
      });
      await loadQuotes(statusFilter);
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo anular la cotizacion",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Paper sx={{ borderRadius: "20px", px: 3, py: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: "#4a3c58" }}>
          <CircularProgress size={18} thickness={5} />
          <span className="text-sm font-medium">Cargando cotizaciones...</span>
        </Stack>
      </Paper>
    );
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
