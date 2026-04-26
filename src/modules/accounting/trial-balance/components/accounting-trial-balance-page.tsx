"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { CalendarRange, RefreshCcw, Scale, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ACCOUNTING_GROUP_TONES,
  formatCompactNumber,
  formatCurrency,
} from "@/modules/accounting/shared/format";
import type {
  AccountingTrialBalanceResponse,
  AccountingTrialBalanceRow,
} from "../types";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

type FiltersForm = {
  from: string;
  to: string;
  onlyPostable: boolean;
  includeZeroBalances: boolean;
  includeInactive: boolean;
};

type AccountingTrialBalancePageProps = {
  initialReport: AccountingTrialBalanceResponse | null;
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
  return formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function createInitialFilters(): FiltersForm {
  return {
    from: monthStartInputValue(),
    to: todayInputValue(),
    onlyPostable: true,
    includeZeroBalances: false,
    includeInactive: false,
  };
}

function buildQuery(filters: FiltersForm) {
  const params = new URLSearchParams();

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("onlyPostable", String(filters.onlyPostable));
  params.set("includeZeroBalances", String(filters.includeZeroBalances));
  params.set("includeInactive", String(filters.includeInactive));

  return params.toString();
}

export function AccountingTrialBalancePage({
  initialReport,
  initialError = null,
}: AccountingTrialBalancePageProps) {
  const [report, setReport] = useState<AccountingTrialBalanceResponse | null>(
    initialReport,
  );
  const [filters, setFilters] = useState<FiltersForm>(createInitialFilters);
  const [submittedFilters, setSubmittedFilters] =
    useState<FiltersForm>(createInitialFilters);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const gridRows = useMemo(() => {
    if (!report) {
      return [];
    }

    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return report.rows;
    }

    return report.rows.filter((row) =>
      [
        row.code,
        row.name,
        row.groupLabel,
        row.parentCode ?? "",
        row.defaultNature,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [report, search]);

  const columns: GridColDef<AccountingTrialBalanceRow>[] = [
    {
      field: "code",
      headerName: "Codigo",
      minWidth: 120,
      flex: 0.75,
      sortable: false,
    },
    {
      field: "name",
      headerName: "Cuenta",
      minWidth: 280,
      flex: 1.8,
      sortable: false,
      renderCell: (params) => (
        <Stack spacing={0.15} sx={{ py: 0.5, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {params.row.name}
          </Typography>
          <Typography noWrap sx={{ fontSize: 12, color: "#64748b" }}>
            Nivel {params.row.level}
            {params.row.parentCode ? ` · Padre ${params.row.parentCode}` : ""}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "groupLabel",
      headerName: "Grupo",
      minWidth: 140,
      flex: 0.75,
      sortable: false,
      renderCell: (params) => (
        <Chip
          label={params.row.groupLabel}
          size="small"
          color={ACCOUNTING_GROUP_TONES[params.row.groupKey] ?? "default"}
          variant="outlined"
          sx={{ borderRadius: "999px", fontWeight: 700 }}
        />
      ),
    },
    {
      field: "openingBalance",
      headerName: "Saldo inicial",
      minWidth: 150,
      flex: 0.85,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => formatCurrency(params.row.openingBalance),
    },
    {
      field: "debitTotal",
      headerName: "Debito",
      minWidth: 140,
      flex: 0.75,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => formatCurrency(params.row.debitTotal),
    },
    {
      field: "creditTotal",
      headerName: "Credito",
      minWidth: 140,
      flex: 0.75,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => formatCurrency(params.row.creditTotal),
    },
    {
      field: "closingBalance",
      headerName: "Saldo final",
      minWidth: 150,
      flex: 0.85,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
          {formatCurrency(params.row.closingBalance)}
        </Typography>
      ),
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

  async function loadTrialBalance(nextFilters: FiltersForm) {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery(nextFilters);
      const nextReport = await fetchJson<AccountingTrialBalanceResponse>(
        `/api/v1/accounting/trial-balance?${query}`,
      );

      setReport(nextReport);
      setSubmittedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el balance de comprobacion",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    void loadTrialBalance(filters);
  }

  function handleReload() {
    void loadTrialBalance(submittedFilters);
  }

  function handleResetFilters() {
    const initial = createInitialFilters();
    setFilters(initial);
    setSearch("");
    void loadTrialBalance(initial);
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<Scale size={18} color="#475569" />}
          title="Balance de comprobacion"
          description="Saldos por cuenta para validar el equilibrio contable del periodo."
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
                Filtros del balance de comprobacion
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
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Buscar cuenta"
                placeholder="Codigo, nombre, grupo o padre"
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
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.onlyPostable}
                      onChange={(event) =>
                        handleFilterChange("onlyPostable", event.target.checked)
                      }
                    />
                  }
                  label="Solo postables"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.includeZeroBalances}
                      onChange={(event) =>
                        handleFilterChange(
                          "includeZeroBalances",
                          event.target.checked,
                        )
                      }
                    />
                  }
                  label="Incluir saldos en cero"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.includeInactive}
                      onChange={(event) =>
                        handleFilterChange("includeInactive", event.target.checked)
                      }
                    />
                  }
                  label="Ver inactivas"
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="flex-end"
                sx={{ height: "100%" }}
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
                label={`${formatCompactNumber(report.summary.accountCount)} cuentas`}
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Saldo inicial ${formatCurrency(report.summary.openingBalanceTotal)}`}
                variant="outlined"
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
              <Chip
                label={`Saldo final ${formatCurrency(report.summary.closingBalanceTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
            </Stack>
          ) : null}
        </Stack>
      </Paper>
      </Grid>

      {error ? (
        <Grid size={12}>
          <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
            {error}
          </Alert>
        </Grid>
      ) : null}

      <Grid size={12}>
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
              Cargando balance de comprobacion...
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ minHeight: 640 }}>
            <DataGrid
              rows={gridRows}
              columns={columns}
              getRowId={(row) => row.accountId}
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
              localeText={{
                noRowsLabel: "No hay cuentas que coincidan con el filtro aplicado.",
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
  );
}
