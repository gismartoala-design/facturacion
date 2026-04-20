"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { CalendarRange, Download, Package, RefreshCcw, Search } from "lucide-react";

import { useSalesByProductReport } from "@/modules/reports/sales-by-product/hooks/use-sales-by-product-report";

import type {
  SalesByProductReportResponse,
  SalesByProductRow,
} from "./sales-by-product-view-model";

type SalesByProductPageProps = {
  initialReport: SalesByProductReportResponse | null;
  initialError?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 3,
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

export function SalesByProductPage({
  initialReport,
  initialError = null,
}: SalesByProductPageProps) {
  const theme = useTheme();
  const salesByProduct = useSalesByProductReport({
    initialReport,
    initialError,
  });

  const shellBorder = alpha(theme.palette.divider, 0.76);
  const busy = salesByProduct.loading || salesByProduct.isPending;
  const topProduct = salesByProduct.report?.rows[0] ?? null;

  const columns: GridColDef<SalesByProductRow>[] = [
    {
      field: "productName",
      headerName: "Producto",
      minWidth: 260,
      flex: 1.6,
      renderCell: (params) => (
        <Stack spacing={0.1} sx={{ py: 0.5, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {params.row.productName}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: "#64748b" }}>
            {params.row.productCode}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "unitsSold",
      headerName: "Unidades",
      minWidth: 120,
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCompactNumber(params.row.unitsSold),
    },
    {
      field: "salesCount",
      headerName: "Ventas",
      minWidth: 110,
      flex: 0.65,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => params.row.salesCount,
    },
    {
      field: "total",
      headerName: "Total vendido",
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
      field: "averageUnitPrice",
      headerName: "Precio promedio",
      minWidth: 150,
      flex: 0.85,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCurrency(params.row.averageUnitPrice),
    },
    {
      field: "lastSoldAt",
      headerName: "Ultima venta",
      minWidth: 180,
      flex: 0.9,
      renderCell: (params) => formatDateTime(params.row.lastSoldAt),
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
            Ventas por producto
          </Typography>
          <Typography
            sx={{
              maxWidth: 860,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Ranking comercial para identificar los productos con mayor rotacion y
            facturacion dentro de un periodo.
          </Typography>
        </Stack>
      </Box>

      <Paper
        component="form"
        onSubmit={salesByProduct.applyFilters}
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
              onClick={salesByProduct.exportVisibleRows}
              disabled={busy || !salesByProduct.filteredRows.length}
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
                value={salesByProduct.filters.from}
                onChange={(event) =>
                  salesByProduct.setFilters((current) => ({
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
                value={salesByProduct.filters.to}
                onChange={(event) =>
                  salesByProduct.setFilters((current) => ({
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
                value={salesByProduct.filters.sellerId}
                onChange={(event) =>
                  salesByProduct.setFilters((current) => ({
                    ...current,
                    sellerId: event.target.value,
                  }))
                }
                disabled={busy || Boolean(salesByProduct.report?.filters.sellerLocked)}
                helperText={
                  salesByProduct.report?.filters.sellerLocked
                    ? "Tu sesion solo puede consultar tus ventas."
                    : "Opcional. Dejalo vacio para incluir todos."
                }
              >
                <MenuItem value="">Todos los vendedores</MenuItem>
                {salesByProduct.report?.sellerOptions.map((seller) => (
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
                  onClick={salesByProduct.resetFilters}
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
                label="Buscar producto"
                value={salesByProduct.search}
                onChange={(event) => salesByProduct.setSearch(event.target.value)}
                placeholder="Nombre o codigo del producto"
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

      {salesByProduct.error ? (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
          {salesByProduct.error}
        </Alert>
      ) : null}

      {salesByProduct.loading && !salesByProduct.report ? (
        <Paper
          sx={{
            borderRadius: "24px",
            p: 4,
            display: "grid",
            placeItems: "center",
            minHeight: 220,
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <CircularProgress size={30} />
            <Typography color="text.secondary">
              Cargando reporte de ventas por producto...
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {salesByProduct.loading && salesByProduct.report ? (
        <Paper
          sx={{
            borderRadius: "20px",
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <CircularProgress size={18} />
          <Typography color="text.secondary">Actualizando reporte...</Typography>
        </Paper>
      ) : null}

      {salesByProduct.report ? (
        <>
          <Grid container spacing={1.25}>
            {[
              {
                label: "Productos en ranking",
                value: `${salesByProduct.report.summary.productsCount}`,
                meta: `${salesByProduct.report.summary.salesCount} ventas analizadas`,
              },
              {
                label: "Unidades vendidas",
                value: formatCompactNumber(salesByProduct.report.summary.unitsSold),
                meta: `Total vendido ${formatCurrency(salesByProduct.report.summary.grossTotal)}`,
              },
              {
                label: "Facturacion promedio por producto",
                value: formatCurrency(salesByProduct.report.summary.averageProductRevenue),
                meta: "Promedio del periodo visible",
              },
              {
                label: "Producto lider",
                value: topProduct?.productName ?? "Sin datos",
                meta: topProduct
                  ? `${formatCurrency(topProduct.total)} · ${formatCompactNumber(topProduct.unitsSold)} unidades`
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
                  Ranking de productos
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                  Una fila por producto con ventas registradas dentro del rango consultado.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<Package className="h-3.5 w-3.5" />}
                  label={`${salesByProduct.filteredRows.length} producto${salesByProduct.filteredRows.length === 1 ? "" : "s"} visible${salesByProduct.filteredRows.length === 1 ? "" : "s"}`}
                />
              </Stack>
            </Stack>

            <Box sx={{ height: 640 }}>
              <DataGrid
                rows={salesByProduct.filteredRows}
                columns={columns}
                getRowId={(row) => row.productId}
                loading={salesByProduct.loading}
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
                        No hay productos para mostrar
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
