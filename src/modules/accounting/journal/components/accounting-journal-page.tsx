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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { BookText, CalendarRange, Eye, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ACCOUNTING_SOURCE_LABELS,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
} from "@/modules/accounting/shared/format";
import type {
  AccountingEntryLine,
  AccountingJournalGridRow,
  AccountingJournalResponse,
  AccountingJournalRow,
} from "../types";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

type FiltersForm = {
  from: string;
  to: string;
  sourceType: string;
  limit: string;
};

type AccountingJournalPageProps = {
  initialReport: AccountingJournalResponse | null;
  initialError?: string | null;
};

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return formatInputDate(new Date());
}

function monthStartInputValue() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return formatInputDate(monthStart);
}

function createInitialFilters(): FiltersForm {
  return {
    from: monthStartInputValue(),
    to: todayInputValue(),
    sourceType: "",
    limit: "100",
  };
}

function buildJournalQuery(filters: FiltersForm) {
  const params = new URLSearchParams();
  params.set("status", "POSTED");

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (filters.limit) params.set("limit", filters.limit);

  return params.toString();
}

export function AccountingJournalPage({
  initialReport,
  initialError = null,
}: AccountingJournalPageProps) {
  const [report, setReport] = useState<AccountingJournalResponse | null>(initialReport);
  const [filters, setFilters] = useState<FiltersForm>(createInitialFilters);
  const [submittedFilters, setSubmittedFilters] = useState<FiltersForm>(createInitialFilters);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedEntry, setSelectedEntry] = useState<AccountingJournalRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredRows = useMemo(() => {
    if (!report) {
      return [];
    }

    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return report.rows;
    }

    return report.rows.filter((entry) => {
      const haystack = [
        entry.source.title,
        entry.source.subtitle ?? "",
        entry.sourceId,
        ACCOUNTING_SOURCE_LABELS[entry.sourceType] ?? entry.sourceType,
        ...entry.accountCodes,
        ...entry.lines.flatMap((line) => [
          line.accountCode,
          line.accountName ?? "",
          line.memo ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [report, search]);

  const gridRows = useMemo<AccountingJournalGridRow[]>(
    () =>
      filteredRows.map((entry) => ({
        ...entry,
        postedLabel: formatDateTime(entry.postedAt ?? entry.createdAt),
        sourceLabel: ACCOUNTING_SOURCE_LABELS[entry.sourceType] ?? entry.sourceType,
        sourceSummary: entry.source.subtitle ?? "Sin referencia adicional",
      })),
    [filteredRows],
  );

  const columns: GridColDef<AccountingJournalGridRow>[] = [
    {
      field: "postedLabel",
      headerName: "Fecha",
      minWidth: 180,
      flex: 0.95,
      sortable: false,
    },
    {
      field: "sourceLabel",
      headerName: "Origen",
      minWidth: 140,
      flex: 0.75,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="default"
          variant="outlined"
          sx={{ borderRadius: "999px", fontWeight: 600 }}
        />
      ),
    },
    {
      field: "source",
      headerName: "Detalle del asiento",
      minWidth: 320,
      flex: 1.8,
      sortable: false,
      renderCell: (params) => {
        const row = params.row;

        return (
          <Stack spacing={0.2} sx={{ py: 0.5, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              {row.source.title}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "#64748b" }}>
              {row.sourceSummary}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: "debitTotal",
      headerName: "Debito",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      flex: 0.8,
      renderCell: (params) => formatCurrency(params.row.debitTotal),
    },
    {
      field: "creditTotal",
      headerName: "Credito",
      minWidth: 140,
      align: "right",
      headerAlign: "right",
      flex: 0.8,
      renderCell: (params) => formatCurrency(params.row.creditTotal),
    },
    {
      field: "lineCount",
      headerName: "Lineas",
      minWidth: 95,
      align: "center",
      headerAlign: "center",
      flex: 0.5,
      renderCell: (params) => formatCompactNumber(params.row.lineCount),
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 84,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={() => {
            setSelectedEntry(params.row);
            setDetailOpen(true);
          }}
          aria-label="Ver detalle del asiento"
        >
          <Eye size={16} />
        </IconButton>
      ),
    },
  ];

  const detailColumns: GridColDef<AccountingEntryLine>[] = [
    {
      field: "accountCode",
      headerName: "Codigo",
      minWidth: 120,
      flex: 0.6,
      sortable: false,
    },
    {
      field: "accountName",
      headerName: "Cuenta",
      minWidth: 220,
      flex: 1.2,
      sortable: false,
      renderCell: (params) => params.row.accountName ?? "Cuenta sin nombre",
    },
    {
      field: "debit",
      headerName: "Debito",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      flex: 0.75,
      sortable: false,
      renderCell: (params) => formatCurrency(params.row.debit),
    },
    {
      field: "credit",
      headerName: "Credito",
      minWidth: 130,
      align: "right",
      headerAlign: "right",
      flex: 0.75,
      sortable: false,
      renderCell: (params) => formatCurrency(params.row.credit),
    },
    {
      field: "memo",
      headerName: "Detalle",
      minWidth: 220,
      flex: 1.1,
      sortable: false,
      renderCell: (params) => params.row.memo ?? "—",
    },
  ];

  function handleFilterChange<K extends keyof FiltersForm>(
    field: K,
    value: FiltersForm[K],
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadJournal(nextFilters: FiltersForm) {
    setLoading(true);
    setError(null);

    try {
      const query = buildJournalQuery(nextFilters);
      const nextReport = await fetchJson<AccountingJournalResponse>(
        `/api/v1/accounting/entries?${query}`,
      );

      setReport(nextReport);
      setSubmittedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el libro diario",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    void loadJournal(filters);
  }

  function handleReload() {
    void loadJournal(submittedFilters);
  }

  function handleResetFilters() {
    const initial = createInitialFilters();
    setFilters(initial);
    setSearch("");
    void loadJournal(initial);
  }

  return (
    <>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <DashboardPageHeader
            icon={<BookText size={18} color="#475569" />}
            title="Libro diario"
            description="Consulta cronologica de asientos posteados con detalle de lineas, origen y trazabilidad."
            sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
          />
        </Grid>

        <Grid size={12}>
          <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
            backgroundColor: "#fff",
            p: 2,
          }}
        >
          <Stack spacing={2}>
            <Grid
              container
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", lg: "center" }}
            >
              <Grid size={{ xs: 12, lg: "grow" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Filtros del libro diario
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, lg: "auto" }}>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<RefreshCcw size={16} />}
                  onClick={handleReload}
                  disabled={loading}
                  fullWidth
                  sx={{ borderRadius: "999px", fontWeight: 700, minHeight: 40 }}
                >
                  Recargar
                </Button>
              </Grid>
            </Grid>

            <Grid container spacing={1.25}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Desde"
                  type="date"
                  value={filters.from}
                  onChange={(event) => handleFilterChange("from", event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarRange size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Hasta"
                  type="date"
                  value={filters.to}
                  onChange={(event) => handleFilterChange("to", event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarRange size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  label="Origen"
                  value={filters.sourceType}
                  onChange={(event) =>
                    handleFilterChange("sourceType", event.target.value)
                  }
                  fullWidth
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(ACCOUNTING_SOURCE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  label="Registros"
                  value={filters.limit}
                  onChange={(event) => handleFilterChange("limit", event.target.value)}
                  fullWidth
                >
                  {[50, 100, 200, 500].map((option) => (
                    <MenuItem key={option} value={String(option)}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, lg: 8 }}>
                <TextField
                  label="Buscar en origen, cuentas o detalle"
                  placeholder="Venta, cobro, codigo de cuenta, memo"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ height: "100%" }}
                  justifyContent="flex-end"
                >
                  <Button
                    type="button"
                    variant="contained"
                    onClick={handleApplyFilters}
                    disabled={loading}
                    sx={{ borderRadius: "999px", fontWeight: 700, minWidth: 140 }}
                  >
                    Consultar
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleResetFilters}
                    disabled={loading}
                    sx={{ borderRadius: "999px", fontWeight: 700, minWidth: 120 }}
                  >
                    Limpiar
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {report ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`${formatCompactNumber(report.summary.postedCount)} asientos posteados`}
                  sx={{ borderRadius: "999px", fontWeight: 700 }}
                />
                <Chip
                  label={`Debito ${formatCurrency(report.summary.debitTotal)}`}
                  variant="outlined"
                  sx={{ borderRadius: "999px", fontWeight: 700 }}
                />
                <Chip
                  label={`Credito ${formatCurrency(report.summary.creditTotal)}`}
                  variant="outlined"
                  sx={{ borderRadius: "999px", fontWeight: 700 }}
                />
              </Stack>
            ) : null}
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
            {error}
          </Alert>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            borderRadius: "28px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
            backgroundColor: "#fff",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }} spacing={1.5}>
              <CircularProgress size={28} />
              <Typography sx={{ color: "#64748b", fontSize: 14 }}>
                Cargando libro diario...
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ minHeight: 640 }}>
              <DataGrid
                rows={gridRows}
                columns={columns}
                getRowId={(row) => row.id}
                disableColumnMenu
                disableRowSelectionOnClick
                hideFooterSelectedRowCount
                pageSizeOptions={[25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 25,
                      page: 0,
                    },
                  },
                }}
                onRowDoubleClick={(params) => {
                  setSelectedEntry(params.row);
                  setDetailOpen(true);
                }}
                localeText={{
                  noRowsLabel: "No hay asientos posteados que coincidan con el filtro.",
                }}
                sx={{
                  border: "none",
                  "& .MuiDataGrid-cell": {
                    fontSize: 13,
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontSize: 13,
                    fontWeight: 700,
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                    outline: "none",
                  },
                }}
              />
            </Box>
          )}
        </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle>
          {selectedEntry ? selectedEntry.source.title : "Detalle del asiento"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedEntry ? (
            <Stack spacing={2}>
              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: "18px",
                      border: "1px solid rgba(226, 232, 240, 0.95)",
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                      Fecha de registro
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
                      {formatDateTime(selectedEntry.postedAt ?? selectedEntry.createdAt)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: "18px",
                      border: "1px solid rgba(226, 232, 240, 0.95)",
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                      Origen
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
                      {ACCOUNTING_SOURCE_LABELS[selectedEntry.sourceType] ??
                        selectedEntry.sourceType}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                      {selectedEntry.source.subtitle ?? selectedEntry.sourceId}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: "18px",
                      border: "1px solid rgba(226, 232, 240, 0.95)",
                      p: 1.5,
                    }}
                  >
                    <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                      Totales
                    </Typography>
                    <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
                      Debito {formatCurrency(selectedEntry.debitTotal)}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 12.5 }}>
                      Credito {formatCurrency(selectedEntry.creditTotal)} ·{" "}
                      {formatCompactNumber(selectedEntry.lineCount)} lineas
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box
                sx={{
                  overflow: "hidden",
                  borderRadius: "20px",
                  border: "1px solid rgba(226, 232, 240, 0.95)",
                }}
              >
                <DataGrid
                  rows={selectedEntry.lines}
                  columns={detailColumns}
                  getRowId={(row) => row.id}
                  disableColumnMenu
                  disableRowSelectionOnClick
                  hideFooter
                  rowHeight={44}
                  sx={{
                    border: "none",
                    minHeight: 320,
                    "& .MuiDataGrid-cell": {
                      fontSize: 13,
                      alignItems: "center",
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                      fontSize: 13,
                      fontWeight: 700,
                    },
                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                      outline: "none",
                    },
                  }}
                />
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} sx={{ borderRadius: "999px", fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
