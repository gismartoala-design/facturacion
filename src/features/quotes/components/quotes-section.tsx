import { RefreshCcw } from "lucide-react";

import type { Quote, QuoteStatus } from "@/components/mvp-dashboard-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { DocumentWorkspaceHeader } from "@/features/shared/document-composer/components/document-workspace-header";

export type QuoteFilter = "ALL" | QuoteStatus;

const QUOTE_STATUS_LABELS: Record<QuoteFilter, string> = {
  ALL: "Todas",
  OPEN: "Abiertas",
  CONVERTED: "Convertidas",
  CANCELLED: "Anuladas",
};

function quoteBadgeVariant(
  status: QuoteStatus,
): "default" | "success" | "warning" | "danger" {
  if (status === "OPEN") return "warning";
  if (status === "CONVERTED") return "success";
  return "danger";
}

type QuotesSectionProps = {
  quotes: Quote[];
  saving: boolean;
  statusFilter: QuoteFilter;
  onStatusFilterChange: (value: QuoteFilter) => void;
  onRefresh: () => void;
  onEditQuote: (quoteId: string) => void;
  onConvertQuote: (quoteId: string) => void;
  onCancelQuote: (quoteId: string) => void;
};

export function QuotesSection({
  quotes,
  saving,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  onEditQuote,
  onConvertQuote,
  onCancelQuote,
}: QuotesSectionProps) {
  return (
    <div className="space-y-6">
      <DocumentWorkspaceHeader
        title="Cotizaciones"
        description="Guarda propuestas sin afectar inventario y conviertelas cuando el cliente confirme."
      />

      <Card className="border-[#e8d5e5]/60 bg-[#fdfcf5]/50 backdrop-blur-sm">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-white/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/80">
                {quotes.length} cotizacion{quotes.length !== 1 ? "es" : ""}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-[#fdfcf5]/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/72">
                {QUOTE_STATUS_LABELS[statusFilter]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-md border border-[#e8d5e5] bg-[#fdfcf5] px-3 text-sm text-[#4a3c58] outline-none transition-all focus:ring-2 focus:ring-[#b1a1c6]"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value as QuoteFilter)}
                disabled={saving}
              >
                <option value="ALL">{QUOTE_STATUS_LABELS.ALL}</option>
                <option value="OPEN">{QUOTE_STATUS_LABELS.OPEN}</option>
                <option value="CONVERTED">{QUOTE_STATUS_LABELS.CONVERTED}</option>
                <option value="CANCELLED">{QUOTE_STATUS_LABELS.CANCELLED}</option>
              </select>
              <Button
                type="button"
                variant="outline"
                className="border-[#e8d5e5] text-[#4a3c58] hover:bg-[#b1a1c6]/10"
                onClick={onRefresh}
                disabled={saving}
              >
                <RefreshCcw className="h-4 w-4" /> Actualizar
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-[#e8d5e5]/70 bg-white">
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
                    <Td colSpan={7} className="text-center text-[#4a3c58]/60">
                      No hay cotizaciones para este filtro.
                    </Td>
                  </Tr>
                ) : (
                  quotes.map((quote) => (
                    <Tr key={quote.id} className="transition-colors hover:bg-[#fdfcf5]">
                      <Td className="font-medium text-[#4a3c58]">#{quote.quoteNumber}</Td>
                      <Td>{quote.customerName}</Td>
                      <Td>{quote.customerIdentification}</Td>
                      <Td>{quote.fechaEmision}</Td>
                      <Td>${quote.total.toFixed(2)}</Td>
                      <Td>
                        <Badge variant={quoteBadgeVariant(quote.status)}>
                          {quote.status}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => onEditQuote(quote.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => onConvertQuote(quote.id)}
                          >
                            Convertir
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={saving || quote.status !== "OPEN"}
                            onClick={() => onCancelQuote(quote.id)}
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
