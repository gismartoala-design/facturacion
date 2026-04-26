"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { CalendarRange, Download, RefreshCcw, Search, Users } from "lucide-react";

import { useSalesByCustomerReport } from "@/modules/reports/sales-by-customer/hooks/use-sales-by-customer-report";
import { PageErrorState } from "@/shared/states/page-error-state";
import { PageLoadingState } from "@/shared/states/page-loading-state";

import type {
  SalesByCustomerReportResponse,
  SalesByCustomerRow,
} from "./sales-by-customer-view-model";

type SalesByCustomerPageProps = {
  initialReport: SalesByCustomerReportResponse | null;
  initialError?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

export function SalesByCustomerPage({
  initialReport,
  initialError = null,
}: SalesByCustomerPageProps) {
  const theme = useTheme();
  const salesByCustomer = useSalesByCustomerReport({
    initialReport,
    initialError,
  });

  const shellBorder = alpha(theme.palette.divider, 0.76);
  const busy = salesByCustomer.loading || salesByCustomer.isPending;
  const topCustomer = salesByCustomer.report?.rows[0] ?? null;

  const columns: GridColDef<SalesByCustomerRow>[] = [
    {
      field: "customerName",
      headerName: "Cliente",
      minWidth: 240,
      flex: 1.5,
      renderCell: (params) => (
        <Stack spacing={0.1} sx={{ py: 0.5, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {params.row.customerName}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: "#64748b" }}>
            {params.row.identification}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "salesCount",
      headerName: "Compras",
      minWidth: 110,
      flex: 0.65,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => params.row.salesCount,
    },
    {
      field: "total",
      headerName: "Total comprado",
      minWidth: 150,
      flex: 0.85,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
          {formatCurrency(params.row.total)}
        </Typography>
      ),
    },
    {
      field: "averageTicket",
      headerName: "Ticket promedio",
      minWidth: 150,
      flex: 0.85,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCurrency(params.row.averageTicket),
    },
    {
      field: "lastPurchaseAt",
      headerName: "Ultima compra",
      minWidth: 180,
      flex: 0.9,
      renderCell: (params) => formatDateTime(params.row.lastPurchaseAt),
    },
    {
      field: "participationPercent",
      headerName: "Participacion",
      minWidth: 130,
      flex: 0.75,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatPercent(params.row.participationPercent),
    },
  ];

  return (
    <Stack spacing={2.5} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 2 } }}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.9}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            Ventas por cliente
          </Typography>
          <Typography
            sx={{
              maxWidth: 860,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Ranking comercial para identificar que clientes compran mas dentro de un
            periodo.
          </Typography>
        </Stack>
      </Box>

      <Paper
        component="form"
        onSubmit={salesByCustomer.applyFilters}
        sx={{
          borderRadius: "24px",
          borderColor: shellBorder,
          backgroundColor: alpha(theme.palette.background.paper, 0.96),
          p: { xs: 2, md: 2.25 },
        }}
      >
        <Stack spacing={1.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 16.5 }}>
                Criterio del reporte
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                Filtra el periodo y, si aplica, el vendedor a evaluar en el ranking.
              </Typography>
            </Box>
            <Button
              type="button"
              variant="outlined"
              onClick={salesByCustomer.exportVisibleRows}
              disabled={busy || !salesByCustomer.filteredRows.length}
              startIcon={<Download className="h-4 w-4" />}
            >
              Exportar CSV
            </Button>
          </Stack>

          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Desde"
                type="date"
                value={salesByCustomer.filters.from}
                onChange={(event) =>
                  salesByCustomer.setFilters((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Hasta"
                type="date"
                value={salesByCustomer.filters.to}
                onChange={(event) =>
                  salesByCustomer.setFilters((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Vendedor"
                value={salesByCustomer.filters.sellerId}
                onChange={(event) =>
                  salesByCustomer.setFilters((current) => ({
                    ...current,
                    sellerId: event.target.value,
                  }))
                }
                disabled={busy || Boolean(salesByCustomer.report?.filters.sellerLocked)}
                helperText={
                  salesByCustomer.report?.filters.sellerLocked
                    ? "Tu sesion solo puede consultar tus ventas."
                    : "Opcional. Dejalo vacio para incluir todos."
                }
              >
                <MenuItem value="">Todos los vendedores</MenuItem>
                {salesByCustomer.report?.sellerOptions.map((seller) => (
                  <MenuItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  startIcon={<CalendarRange className="h-4 w-4" />}
                  sx={{ flex: 1 }}
                >
                  {busy ? "Actualizando..." : "Aplicar"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={salesByCustomer.resetFilters}
                  disabled={busy}
                  startIcon={<RefreshCcw className="h-4 w-4" />}
                >
                  Limpiar
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Buscar cliente"
                value={salesByCustomer.search}
                onChange={(event) => salesByCustomer.setSearch(event.target.value)}
                placeholder="Nombre del cliente o identificacion"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="h-4 w-4" />
                    </InputAdornment>
                  ),
                }}
                helperText="La busqueda reduce solo las filas visibles del ranking actual."
              />
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {salesByCustomer.error && !salesByCustomer.report ? (
        <PageErrorState message={salesByCustomer.error} onRetry={() => salesByCustomer.refresh()} />
      ) : null}

      {salesByCustomer.error && salesByCustomer.report ? (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
          {salesByCustomer.error}
        </Alert>
      ) : null}

      {salesByCustomer.loading && !salesByCustomer.report ? (
        <PageLoadingState
          message="Cargando reporte de ventas por cliente..."
          centered
          minHeight={220}
          size={30}
        />
      ) : null}

      {salesByCustomer.loading && salesByCustomer.report ? (
        <PageLoadingState message="Actualizando reporte..." />
      ) : null}

      {salesByCustomer.report ? (
        <>
          <Grid container spacing={1.25}>
            {[
              {
                label: "Clientes en ranking",
                value: `${salesByCustomer.report.summary.customersCount}`,
                meta: `${salesByCustomer.report.summary.salesCount} compras registradas`,
              },
              {
                label: "Total vendido",
                value: formatCurrency(salesByCustomer.report.summary.grossTotal),
                meta: `Ticket promedio ${formatCurrency(salesByCustomer.report.summary.averageTicket)}`,
              },
              {
                label: "Valor promedio por cliente",
                value: formatCurrency(salesByCustomer.report.summary.averageCustomerValue),
                meta: "Promedio del periodo visible",
              },
              {
                label: "Cliente lider",
                value: topCustomer?.customerName ?? "Sin datos",
                meta: topCustomer
                  ? `${formatCurrency(topCustomer.total)} · ${topCustomer.salesCount} compra${topCustomer.salesCount === 1 ? "" : "s"}`
                  : "No hay ventas en el corte",
              },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 12, md: 6, xl: 3 }}>
                <Paper sx={{ borderRadius: "22px", p: 2, borderColor: shellBorder }}>
                  <Stack spacing={0.9}>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                      {card.value}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      {card.meta}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ borderRadius: "24px", p: 0, borderColor: shellBorder, overflow: "hidden" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${shellBorder}` }}
            >
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 17 }}>
                  Ranking de clientes
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                  Una fila por cliente con compras registradas dentro del rango consultado.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<Users className="h-3.5 w-3.5" />}
                  label={`${salesByCustomer.filteredRows.length} cliente${salesByCustomer.filteredRows.length === 1 ? "" : "s"} visible${salesByCustomer.filteredRows.length === 1 ? "" : "s"}`}
                />
              </Stack>
            </Stack>

            <Box sx={{ height: 640 }}>
              <DataGrid
                rows={salesByCustomer.filteredRows}
                columns={columns}
                getRowId={(row) => row.customerId}
                loading={salesByCustomer.loading}
                disableRowSelectionOnClick
                density="compact"
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 25,
                      page: 0,
                    },
                  },
                  sorting: {
                    sortModel: [{ field: "total", sort: "desc" }],
                  },
                }}
                slots={{
                  noRowsOverlay: () => (
                    <Stack
                      spacing={0.75}
                      alignItems="center"
                      justifyContent="center"
                      sx={{ height: "100%" }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        No hay clientes para mostrar
                      </Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                        Ajusta el corte, el vendedor o la busqueda local.
                      </Typography>
                    </Stack>
                  ),
                }}
              />
            </Box>
          </Paper>
        </>
      ) : null}
    </Stack>
  );
}
