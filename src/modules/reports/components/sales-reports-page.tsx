"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useMemo, useState, useTransition } from "react";

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
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { fetchJson } from "@/shared/dashboard/api";
import { PAYMENT_METHODS } from "@/shared/dashboard/types";

type SalesReportResponse = {
  filters: {
    from: string;
    to: string;
    sellerId: string | null;
    sellerLocked: boolean;
  };
  sellerOptions: Array<{
    id: string;
    name: string;
    role: "ADMIN" | "SELLER";
  }>;
  summary: {
    salesCount: number;
    grossTotal: number;
    averageTicket: number;
    taxTotal: number;
    discountTotal: number;
    itemsSold: number;
  };
  salesRows: Array<{
    saleId: string;
    saleNumber: string;
    customerName: string;
    sellerName: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    itemCount: number;
    createdAt: string;
    paymentMethods: string[];
    documentKey: string;
    documentLabel: string;
  }>;
};

type FiltersForm = {
  from: string;
  to: string;
  sellerId: string;
};

type SaleReportDetailResponse = {
  businessName: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  sellerName: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  documentKey: string;
  documentLabel: string;
  documentNumber: string | null;
  paymentMethods: string[];
  lines: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

type SalesRow = SalesReportResponse["salesRows"][number];

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

function paymentMethodLabel(code: string) {
  return PAYMENT_METHODS.find((method) => method.code === code)?.label ?? code;
}

function documentTone(key: string) {
  if (key === "INVOICE_ISSUED") return "success";
  if (key === "INVOICE_ERROR") return "error";
  if (key === "INVOICE_PENDING") return "warning";
  return "default";
}

function escapeCsvCell(value: string | number) {
  const serialized = String(value ?? "");
  if (!serialized.includes(",") && !serialized.includes("\"") && !serialized.includes("\n")) {
    return serialized;
  }

  return `"${serialized.replaceAll("\"", "\"\"")}"`;
}

function buildSalesCsv(rows: SalesRow[]) {
  const header = [
    "Venta",
    "Fecha",
    "Cliente",
    "Vendedor",
    "Documento",
    "Pagos",
    "Lineas",
    "Subtotal",
    "IVA",
    "Descuento",
    "Total",
  ];

  const body = rows.map((row) =>
    [
      row.saleNumber,
      formatDateTime(row.createdAt),
      row.customerName,
      row.sellerName,
      row.documentLabel,
      row.paymentMethods.map(paymentMethodLabel).join(" | "),
      row.itemCount,
      row.subtotal.toFixed(2),
      row.taxTotal.toFixed(2),
      row.discountTotal.toFixed(2),
      row.total.toFixed(2),
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

export function SalesReportsPage() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [filters, setFilters] = useState<FiltersForm>({
    from: "",
    to: "",
    sellerId: "",
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedSaleDetail, setSelectedSaleDetail] =
    useState<SaleReportDetailResponse | null>(null);
  const [isPending, startRoutingTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    const query = searchParams.toString();

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const nextReport = await fetchJson<SalesReportResponse>(
          `/api/v1/reports/sales${query ? `?${query}` : ""}`,
        );
        if (!mounted) return;

        startTransition(() => {
          setReport(nextReport);
          setFilters({
            from: nextReport.filters.from,
            to: nextReport.filters.to,
            sellerId: nextReport.filters.sellerId ?? "",
          });
        });
      } catch (loadError) {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de ventas",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const filteredRows = useMemo(() => {
    if (!report) return [];
    const normalized = search.trim().toLowerCase();
    if (!normalized) return report.salesRows;

    return report.salesRows.filter((row) => {
      const payments = row.paymentMethods.map(paymentMethodLabel).join(" ");
      return (
        row.saleNumber.toLowerCase().includes(normalized) ||
        row.customerName.toLowerCase().includes(normalized) ||
        row.sellerName.toLowerCase().includes(normalized) ||
        row.documentLabel.toLowerCase().includes(normalized) ||
        payments.toLowerCase().includes(normalized)
      );
    });
  }, [report, search]);

  const visibleTotals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          acc.subtotal += row.subtotal;
          acc.taxTotal += row.taxTotal;
          acc.discountTotal += row.discountTotal;
          acc.total += row.total;
          acc.salesCount += 1;
          acc.lineCount += row.itemCount;
          return acc;
        },
        {
          subtotal: 0,
          taxTotal: 0,
          discountTotal: 0,
          total: 0,
          salesCount: 0,
          lineCount: 0,
        },
      ),
    [filteredRows],
  );

  const selectedSellerName = useMemo(() => {
    if (!report?.filters.sellerId) return "Todos los vendedores";
    return (
      report.sellerOptions.find((seller) => seller.id === report.filters.sellerId)?.name ??
      "Vendedor filtrado"
    );
  }, [report]);

  async function fetchSaleDetail(saleId: string) {
    return fetchJson<SaleReportDetailResponse>(`/api/v1/reports/sales/${saleId}`);
  }

  async function openSaleDetail(saleId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await fetchSaleDetail(saleId);
      setSelectedSaleDetail(detail);
    } catch (loadError) {
      setDetailError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle de la venta",
      );
      setSelectedSaleDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function printSaleById(saleId: string) {
    try {
      const printWindow = window.open(
        `/api/v1/sales/${saleId}/print`,
        "_blank",
        "noopener,noreferrer",
      );

      if (!printWindow) {
        throw new Error("El navegador bloqueo la ventana de impresion");
      }
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : "No se pudo imprimir la venta",
      );
    }
  }

  function exportVisibleRows() {
    if (!filteredRows.length) {
      setError("No hay filas visibles para exportar");
      return;
    }

    const csv = buildSalesCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `reporte-ventas-${filters.from || "desde"}-${filters.to || "hasta"}.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    if (filters.from) {
      params.set("from", filters.from);
    } else {
      params.delete("from");
    }

    if (filters.to) {
      params.set("to", filters.to);
    } else {
      params.delete("to");
    }

    if (filters.sellerId) {
      params.set("sellerId", filters.sellerId);
    } else {
      params.delete("sellerId");
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    startRoutingTransition(() => {
      router.replace(newUrl);
    });
  }

  function resetFilters() {
    startRoutingTransition(() => {
      router.replace(pathname);
    });
  }

  const dataGridColumns: GridColDef<SalesRow>[] = [
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
              label={paymentMethodLabel(code)}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>
      ),
    },
    {
      field: "itemCount",
      headerName: "Líneas",
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
              void openSaleDetail(params.row.saleId);
            }}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="small"
            color="secondary"
            onClick={() => {
              void printSaleById(params.row.saleId);
            }}
          >
            <Printer className="h-4 w-4" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const shellBorder = alpha(theme.palette.divider, 0.76);
  const busy = loading || isPending;

  return (
    <Stack spacing={2.5} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 2 } }}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.9}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            Reporte de ventas
          </Typography>
          <Typography
            sx={{
              maxWidth: 860,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            Libro transaccional para revisar ventas emitidas dentro de un corte
            específico. Esta vista responde qué se vendió, a quién, cuándo,
            quién lo registró y con qué documento quedó respaldado.
          </Typography>
          {report ? (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={`Corte: ${report.filters.from} a ${report.filters.to}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Vendedor: ${selectedSellerName}`}
              />
              {search ? (
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label={`Búsqueda local: ${filteredRows.length} resultado${filteredRows.length === 1 ? "" : "s"}`}
                />
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </Box>

      <Paper
        component="form"
        onSubmit={applyFilters}
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
                Define el período y, si aplica, el vendedor sobre el que quieres auditar.
              </Typography>
            </Box>
            <Button
              type="button"
              variant="outlined"
              onClick={exportVisibleRows}
              disabled={busy || !filteredRows.length}
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
                value={filters.from}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Hasta"
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Vendedor"
                value={filters.sellerId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, sellerId: event.target.value }))
                }
                disabled={busy || Boolean(report?.filters.sellerLocked)}
                helperText={
                  report?.filters.sellerLocked
                    ? "Tu sesión solo puede consultar tus ventas."
                    : "Opcional. Déjalo vacío para incluir todos."
                }
              >
                <MenuItem value="">Todos los vendedores</MenuItem>
                {report?.sellerOptions.map((seller) => (
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
                  onClick={resetFilters}
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Venta, cliente, vendedor, documento o medio de pago"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="h-4 w-4" />
                    </InputAdornment>
                  ),
                }}
                helperText="La búsqueda reduce solo las filas visibles del reporte actual."
              />
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
          {error}
        </Alert>
      ) : null}

      {loading && !report ? (
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
              Cargando reporte de ventas...
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {loading && report ? (
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
          <Typography color="text.secondary">
            Actualizando reporte...
          </Typography>
        </Paper>
      ) : null}

      {report ? (
        <>
          <Grid container spacing={1.25}>
            {[
              {
                label: "Ventas en el corte",
                value: `${report.summary.salesCount}`,
                meta: `${formatCompactNumber(report.summary.itemsSold)} unidades vendidas`,
              },
              {
                label: "Total facturado",
                value: formatCurrency(report.summary.grossTotal),
                meta: `Subtotal ${formatCurrency(report.summary.grossTotal - report.summary.taxTotal)}`,
              },
              {
                label: "Ticket promedio",
                value: formatCurrency(report.summary.averageTicket),
                meta: `Descuento ${formatCurrency(report.summary.discountTotal)}`,
              },
              {
                label: "IVA del corte",
                value: formatCurrency(report.summary.taxTotal),
                meta: `${filteredRows.length} fila${filteredRows.length === 1 ? "" : "s"} visibles`,
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
                  Una fila por venta registrada dentro del corte consultado.
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${visibleTotals.salesCount} visible${visibleTotals.salesCount === 1 ? "" : "s"}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Subtotal ${formatCurrency(visibleTotals.subtotal)}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`IVA ${formatCurrency(visibleTotals.taxTotal)}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Total ${formatCurrency(visibleTotals.total)}`}
                />
              </Stack>
            </Stack>

            <Box sx={{ height: 680 }}>
              <DataGrid
                rows={filteredRows}
                columns={dataGridColumns}
                getRowId={(row) => row.saleId}
                loading={loading}
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
                        Ajusta el corte, el vendedor o la búsqueda local.
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
        open={detailOpen}
        onClose={() => {
          if (detailLoading) return;
          setDetailOpen(false);
          setDetailError(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalle de venta</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Stack spacing={1.5} alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Cargando detalle...</Typography>
            </Stack>
          ) : detailError ? (
            <Alert severity="error" variant="outlined">
              {detailError}
            </Alert>
          ) : selectedSaleDetail ? (
            <Stack spacing={2}>
              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Venta
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      #{selectedSaleDetail.saleNumber}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      {formatDateTime(selectedSaleDetail.createdAt)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Cliente
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      {selectedSaleDetail.customerName}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Vendedor: {selectedSaleDetail.sellerName}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 1.5, borderRadius: "18px" }}>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      Documento
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>
                      {selectedSaleDetail.documentLabel}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                      {selectedSaleDetail.documentNumber ?? "Sin numeración"}
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
                  {selectedSaleDetail.lines.map((line) => (
                    <Box
                      key={`${selectedSaleDetail.saleId}-${line.productId}-${line.productCode}`}
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
                      {selectedSaleDetail.paymentMethods.map((code) => (
                        <Chip
                          key={`${selectedSaleDetail.saleId}-${code}`}
                          label={paymentMethodLabel(code)}
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
                          {formatCurrency(selectedSaleDetail.subtotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          IVA
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(selectedSaleDetail.taxTotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                          Descuento
                        </Typography>
                        <Typography sx={{ fontWeight: 700 }}>
                          {formatCurrency(selectedSaleDetail.discountTotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 800 }}>
                          Total
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {formatCurrency(selectedSaleDetail.total)}
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
          {selectedSaleDetail ? (
            <Button
              onClick={() => {
                void printSaleById(selectedSaleDetail.saleId);
              }}
              startIcon={<Printer className="h-4 w-4" />}
            >
              Imprimir
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setDetailOpen(false);
              setDetailError(null);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
