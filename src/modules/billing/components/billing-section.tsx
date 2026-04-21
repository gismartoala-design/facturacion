import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Eye, RefreshCcw, RotateCcw, Search } from "lucide-react";
import { useMemo } from "react";

import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import type { PaginationMeta, SriInvoice } from "@/shared/dashboard/types";

const SRI_STATUS_LABELS: Record<string, string> = {
  NOT_AUTHORIZED: "No autorizadas",
  ALL: "Todas",
  DRAFT: "Borrador",
  AUTHORIZED: "Autorizadas",
  PENDING_SRI: "Pendiente SRI",
  ERROR: "Con error",
};

const SALE_STATUS_LABELS: Record<string, string> = {
  ALL: "Ventas activas y anuladas",
  COMPLETED: "Solo ventas activas",
  CANCELLED: "Solo anuladas",
};

const RETRY_FILTER_LABELS: Record<string, string> = {
  ALL: "Todas",
  RETRYABLE: "Solo reintentables",
  NON_RETRYABLE: "Sin opcion de reintento",
};

type BillingSectionProps = {
  loading: boolean;
  invoices: SriInvoice[];
  pagination: PaginationMeta;
  statusFilter: string;
  saleStatusFilter: string;
  retryFilter: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  saving: boolean;
  onRetry: (invoiceId: string) => void;
  onRetryVisible: () => void;
  onViewDetails: (invoiceId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (value: string) => void;
  onSaleStatusFilterChange: (value: string) => void;
  onRetryFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onResetFilters: () => void;
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

function formatCurrency(value: number | undefined) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function compactText(value: string | null | undefined, max = 18) {
  if (!value) {
    return "-";
  }

  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}...`;
}

export function BillingSection({
  loading,
  invoices,
  pagination,
  statusFilter,
  saleStatusFilter,
  retryFilter,
  search,
  dateFrom,
  dateTo,
  saving,
  onRetry,
  onRetryVisible,
  onViewDetails,
  onPageChange,
  onFilterChange,
  onSaleStatusFilterChange,
  onRetryFilterChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
}: BillingSectionProps) {
  const canRetry = (invoice: SriInvoice) =>
    (invoice.status === "PENDING_SRI" || invoice.status === "ERROR") &&
    invoice.saleStatus !== "CANCELLED";

  const retryableInvoices = useMemo(
    () => invoices.filter(canRetry),
    [invoices],
  );

  const authorizedCount = useMemo(
    () => invoices.filter((invoice) => invoice.status === "AUTHORIZED").length,
    [invoices],
  );

  const columns = useMemo<GridColDef<SriInvoice>[]>(
    () => [
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 150,
        flex: 1.1,
        renderCell: (params) => (
          <div className="flex flex-wrap items-center gap-2 py-2">
            {canRetry(params.row) ? (
              <MuiButton
                fullWidth
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
              fullWidth
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
      {
        field: "createdAt",
        headerName: "Fecha",
        minWidth: 180,
        flex: 0.95,
        valueGetter: (_value, row) => new Date(row.createdAt ?? 0).getTime(),
        renderCell: (params) => (
          <Stack spacing={0.15} sx={{ py: 0.6 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#4a3c58" }}>
              {formatDateTime(params.row.createdAt)}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              {params.row.authorizedAt
                ? `Autorizada ${formatDateTime(params.row.authorizedAt)}`
                : "Aun sin autorizacion"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "documentFullNumber",
        headerName: "Documento",
        minWidth: 210,
        flex: 1,
        renderCell: (params) => (
          <Stack spacing={0.1} sx={{ py: 0.6 }}>
            <Typography
              sx={{ fontSize: 13, fontWeight: 700, color: "#4a3c58" }}
            >
              {params.row.documentFullNumber ?? params.row.secuencial ?? "-"}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              Venta #{params.row.saleNumber}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "authorizationNumber",
        headerName: "No. autorizacion",
        minWidth: 220,
        flex: 1.1,
        renderCell: (params) => {
          const value = params.row.authorizationNumber || "Sin autorizacion";

          return (
            <Tooltip title={value} placement="top-start">
              <Typography sx={{ fontSize: 12.5, color: "#4a3c58" }}>
                {compactText(value, 30)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: "customerName",
        headerName: "Cliente",
        minWidth: 220,
        flex: 1.2,
        sortable: false,
        renderCell: (params) => (
          <Stack spacing={0.1} sx={{ py: 0.6 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#4a3c58" }}>
              {params.row.customerName ?? "Cliente no disponible"}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              {params.row.customerIdentification ?? "Sin identificacion"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 160,
        flex: 0.8,
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
        field: "sriReceptionStatus",
        headerName: "Recepcion SRI",
        minWidth: 150,
        flex: 0.9,
        valueGetter: (_, row) => row.sriReceptionStatus ?? "-",
      },
      {
        field: "sriAuthorizationStatus",
        headerName: "Autorizacion SRI",
        minWidth: 170,
        flex: 1,
        valueGetter: (_, row) => row.sriAuthorizationStatus ?? "-",
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 130,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, width: "100%", textAlign: "right" }}>
            {formatCurrency(params.row.total)}
          </Typography>
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
        renderCell: (params) => {
          const value = params.row.lastError || "Sin novedades";

          return (
            <Tooltip title={value} placement="top-start">
              <Typography sx={{ fontSize: 12.5, color: "#4a3c58" }}>
                {compactText(value, 54)}
              </Typography>
            </Tooltip>
          );
        },
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
      <DashboardPageHeader
        title="Facturas SRI"
        description="Seguimiento de documentos, errores y reintentos de facturacion electronica."
        titleColor="#4a3c58"
        descriptionColor="rgba(74, 60, 88, 0.68)"
        sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
      />

      <Paper
        sx={{
          borderRadius: "28px",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
        }}
      >
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
              <Chip
                label={`${retryableInvoices.length} reintentables en esta pagina`}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: retryableInvoices.length > 0 ? "#b45309" : "#4a3c58",
                  backgroundColor:
                    retryableInvoices.length > 0
                      ? "#fff7ed"
                      : "rgba(255,255,255,0.88)",
                  border:
                    retryableInvoices.length > 0
                      ? "1px solid #fdba74"
                      : "1px solid rgba(232, 213, 229, 0.78)",
                }}
              />
              <Chip
                label={`${authorizedCount} autorizadas visibles`}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: "#15803d",
                  backgroundColor: "#ecfdf3",
                  border: "1px solid #86efac",
                }}
              />
            </Stack>

          </Stack>

          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              useFlexGap
              flexWrap="wrap"
            >
              <TextField
                size="small"
                placeholder="Buscar por documento, cliente, identificacion, clave o error"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                disabled={loading || saving}
                sx={{ minWidth: 280, flex: 1.4 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="h-4 w-4 text-slate-500" />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 210 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => onFilterChange(e.target.value)}
                  disabled={loading || saving}
                >
                  <MenuItem value="NOT_AUTHORIZED">No autorizadas</MenuItem>
                  <MenuItem value="ALL">Todas</MenuItem>
                  <MenuItem value="DRAFT">Borrador</MenuItem>
                  <MenuItem value="PENDING_SRI">Pendiente SRI</MenuItem>
                  <MenuItem value="AUTHORIZED">Autorizadas</MenuItem>
                  <MenuItem value="ERROR">Con error</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={saleStatusFilter}
                  onChange={(e) => onSaleStatusFilterChange(e.target.value)}
                  disabled={loading || saving}
                >
                  <MenuItem value="ALL">Todas las ventas</MenuItem>
                  <MenuItem value="COMPLETED">Solo activas</MenuItem>
                  <MenuItem value="CANCELLED">Solo anuladas</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={retryFilter}
                  onChange={(e) => onRetryFilterChange(e.target.value)}
                  disabled={loading || saving}
                >
                  <MenuItem value="ALL">Todas</MenuItem>
                  <MenuItem value="RETRYABLE">Solo reintentables</MenuItem>
                  <MenuItem value="NON_RETRYABLE">No reintentables</MenuItem>
                </Select>
              </FormControl>

            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              useFlexGap
              flexWrap="wrap"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                size="small"
                type="date"
                label="Desde"
                value={dateFrom}
                onChange={(event) => onDateFromChange(event.target.value)}
                disabled={loading || saving}
                sx={{ minWidth: 180 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="date"
                label="Hasta"
                value={dateTo}
                onChange={(event) => onDateToChange(event.target.value)}
                disabled={loading || saving}
                sx={{ minWidth: 180 }}
                InputLabelProps={{ shrink: true }}
              />

              <Chip
                label={SALE_STATUS_LABELS[saleStatusFilter] ?? saleStatusFilter}
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
                label={RETRY_FILTER_LABELS[retryFilter] ?? retryFilter}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: "#4a3c58",
                  backgroundColor: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(232, 213, 229, 0.78)",
                }}
              />

              <Box sx={{ flex: 1 }} />

              <MuiButton
                variant="outlined"
                onClick={onResetFilters}
                disabled={loading || saving}
                startIcon={<RotateCcw className="h-4 w-4" />}
              >
                Limpiar filtros
              </MuiButton>

              <MuiButton
                variant="contained"
                onClick={onRetryVisible}
                disabled={saving || retryableInvoices.length === 0}
                startIcon={<RefreshCcw className="h-4 w-4" />}
              >
                Reintentar visibles
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
                height: 520,
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
