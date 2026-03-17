"use client";

import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";

import { fetchJson } from "@/components/mvp-dashboard-api";
import type { Quote, QuoteStatus } from "@/components/mvp-dashboard-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";

type QuoteFilter = "ALL" | QuoteStatus;

const QUOTE_STATUS_LABELS: Record<QuoteFilter, string> = {
  ALL: "Todas",
  OPEN: "Abiertas",
  CONVERTED: "Convertidas",
  CANCELLED: "Anuladas",
};

function quoteBadgeVariant(status: QuoteStatus): "default" | "success" | "warning" | "danger" {
  if (status === "OPEN") return "warning";
  if (status === "CONVERTED") return "success";
  return "danger";
}

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
      <Card className="border-[#e8d5e5]/60 bg-[#fdfcf5]/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden p-1 border border-[#e8d5e5]/30">
                <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
              </div>
              <div>
                <CardTitle className="text-[#4a3c58]">Cotizaciones / Proformas</CardTitle>
                <CardDescription className="text-[#4a3c58]/70">Guarda propuestas sin afectar inventario y conviertelas cuando el cliente confirme.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-md border border-[#e8d5e5] bg-[#fdfcf5] px-3 text-sm text-[#4a3c58] focus:ring-2 focus:ring-[#b1a1c6] outline-none transition-all"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as QuoteFilter)}
                disabled={saving}
              >
                <option value="ALL">{QUOTE_STATUS_LABELS.ALL}</option>
                <option value="OPEN">{QUOTE_STATUS_LABELS.OPEN}</option>
                <option value="CONVERTED">{QUOTE_STATUS_LABELS.CONVERTED}</option>
                <option value="CANCELLED">{QUOTE_STATUS_LABELS.CANCELLED}</option>
              </select>
              <Button type="button" variant="outline" className="border-[#e8d5e5] text-[#4a3c58] hover:bg-[#b1a1c6]/10" onClick={() => { void loadQuotes(statusFilter); }} disabled={loading || saving}>
                <RefreshCcw className="h-4 w-4" /> Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

      <Card className="border-[#e8d5e5]/60 bg-[#fdfcf5]/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-[#4a3c58]">Listado</CardTitle>
          <CardDescription className="text-[#4a3c58]/70">{quotes.length} cotizacion{quotes.length !== 1 ? "es" : ""} ({QUOTE_STATUS_LABELS[statusFilter]})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>No.</Th>
                  <Th>Cliente</Th>
                  <Th>Identificacion</Th>
                  <Th>Fecha</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </Tr>
              </THead>
              <TBody>
                {quotes.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} className="text-center text-[#4a3c58]/60">No hay cotizaciones para este filtro.</Td>
                  </Tr>
                ) : (
                  quotes.map((quote) => (
                    <Tr key={quote.id} className="hover:bg-[#fdfcf5] transition-colors">
                      <Td className="font-medium text-[#4a3c58]">#{quote.quoteNumber}</Td>
                      <Td>{quote.customerName}</Td>
                      <Td>{quote.customerIdentification}</Td>
                      <Td>{quote.fechaEmision}</Td>
                      <Td>${quote.total.toFixed(2)}</Td>
                      <Td>
                        <Badge variant={quoteBadgeVariant(quote.status)}>{quote.status}</Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => { window.location.href = `/checkout?edit=${quote.id}`; }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => { void onConvertQuote(quote.id); }}
                          >
                            Convertir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => { void onCancelQuote(quote.id); }}
                          >
                            Anular
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
