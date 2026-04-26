"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CalendarRange,
  Download,
  Eye,
  Printer,
  RefreshCcw,
  Search,
} from "lucide-react";

import { useSalesPeriodReport } from "@/modules/reports/sales-period/hooks/use-sales-period-report";
import { PageLoadingState } from "@/shared/states/page-loading-state";

import type {
  SalesPeriodReportResponse,
  SalesPeriodRow,
} from "./sales-period-view-model";

type SalesPeriodPageProps = {
  initialReport: SalesPeriodReportResponse | null;
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
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function documentTone(key: string) {
  if (key === "INVOICE_ISSUED") return "success";
  if (key === "INVOICE_ERROR") return "error";
  if (key === "INVOICE_PENDING") return "warning";
  return "default";
}

export function SalesPeriodPage({
  initialReport,
  initialError = null,
}: SalesPeriodPageProps) {
  const theme = useTheme();
  const salesPeriod = useSalesPeriodReport({
    initialReport,
    initialError,
  });

  const dataGridColumns: GridColDef<SalesPeriodRow>[] = [
    {
      field: "saleNumber",
      headerName: "Venta",
      minWidth: 110,
      flex: 0.7,
      sortable: true,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
          #{params.row.saleNumber}
        </Typography>
      ),
    },
    {
      field: "createdAt",
      headerName: "Fecha",
      minWidth: 170,
      flex: 0.95,
      valueGetter: (_value, row) => new Date(row.createdAt).getTime(),
      renderCell: (params) => (
        <Typography sx={{ fontSize: 12.5 }}>
          {formatDateTime(params.row.createdAt)}
        </Typography>
      ),
    },
    {
      field: "customerName",
      headerName: "Cliente",
      minWidth: 210,
      flex: 1.2,
    },
    {
      field: "sellerName",
      headerName: "Vendedor",
      minWidth: 160,
      flex: 0.9,
    },
    {
      field: "documentLabel",
      headerName: "Documento",
      minWidth: 170,
      flex: 0.95,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.row.documentLabel}
          color={documentTone(params.row.documentKey)}
          size="small"
          variant={params.row.documentKey === "NONE" ? "outlined" : "filled"}
        />
      ),
    },
    {
      field: "paymentMethods",
      headerName: "Pagos declarados",
      minWidth: 220,
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ py: 0.75 }}>
          {params.row.paymentMethods.map((code) => (
            <Chip
              key={`${params.row.saleId}-${code}`}
              label={salesPeriod.paymentMethodLabel(code)}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>
      ),
    },
    {
      field: "itemCount",
      headerName: "Lineas",
      minWidth: 88,
      flex: 0.5,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCompactNumber(params.row.itemCount),
    },
    {
      field: "subtotal",
      headerName: "Subtotal",
      minWidth: 118,
      flex: 0.72,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCurrency(params.row.subtotal),
    },
    {
      field: "taxTotal",
      headerName: "IVA",
      minWidth: 108,
      flex: 0.65,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCurrency(params.row.taxTotal),
    },
    {
      field: "discountTotal",
      headerName: "Desc.",
      minWidth: 108,
      flex: 0.65,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => formatCurrency(params.row.discountTotal),
    },
    {
      field: "total",
      headerName: "Total",
      minWidth: 118,
      flex: 0.72,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
          {formatCurrency(params.row.total)}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 110,
      flex: 0.55,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <Stack direction="row" spacing={0.25} alignItems="center">
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              void salesPeriod.openSaleDetail(params.row.saleId);
            }}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => {
              void salesPeriod.printSaleById(params.row.saleId);
            }}
          >
            <Printer className="h-4 w-4" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const shellBorder = alpha(theme.palette.divider, 0.76);
  const busy = salesPeriod.loading || salesPeriod.isPending;
  const saleDetail = salesPeriod.selectedSaleDetail;

  return (
    <Stack spacing={2.5} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 2 } }}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.9}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            Ventas por periodo
          </Typography>
          <Typography
            sx={{
              maxWidth: 860,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Reporte transaccional para revisar las ventas emitidas dentro de un rango
            de fechas.
          </Typography>
        </Stack>
      </Box>

      <Paper
        component="form"
        onSubmit={salesPeriod.applyFilters}
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
                Define el periodo y, si aplica, el vendedor sobre el que quieres auditar.
              </Typography>
            </Box>
            <Button
              type="button"
              variant="outlined"
              onClick={salesPeriod.exportVisibleRows}
              disabled={busy || !salesPeriod.filteredRows.length}
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
                value={salesPeriod.filters.from}
                onChange={(event) =>
                  salesPeriod.setFilters((current) => ({
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
                value={salesPeriod.filters.to}
                onChange={(event) =>
                  salesPeriod.setFilters((current) => ({
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
                value={salesPeriod.filters.sellerId}
                onChange={(event) =>
                  salesPeriod.setFilters((current) => ({
                    ...current,
                    sellerId: event.target.value,
                  }))
                }
                disabled={busy || Boolean(salesPeriod.report?.filters.sellerLocked)}
                helperText={
                  salesPeriod.report?.filters.sellerLocked
                    ? "Tu sesion solo puede consultar tus ventas."
                    : "Opcional. Dejalo vacio para incluir todos."
                }
              >
                <MenuItem value="">Todos los vendedores</MenuItem>
                {salesPeriod.report?.sellerOptions.map((seller) => (
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
                  onClick={salesPeriod.resetFilters}
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
                label="Buscar en el resultado"
                value={salesPeriod.search}
                onChange={(event) => salesPeriod.setSearch(event.target.value)}
                placeholder="Venta, cliente, vendedor, documento o medio de pago"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="h-4 w-4" />
                    </InputAdornment>
                  ),
                }}
                helperText="La busqueda reduce solo las filas visibles del reporte actual."
              />
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {salesPeriod.loading && !salesPeriod.report ? (
        <PageLoadingState
          message="Cargando reporte de ventas por periodo..."
          centered
          minHeight={220}
          size={30}
        />
      ) : null}

      {salesPeriod.loading && salesPeriod.report ? (
        <PageLoadingState message="Actualizando reporte..." />
      ) : null}

      {salesPeriod.report ? (
        <>
          <Grid container spacing={1.25}>
            {[
              {
                label: "Ventas en el corte",
                value: `${salesPeriod.report.summary.salesCount}`,
                meta: `${formatCompactNumber(salesPeriod.report.summary.itemsSold)} unidades vendidas`,
              },
              {
                label: "Total facturado",
                value: formatCurrency(salesPeriod.report.summary.grossTotal),
                meta: `Subtotal ${formatCurrency(salesPeriod.report.summary.grossTotal - salesPeriod.report.summary.taxTotal)}`,
              },
              {
                label: "Ticket promedio",
                value: formatCurrency(salesPeriod.report.summary.averageTicket),
                meta: `Descuento ${formatCurrency(salesPeriod.report.summary.discountTotal)}`,
              },
              {
                label: "IVA del corte",
                value: formatCurrency(salesPeriod.report.summary.taxTotal),
                meta: `${salesPeriod.filteredRows.length} fila${salesPeriod.filteredRows.length === 1 ? "" : "s"} visibles`,
              },
            ].map((card) => (
              <Grid key={card.label} size={{ xs: 12, md: 6, xl: 3 }}>
                <Paper sx={{ borderRadius: "22px", p: 2, borderColor: shellBorder }}>
                  <Stack spacing={0.9}>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
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
                  Registro de ventas
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                  Una fila por venta registrada dentro del rango consultado.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${salesPeriod.visibleTotals.salesCount} visible${salesPeriod.visibleTotals.salesCount === 1 ? "" : "s"}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Subtotal ${formatCurrency(salesPeriod.visibleTotals.subtotal)}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`IVA ${formatCurrency(salesPeriod.visibleTotals.taxTotal)}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Total ${formatCurrency(salesPeriod.visibleTotals.total)}`}
                />
              </Stack>
            </Stack>

            <Box sx={{ height: 680 }}>
              <DataGrid
                rows={salesPeriod.filteredRows}
                columns={dataGridColumns}
                getRowId={(row) => row.saleId}
                loading={salesPeriod.loading}
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
                    sortModel: [{ field: "createdAt", sort: "desc" }],
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
                        No hay registros para mostrar
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

      <Dialog
        open={salesPeriod.detailOpen}
        onClose={() => {
          if (salesPeriod.detailLoading) return;
          salesPeriod.setDetailOpen(false);
          salesPeriod.setDetailError(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalle de venta</DialogTitle>
        <DialogContent dividers>
          {salesPeriod.detailLoading ? (
            <Stack spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Cargando detalle...</Typography>
            </Stack>
          ) : salesPeriod.detailError ? (
            <Alert severity="error" variant="outlined">
              {salesPeriod.detailError}
            </Alert>
          ) : saleDetail ? (
            <Stack spacing={2}>
              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Venta
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      #{saleDetail.saleNumber}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      {formatDateTime(saleDetail.createdAt)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Cliente
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      {saleDetail.customerName}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Vendedor: {saleDetail.sellerName}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Documento
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      {saleDetail.documentLabel}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      {saleDetail.documentNumber ?? "Sin numeracion"}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Paper sx={{ borderRadius: "18px", overflow: "hidden" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.6fr) 110px 120px 120px",
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    backgroundColor: alpha(theme.palette.background.default, 0.72),
                    borderBottom: `1px solid ${shellBorder}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: 12 }}>Producto</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 12, textAlign: "right" }}>
                    Cant.
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 12, textAlign: "right" }}>
                    P. Unit
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 12, textAlign: "right" }}>
                    Total
                  </Typography>
                </Box>
                <Stack divider={<Box sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.72)}` }} />}>
                  {saleDetail.lines.map((line) => (
                    <Box
                      key={`${saleDetail.saleId}-${line.productId}-${line.productCode}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.6fr) 110px 120px 120px",
                        gap: 1,
                        px: 2,
                        py: 1.25,
                        alignItems: "center",
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>
                          {line.productName}
                        </Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 12 }} noWrap>
                          {line.productCode}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 13, textAlign: "right" }}>
                        {formatCompactNumber(line.quantity)}
                      </Typography>
                      <Typography sx={{ fontSize: 13, textAlign: "right" }}>
                        {formatCurrency(line.unitPrice)}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, textAlign: "right" }}>
                        {formatCurrency(line.total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>

              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5, mb: 1 }}>
                      Pagos declarados
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {saleDetail.paymentMethods.map((code) => (
                        <Chip
                          key={`${saleDetail.saleId}-${code}`}
                          label={salesPeriod.paymentMethodLabel(code)}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Stack spacing={0.85}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          Subtotal
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(saleDetail.subtotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          IVA
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(saleDetail.taxTotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          Descuento
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(saleDetail.discountTotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 800 }}>Total</Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {formatCurrency(saleDetail.total)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          {saleDetail ? (
            <Button
              onClick={() => {
                void salesPeriod.printSaleById(saleDetail.saleId);
              }}
              startIcon={<Printer className="h-4 w-4" />}
            >
              Imprimir
            </Button>
          ) : null}
          <Button
            onClick={() => {
              salesPeriod.setDetailOpen(false);
              salesPeriod.setDetailError(null);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
