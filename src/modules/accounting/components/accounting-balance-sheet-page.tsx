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
import { CalendarRange, Landmark, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ACCOUNTING_GROUP_TONES,
  formatCompactNumber,
  formatCurrency,
} from "@/modules/accounting/lib/format";
import type {
  AccountingBalanceSheetResponse,
  BalanceSheetRow,
  BalanceSheetSection,
} from "@/modules/accounting/lib/accounting-balance-sheet-view-model";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

type FiltersForm = {
  to: string;
  includeZeroBalances: boolean;
  includeInactive: boolean;
};

type AccountingBalanceSheetPageProps = {
  initialReport: AccountingBalanceSheetResponse | null;
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

function createInitialFilters(): FiltersForm {
  return {
    to: todayInputValue(),
    includeZeroBalances: false,
    includeInactive: false,
  };
}

function buildQuery(filters: FiltersForm) {
  const params = new URLSearchParams();
  if (filters.to) params.set("to", filters.to);
  params.set("includeZeroBalances", String(filters.includeZeroBalances));
  params.set("includeInactive", String(filters.includeInactive));
  return params.toString();
}

type SectionGridProps = {
  section: BalanceSheetSection;
  search: string;
};

function SectionGrid({ section, search }: SectionGridProps) {
  const rows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return section.rows;
    }

    return section.rows.filter((row) =>
      [row.code, row.name, row.parentCode ?? "", row.groupLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, section.rows]);

  const columns: GridColDef<BalanceSheetRow>[] = [
    {
      field: "code",
      headerName: "Codigo",
      minWidth: 110,
      flex: 0.7,
      sortable: false,
    },
    {
      field: "name",
      headerName: "Cuenta",
      minWidth: 260,
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
      field: "balance",
      headerName: "Saldo",
      minWidth: 140,
      flex: 0.9,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: params.row.level <= 2 ? 700 : 500, color: "#0f172a" }}>
          {formatCurrency(params.row.balance)}
        </Typography>
      ),
    },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "24px",
        border: "1px solid rgba(226, 232, 240, 0.95)",
        backgroundColor: "#fff",
        overflow: "hidden",
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2, pb: 0 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={section.groupLabel}
              color={ACCOUNTING_GROUP_TONES[section.groupKey] ?? "default"}
              variant="outlined"
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            />
            <Typography sx={{ color: "#64748b", fontSize: 13 }}>
              {formatCompactNumber(rows.length)} cuentas visibles
            </Typography>
          </Stack>
          <Typography sx={{ color: "#0f172a", fontWeight: 700 }}>
            Total {formatCurrency(section.total)}
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ minHeight: 360 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.accountId}
          disableColumnMenu
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
          localeText={{
            noRowsLabel: "No hay cuentas para esta seccion con el filtro aplicado.",
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
    </Paper>
  );
}

export function AccountingBalanceSheetPage({
  initialReport,
  initialError = null,
}: AccountingBalanceSheetPageProps) {
  const [report, setReport] = useState<AccountingBalanceSheetResponse | null>(
    initialReport,
  );
  const [filters, setFilters] = useState<FiltersForm>(createInitialFilters);
  const [submittedFilters, setSubmittedFilters] =
    useState<FiltersForm>(createInitialFilters);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  function handleFilterChange<K extends keyof FiltersForm>(
    field: K,
    value: FiltersForm[K],
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadBalanceSheet(nextFilters: FiltersForm) {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery(nextFilters);
      const nextReport = await fetchJson<AccountingBalanceSheetResponse>(
        `/api/v1/accounting/balance-sheet?${query}`,
      );

      setReport(nextReport);
      setSubmittedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el balance general",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    void loadBalanceSheet(filters);
  }

  function handleReload() {
    void loadBalanceSheet(submittedFilters);
  }

  function handleResetFilters() {
    const initial = createInitialFilters();
    setFilters(initial);
    setSearch("");
    void loadBalanceSheet(initial);
  }

  const assetSection = report?.sections.find((section) => section.groupKey === "ASSET");
  const liabilitySection = report?.sections.find(
    (section) => section.groupKey === "LIABILITY",
  );
  const equitySection = report?.sections.find((section) => section.groupKey === "EQUITY");

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<Landmark className="h-4.5 w-4.5" />}
          title="Balance general"
          description="Posicion financiera acumulada a una fecha de corte."
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
                Filtros del balance general
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
                label="Fecha de corte"
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
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                label="Buscar cuenta"
                placeholder="Codigo, nombre o padre"
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
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.includeZeroBalances}
                      onChange={(event) =>
                        handleFilterChange("includeZeroBalances", event.target.checked)
                      }
                    />
                  }
                  label="Incluir ceros"
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
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                label={`Activo ${formatCurrency(report.summary.assetsTotal)}`}
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Pasivo ${formatCurrency(report.summary.liabilitiesTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Patrimonio ${formatCurrency(report.summary.equityTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                color={
                  Math.abs(report.summary.equationDifference) <= 0.0001
                    ? "success"
                    : "error"
                }
                label={`Diferencia ${formatCurrency(report.summary.equationDifference)}`}
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

      {loading ? (
        <Grid size={12}>
          <Paper
          elevation={0}
          sx={{
            borderRadius: "28px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
            backgroundColor: "#fff",
            py: 12,
          }}
          >
            <Stack alignItems="center" justifyContent="center" spacing={1.5}>
              <CircularProgress size={28} />
            <Typography sx={{ color: "#64748b", fontSize: 14 }}>
              Cargando balance general...
            </Typography>
            </Stack>
          </Paper>
        </Grid>
      ) : report ? (
        <Grid size={12} container spacing={2}>
          <Grid size={{ xs: 12, xl: 6 }}>
            {assetSection ? <SectionGrid section={assetSection} search={search} /> : null}
          </Grid>
          <Grid size={{ xs: 12, xl: 6 }}>
            <Stack spacing={2}>
              {liabilitySection ? (
                <SectionGrid section={liabilitySection} search={search} />
              ) : null}
              {equitySection ? <SectionGrid section={equitySection} search={search} /> : null}
            </Stack>
          </Grid>
        </Grid>
      ) : null}
    </Grid>
  );
}
