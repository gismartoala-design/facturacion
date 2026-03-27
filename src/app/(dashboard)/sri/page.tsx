"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { InvoiceDetailModal } from "@/shared/dashboard/modals";
import { type PaginatedResult, type SriInvoice, type SriInvoiceDetail } from "@/shared/dashboard/types";
import { BillingSection } from "@/modules/billing/components/billing-section";

export type SriStatusFilter = "NOT_AUTHORIZED" | "ALL" | "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";

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
  }, [page, statusFilter]);

  function handleFilterChange(value: string) {
    setStatusFilter(value as SriStatusFilter);
    setPage(1);
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
