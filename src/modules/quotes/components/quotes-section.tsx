import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { FilePenLine, FilePlus2, Printer, ReceiptText, RefreshCcw, XCircle } from "lucide-react";
import { useMemo } from "react";

import type { Quote, QuoteStatus } from "@/shared/dashboard/types";

export type QuoteFilter = "ALL" | QuoteStatus;

const QUOTE_STATUS_LABELS: Record<QuoteFilter, string> = {
  ALL: "Todas",
  OPEN: "Abiertas",
  CONVERTED: "Convertidas",
  CANCELLED: "Anuladas",
};

function quoteStatusChipStyles(status: QuoteStatus) {
  if (status === "OPEN") {
    return {
      backgroundColor: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fdba74",
    };
  }

  if (status === "CONVERTED") {
    return {
      backgroundColor: "#ecfdf3",
      color: "#15803d",
      border: "1px solid #86efac",
    };
  }

  return {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
  };
}

type QuotesSectionProps = {
  quotes: Quote[];
  saving: boolean;
  statusFilter: QuoteFilter;
  onCreateQuote: () => void;
  onStatusFilterChange: (value: QuoteFilter) => void;
  onRefresh: () => void;
  onEditQuote: (quoteId: string) => void;
  onInvoiceQuote: (quoteId: string) => void;
  onPrintQuote: (quoteId: string) => void;
  onCancelQuote: (quoteId: string) => void;
};

export function QuotesSection({
  quotes,
  saving,
  statusFilter,
  onCreateQuote,
  onStatusFilterChange,
  onRefresh,
  onEditQuote,
  onInvoiceQuote,
  onPrintQuote,
  onCancelQuote,
}: QuotesSectionProps) {
  const columns = useMemo<GridColDef<Quote>[]>(
    () => [
      {
        field: "quoteNumber",
        headerName: "No.",
        minWidth: 120,
        flex: 0.7,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            #{params.row.quoteNumber}
          </span>
        ),
      },
      {
        field: "customerName",
        headerName: "Cliente",
        minWidth: 220,
        flex: 1.3,
      },
      {
        field: "customerIdentification",
        headerName: "Identificacion",
        minWidth: 160,
        flex: 1,
      },
      {
        field: "fechaEmision",
        headerName: "Fecha",
        minWidth: 130,
        flex: 0.8,
      },
      {
        field: "total",
        headerName: "Total",
        type: "number",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 150,
        flex: 0.9,
        renderCell: (params) => (
          <Chip
            label={QUOTE_STATUS_LABELS[params.row.status]}
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              ...quoteStatusChipStyles(params.row.status),
            }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 400,
        flex: 1.9,
        renderCell: (params) => (
          <div className="flex flex-wrap items-center gap-2 py-2">
            <MuiButton
              type="button"
              size="small"
              variant="contained"
              disabled={saving || params.row.status !== "OPEN"}
              onClick={() => onEditQuote(params.row.id)}
              startIcon={<FilePenLine className="h-4 w-4" />}
            >
              Editar
            </MuiButton>
            <MuiButton
              type="button"
              size="small"
              variant="outlined"
              disabled={saving || params.row.status !== "OPEN"}
              onClick={() => onInvoiceQuote(params.row.id)}
              startIcon={<ReceiptText className="h-4 w-4" />}
              >
                Facturar
              </MuiButton>
            <MuiButton
              type="button"
              size="small"
              variant="outlined"
              disabled={saving}
              onClick={() => onPrintQuote(params.row.id)}
              startIcon={<Printer className="h-4 w-4" />}
            >
              Imprimir
            </MuiButton>
            <MuiButton
              type="button"
              size="small"
              variant="contained"
              color="error"
              disabled={saving || params.row.status !== "OPEN"}
              onClick={() => onCancelQuote(params.row.id)}
              startIcon={<XCircle className="h-4 w-4" />}
            >
              Anular
            </MuiButton>
          </div>
        ),
      },
    ],
    [onCancelQuote, onEditQuote, onInvoiceQuote, onPrintQuote, saving],
  );

  return (
    <Stack spacing={3}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.75}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            Cotizaciones
          </Typography>
          <Typography
            sx={{
              maxWidth: 720,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Guarda propuestas sin afectar inventario y conviertelas cuando el
            cliente confirme.
          </Typography>
        </Stack>
      </Box>

      <Paper sx={{ borderRadius: "28px", px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${quotes.length} cotizacion${quotes.length !== 1 ? "es" : ""}`}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: "#4a3c58",
                  backgroundColor: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(232, 213, 229, 0.78)",
                }}
              />
              <Chip
                label={QUOTE_STATUS_LABELS[statusFilter]}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: "rgba(74, 60, 88, 0.8)",
                  backgroundColor: "rgba(253, 252, 245, 0.9)",
                  border: "1px solid rgba(232, 213, 229, 0.78)",
                }}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    onStatusFilterChange(e.target.value as QuoteFilter)
                  }
                  disabled={saving}
                >
                  <MenuItem value="ALL">{QUOTE_STATUS_LABELS.ALL}</MenuItem>
                  <MenuItem value="OPEN">{QUOTE_STATUS_LABELS.OPEN}</MenuItem>
                  <MenuItem value="CONVERTED">
                    {QUOTE_STATUS_LABELS.CONVERTED}
                  </MenuItem>
                  <MenuItem value="CANCELLED">
                    {QUOTE_STATUS_LABELS.CANCELLED}
                  </MenuItem>
                </Select>
              </FormControl>

              <MuiButton
                type="button"
                variant="outlined"
                onClick={onRefresh}
                disabled={saving}
                startIcon={<RefreshCcw className="h-4 w-4" />}
              >
                Actualizar
              </MuiButton>
              <MuiButton
                type="button"
                variant="contained"
                onClick={onCreateQuote}
                startIcon={<FilePlus2 className="h-4 w-4" />}
              >
                Nueva cotizacion
              </MuiButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              overflow: "hidden",
              borderRadius: "24px",
              border: "1px solid rgba(232, 213, 229, 0.7)",
              backgroundColor: "#fff",
            }}
          >
            <DataGrid
              rows={quotes}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[8, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 8 },
                },
              }}
              localeText={{
                noRowsLabel: "No hay cotizaciones para este filtro.",
              }}
              sx={{
                minHeight: 520,
                "& .MuiDataGrid-cell": {
                  fontSize: 13,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 13,
                },
              }}
            />
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
