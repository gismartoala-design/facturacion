import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Eye, RefreshCcw } from "lucide-react";
import { useMemo } from "react";

import type {
  PaginationMeta,
  SriInvoice,
} from "@/components/mvp-dashboard-types";

const SRI_STATUS_LABELS: Record<string, string> = {
  NOT_AUTHORIZED: "No autorizadas",
  ALL: "Todas",
  DRAFT: "Borrador",
  AUTHORIZED: "Autorizadas",
  PENDING_SRI: "Pendiente SRI",
  ERROR: "Con error",
};

type SriSectionProps = {
  loading: boolean;
  invoices: SriInvoice[];
  pagination: PaginationMeta;
  statusFilter: string;
  saving: boolean;
  onRetry: (invoiceId: string) => void;
  onViewDetails: (invoiceId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (value: string) => void;
};

function statusChipStyles(status: string) {
  if (status === "AUTHORIZED") {
    return {
      backgroundColor: "#ecfdf3",
      color: "#15803d",
      border: "1px solid #86efac",
    };
  }

  if (status === "ERROR") {
    return {
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fca5a5",
    };
  }

  if (status === "PENDING_SRI") {
    return {
      backgroundColor: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fdba74",
    };
  }

  return {
    backgroundColor: "#f8fafc",
    color: "#475569",
    border: "1px solid #cbd5e1",
  };
}

export function SriSection({
  loading,
  invoices,
  pagination,
  statusFilter,
  saving,
  onRetry,
  onViewDetails,
  onPageChange,
  onFilterChange,
}: SriSectionProps) {
  const canRetry = (invoice: SriInvoice) =>
    (invoice.status === "PENDING_SRI" || invoice.status === "ERROR") &&
    invoice.saleStatus !== "CANCELLED";

  const columns = useMemo<GridColDef<SriInvoice>[]>(
    () => [
      {
        field: "saleNumber",
        headerName: "Venta",
        minWidth: 140,
        flex: 0.8,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            Venta #{params.row.saleNumber}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 170,
        flex: 0.9,
        renderCell: (params) => (
          <Chip
            label={SRI_STATUS_LABELS[params.row.status] ?? params.row.status}
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              ...statusChipStyles(params.row.status),
            }}
          />
        ),
      },
      {
        field: "retryCount",
        headerName: "Intentos",
        minWidth: 130,
        flex: 0.65,
        renderCell: (params) => (
          <span className="text-[#4a3c58]">
            {params.row.retryCount}
            {params.row.saleStatus === "CANCELLED" ? " · Anulada" : ""}
          </span>
        ),
      },
      {
        field: "lastError",
        headerName: "Observacion",
        minWidth: 260,
        flex: 1.6,
        valueGetter: (_, row) => row.lastError || "Sin novedades",
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 220,
        flex: 1.1,
        renderCell: (params) => (
          <div className="flex flex-wrap items-center gap-2 py-2">
            {canRetry(params.row) ? (
              <MuiButton
                size="small"
                variant="outlined"
                onClick={() => onRetry(params.row.id)}
                disabled={saving}
                startIcon={<RefreshCcw className="h-4 w-4" />}
              >
                Reintentar
              </MuiButton>
            ) : null}
            <MuiButton
              size="small"
              variant="contained"
              onClick={() => onViewDetails(params.row.id)}
              startIcon={<Eye className="h-4 w-4" />}
            >
              Ver
            </MuiButton>
          </div>
        ),
      },
    ],
    [onRetry, onViewDetails, saving],
  );

  function handlePaginationModelChange(model: GridPaginationModel) {
    if (model.page + 1 !== pagination.page) {
      onPageChange(model.page + 1);
    }
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.75}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            Facturas SRI
          </Typography>
          <Typography
            sx={{
              maxWidth: 720,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Seguimiento de documentos, errores y reintentos de facturacion
            electronica.
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
                label={SRI_STATUS_LABELS[statusFilter] ?? statusFilter}
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
                label={`Pagina ${pagination.page} de ${pagination.totalPages || 1}`}
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

            <FormControl size="small" sx={{ minWidth: 210 }}>
              <Select
                value={statusFilter}
                onChange={(e) => onFilterChange(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="NOT_AUTHORIZED">No autorizadas</MenuItem>
                <MenuItem value="ALL">Todas</MenuItem>
                <MenuItem value="DRAFT">Borrador</MenuItem>
                <MenuItem value="PENDING_SRI">Pendiente SRI</MenuItem>
                <MenuItem value="AUTHORIZED">Autorizadas</MenuItem>
                <MenuItem value="ERROR">Con error</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box sx={{ overflow: "hidden", borderRadius: "24px", border: "1px solid rgba(232, 213, 229, 0.7)", backgroundColor: "#fff" }}>
            <DataGrid
              rows={invoices}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loading}
              disableRowSelectionOnClick
              disableColumnMenu
              paginationMode="server"
              rowCount={pagination.total}
              pageSizeOptions={[pagination.limit]}
              paginationModel={{
                page: Math.max(0, pagination.page - 1),
                pageSize: pagination.limit,
              }}
              onPaginationModelChange={handlePaginationModelChange}
              localeText={{
                noRowsLabel: "No hay facturas para este filtro.",
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
