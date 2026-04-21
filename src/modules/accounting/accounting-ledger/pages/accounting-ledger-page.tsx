"use client";

import Autocomplete from "@mui/material/Autocomplete";
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
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { BookCopy, CalendarRange, RefreshCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  ACCOUNTING_GROUP_TONES,
  ACCOUNTING_SOURCE_LABELS,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
} from "@/modules/accounting/lib/format";
import type {
  AccountingLedgerGridRow,
  AccountingLedgerResponse,
  LedgerAccountOption,
} from "@/modules/accounting/accounting-ledger/components/accounting-ledger-view-model";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

type LedgerFilters = {
  accountCode: string;
  from: string;
  to: string;
  limit: string;
};

type AccountingLedgerPageProps = {
  initialAccounts: LedgerAccountOption[];
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

function createInitialFilters(): LedgerFilters {
  return {
    accountCode: "",
    from: monthStartInputValue(),
    to: todayInputValue(),
    limit: "200",
  };
}

function buildLedgerQuery(filters: LedgerFilters) {
  const params = new URLSearchParams();
  params.set("accountCode", filters.accountCode);

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.limit) params.set("limit", filters.limit);

  return params.toString();
}

export function AccountingLedgerPage({
  initialAccounts,
  initialError = null,
}: AccountingLedgerPageProps) {
  const [filters, setFilters] = useState<LedgerFilters>(createInitialFilters);
  const [submittedFilters, setSubmittedFilters] =
    useState<LedgerFilters | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [report, setReport] = useState<AccountingLedgerResponse | null>(null);

  const selectedAccount =
    initialAccounts.find((account) => account.code === filters.accountCode) ??
    null;

  const columns = useMemo<GridColDef<AccountingLedgerGridRow>[]>(
    () => [
      {
        field: "postedLabel",
        headerName: "Fecha",
        minWidth: 180,
        flex: 0.9,
        sortable: false,
      },
      {
        field: "sourceLabel",
        headerName: "Origen",
        minWidth: 140,
        flex: 0.7,
        sortable: false,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            sx={{ borderRadius: "999px", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "source",
        headerName: "Movimiento",
        minWidth: 360,
        flex: 1.8,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;

          return (
            <Stack spacing={0.2} sx={{ py: 0.5, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}
              >
                {row.source.title}
              </Typography>
              <Typography noWrap sx={{ fontSize: 12, color: "#64748b" }}>
                {row.source.subtitle ?? row.sourceId}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "debit",
        headerName: "Debito",
        minWidth: 140,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params) => formatCurrency(params.row.debit),
      },
      {
        field: "credit",
        headerName: "Credito",
        minWidth: 140,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params) => formatCurrency(params.row.credit),
      },
      {
        field: "runningBalance",
        headerName: "Saldo",
        minWidth: 150,
        flex: 0.85,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params) => (
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
            {formatCurrency(params.row.runningBalance)}
          </Typography>
        ),
      },
    ],
    [],
  );

  const gridRows = useMemo<AccountingLedgerGridRow[]>(() => {
    if (!report) {
      return [];
    }

    const normalized = search.trim().toLowerCase();

    return report.rows
      .filter((row) => {
        if (!normalized) {
          return true;
        }

        const haystack = [
          row.source.title,
          row.source.subtitle ?? "",
          row.memo ?? "",
          row.sourceId,
          ACCOUNTING_SOURCE_LABELS[row.sourceType] ?? row.sourceType,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalized);
      })
      .map((row) => ({
        ...row,
        postedLabel: formatDateTime(row.postedAt),
        sourceLabel: ACCOUNTING_SOURCE_LABELS[row.sourceType] ?? row.sourceType,
      }));
  }, [report, search]);

  function handleFilterChange<K extends keyof LedgerFilters>(
    field: K,
    value: LedgerFilters[K],
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadLedger(nextFilters: LedgerFilters) {
    setLoading(true);
    setError(null);

    try {
      const query = buildLedgerQuery(nextFilters);
      const nextReport = await fetchJson<AccountingLedgerResponse>(
        `/api/v1/accounting/ledger?${query}`,
      );

      setReport(nextReport);
      setSubmittedFilters({ ...nextFilters });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el libro mayor",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    if (!filters.accountCode) {
      setError("Selecciona una cuenta contable para consultar el libro mayor");
      return;
    }

    void loadLedger(filters);
  }

  function handleReload() {
    if (!submittedFilters?.accountCode) {
      return;
    }

    void loadLedger(submittedFilters);
  }

  function handleResetFilters() {
    setFilters(createInitialFilters());
    setSubmittedFilters(null);
    setReport(null);
    setSearch("");
    setError(initialError);
  }

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<BookCopy className="h-4.5 w-4.5" />}
          title="Libro mayor"
          description="Movimientos por cuenta con saldo inicial, cargos, abonos y saldo acumulado."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid container spacing={2}>
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
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "#0f172a" }}
                  >
                    Filtros del libro mayor
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, lg: "auto" }}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<RefreshCcw size={16} />}
                    onClick={handleReload}
                    disabled={!submittedFilters?.accountCode || loading}
                    fullWidth
                    sx={{
                      borderRadius: "999px",
                      fontWeight: 700,
                      minHeight: 40,
                    }}
                  >
                    Recargar
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Autocomplete
                    options={initialAccounts}
                    value={selectedAccount}
                    onChange={(_, value) =>
                      handleFilterChange("accountCode", value?.code ?? "")
                    }
                    getOptionLabel={(option) =>
                      `${option.code} · ${option.name}`
                    }
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    filterOptions={(options, state) => {
                      const normalized = state.inputValue.trim().toLowerCase();
                      if (!normalized) {
                        return options;
                      }

                      return options.filter(
                        (option) =>
                          option.code.toLowerCase().includes(normalized) ||
                          option.name.toLowerCase().includes(normalized) ||
                          option.groupLabel.toLowerCase().includes(normalized),
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Cuenta contable"
                        placeholder="Buscar por codigo o nombre"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <Search size={16} color="#64748b" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;

                      return (
                        <Box component="li" key={key} {...optionProps}>
                          <Stack spacing={0.15} sx={{ width: "100%" }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {option.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              {option.code} · {option.groupLabel} · Naturaleza{" "}
                              {option.defaultNature === "DEBIT"
                                ? "debito"
                                : "credito"}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4, lg: 2 }}>
                  <TextField
                    label="Desde"
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      handleFilterChange("from", event.target.value)
                    }
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
                <Grid size={{ xs: 12, md: 4, lg: 2 }}>
                  <TextField
                    label="Hasta"
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      handleFilterChange("to", event.target.value)
                    }
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
                <Grid size={{ xs: 12, md: 4, lg: 1 }}>
                  <TextField
                    select
                    label="Registros"
                    value={filters.limit}
                    onChange={(event) =>
                      handleFilterChange("limit", event.target.value)
                    }
                    fullWidth
                  >
                    {[100, 200, 300, 500].map((option) => (
                      <MenuItem key={option} value={String(option)}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, lg: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row", lg: "column" }}
                    spacing={1}
                    justifyContent="flex-end"
                    sx={{ height: "100%" }}
                  >
                    <Button
                      type="button"
                      variant="contained"
                      onClick={handleApplyFilters}
                      disabled={loading || initialAccounts.length === 0}
                      sx={{ borderRadius: "999px", fontWeight: 700 }}
                    >
                      Consultar
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleResetFilters}
                      disabled={loading}
                      sx={{ borderRadius: "999px", fontWeight: 700 }}
                    >
                      Limpiar
                    </Button>
                  </Stack>
                </Grid>
              </Grid>

              {selectedAccount ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`${selectedAccount.code} · ${selectedAccount.name}`}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  <Chip
                    label={selectedAccount.groupLabel}
                    color={
                      ACCOUNTING_GROUP_TONES[selectedAccount.groupKey] ??
                      "default"
                    }
                    variant="outlined"
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Naturaleza ${selectedAccount.defaultNature === "DEBIT" ? "debito" : "credito"}`}
                    variant="outlined"
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  {selectedAccount.parentCode ? (
                    <Chip
                      label={`Padre ${selectedAccount.parentCode}`}
                      variant="outlined"
                      sx={{ borderRadius: "999px", fontWeight: 700 }}
                    />
                  ) : null}
                </Stack>
              ) : null}

              <TextField
                label="Buscar en movimientos"
                placeholder="Origen, referencia o detalle"
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
            </Stack>
          </Paper>
        </Grid>

        {report ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Saldo inicial ${formatCurrency(report.summary.openingBalance)}`}
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
              label={`Saldo final ${formatCurrency(report.summary.closingBalance)}`}
              variant="outlined"
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            />
            <Chip
              label={`${formatCompactNumber(report.summary.movementCount)} movimientos`}
              variant="outlined"
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            />
          </Stack>
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
          <DataGrid
            rows={gridRows}
            columns={columns}
            getRowId={(row) => row.lineId}
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
              noRowsLabel:
                "No hay movimientos para la cuenta y periodo seleccionados.",
            }}
            sx={{
              height: 640,
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
        </Paper>
      </Grid>
    </Grid>
  );
}
