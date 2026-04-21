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
import { BarChart3, CalendarRange, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCompactNumber, formatCurrency } from "@/modules/accounting/lib/format";
import type {
  AccountingIncomeStatementResponse,
  IncomeStatementRow,
  IncomeStatementSection,
} from "@/modules/accounting/lib/accounting-income-statement-view-model";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

type FiltersForm = {
  from: string;
  to: string;
  includeZeroBalances: boolean;
  includeInactive: boolean;
};

type AccountingIncomeStatementPageProps = {
  initialReport: AccountingIncomeStatementResponse | null;
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
    includeZeroBalances: false,
    includeInactive: false,
  };
}

function buildQuery(filters: FiltersForm) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("includeZeroBalances", String(filters.includeZeroBalances));
  params.set("includeInactive", String(filters.includeInactive));
  return params.toString();
}

type SectionGridProps = {
  section: IncomeStatementSection;
  search: string;
};

function IncomeSectionGrid({ section, search }: SectionGridProps) {
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

  const columns: GridColDef<IncomeStatementRow>[] = [
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
      minWidth: 250,
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
      headerName: "Valor",
      minWidth: 140,
      flex: 0.85,
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
              label={section.label}
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

      <Box sx={{ minHeight: 320 }}>
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

export function AccountingIncomeStatementPage({
  initialReport,
  initialError = null,
}: AccountingIncomeStatementPageProps) {
  const [report, setReport] = useState<AccountingIncomeStatementResponse | null>(
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

  async function loadIncomeStatement(nextFilters: FiltersForm) {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery(nextFilters);
      const nextReport = await fetchJson<AccountingIncomeStatementResponse>(
        `/api/v1/accounting/income-statement?${query}`,
      );

      setReport(nextReport);
      setSubmittedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el estado de resultados",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    void loadIncomeStatement(filters);
  }

  function handleReload() {
    void loadIncomeStatement(submittedFilters);
  }

  function handleResetFilters() {
    const initial = createInitialFilters();
    setFilters(initial);
    setSearch("");
    void loadIncomeStatement(initial);
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<BarChart3 size={18} color="#475569" />}
          title="Estado de resultados"
          description="Resultado del periodo a partir de ingresos, costos y gastos."
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
                Filtros del estado de resultados
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
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 2 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  type="button"
                  variant="contained"
                  onClick={handleApplyFilters}
                  disabled={loading}
                  sx={{ borderRadius: "999px", fontWeight: 700, minWidth: 120 }}
                >
                  Consultar
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
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
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack
                direction="row"
                spacing={1}
                justifyContent={{ xs: "flex-start", md: "flex-end" }}
              >
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
                label={`Ingresos operacionales ${formatCurrency(report.summary.operatingIncomeTotal)}`}
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Costo de ventas ${formatCurrency(report.summary.costOfSalesTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Gastos operativos ${formatCurrency(report.summary.operatingExpensesTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Otros ingresos ${formatCurrency(report.summary.otherIncomeTotal)}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                color={report.summary.netResult >= 0 ? "success" : "error"}
                label={`Resultado neto ${formatCurrency(report.summary.netResult)}`}
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

      {report ? (
        <Grid size={12} container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "22px",
                    border: "1px solid rgba(226, 232, 240, 0.95)",
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Utilidad bruta
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 26, fontWeight: 700 }}>
                    {formatCurrency(report.summary.grossProfit)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "22px",
                    border: "1px solid rgba(226, 232, 240, 0.95)",
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Resultado operativo
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 26, fontWeight: 700 }}>
                    {formatCurrency(report.summary.operatingResult)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: "22px",
                    border: "1px solid rgba(226, 232, 240, 0.95)",
                    p: 2,
                  }}
                >
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Resultado neto
                  </Typography>
                  <Typography sx={{ color: "#0f172a", fontSize: 26, fontWeight: 700 }}>
                    {formatCurrency(report.summary.netResult)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {report.sections.map((section) => (
            <Grid key={section.key} size={{ xs: 12, xl: 6 }}>
              <IncomeSectionGrid section={section} search={search} />
            </Grid>
          ))}
        </Grid>
      ) : loading ? (
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
              Cargando estado de resultados...
            </Typography>
            </Stack>
          </Paper>
        </Grid>
      ) : null}
    </Grid>
  );
}
