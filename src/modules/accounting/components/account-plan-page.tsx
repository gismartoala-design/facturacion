"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { BadgeCheck, FolderTree, RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ACCOUNTING_GROUP_TONES } from "@/modules/accounting/lib/format";
import { fetchJson } from "@/shared/dashboard/api";

type AccountPlanResponse = {
  accounts: Array<{
    code: string;
    name: string;
    groupKey: string;
    groupLabel: string;
    parentCode: string | null;
    level: number;
    acceptsPostings: boolean;
    defaultNature: "DEBIT" | "CREDIT";
    description: string;
    system: boolean;
  }>;
};

type AccountRow = AccountPlanResponse["accounts"][number];

export function AccountPlanPage() {
  const [data, setData] = useState<AccountPlanResponse | null>(null);
  const [search, setSearch] = useState("");
  const [validatorCode, setValidatorCode] = useState("");
  const [onlyPostable, setOnlyPostable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchJson<AccountPlanResponse>(
          "/api/v1/accounting/account-plan",
        );

        if (!mounted) {
          return;
        }

        setData({ accounts: response.accounts });
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el plan de cuentas",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalized = search.trim().toLowerCase();

    return data.accounts.filter((account) => {
      if (onlyPostable && !account.acceptsPostings) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        account.code.toLowerCase().includes(normalized) ||
        account.name.toLowerCase().includes(normalized) ||
        account.groupLabel.toLowerCase().includes(normalized) ||
        account.description.toLowerCase().includes(normalized)
      );
    });
  }, [data, onlyPostable, search]);

  const selectedAccount = useMemo(
    () => rows.find((row) => row.code === selectedAccountCode) ?? null,
    [rows, selectedAccountCode],
  );

  const validatedAccount = useMemo(() => {
    if (!data || !validatorCode.trim()) {
      return null;
    }

    return (
      data.accounts.find(
        (account) => account.code.toLowerCase() === validatorCode.trim().toLowerCase(),
      ) ?? null
    );
  }, [data, validatorCode]);

  const columns = useMemo<GridColDef<AccountRow>[]>(
    () => [
      {
        field: "code",
        headerName: "Codigo",
        width: 120,
      },
      {
        field: "name",
        headerName: "Cuenta contable",
        minWidth: 320,
        flex: 1.2,
        renderCell: (params) => (
          <Stack
            spacing={0.35}
            sx={{
              minWidth: 0,
              py: 1,
              pl: `${Math.max(0, params.row.level - 1) * 1.1}rem`,
            }}
          >
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: params.row.acceptsPostings ? 600 : 700,
                color: "#0f172a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.row.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.row.description}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "groupLabel",
        headerName: "Grupo",
        width: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.groupLabel}
            color={ACCOUNTING_GROUP_TONES[params.row.groupKey] ?? "default"}
            variant="outlined"
            sx={{ borderRadius: "999px", fontWeight: 600 }}
          />
        ),
      },
      {
        field: "defaultNature",
        headerName: "Naturaleza",
        width: 130,
        valueFormatter: (value: "DEBIT" | "CREDIT") =>
          value === "DEBIT" ? "Debito" : "Credito",
      },
      {
        field: "acceptsPostings",
        headerName: "Uso directo",
        width: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.acceptsPostings ? "Si" : "No"}
            color={params.row.acceptsPostings ? "success" : "default"}
            variant={params.row.acceptsPostings ? "filled" : "outlined"}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          />
        ),
      },
      {
        field: "parentCode",
        headerName: "Cuenta padre",
        width: 130,
        valueFormatter: (value: string | null) => value ?? "Raiz",
      },
    ],
    [],
  );

  if (loading && !data) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderRadius: "20px",
          border: "1px solid rgba(226, 232, 240, 1)",
          p: 2,
          color: "text.secondary",
        }}
      >
        <CircularProgress size={18} thickness={5} />
        <Typography>Cargando plan de cuentas...</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "28px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          background:
            "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(255,255,255,0.98))",
          p: { xs: 2.25, md: 3 },
        }}
      >
        <Stack spacing={1.1}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Stack spacing={0.6}>
              <Stack direction="row" spacing={1.1} alignItems="center">
                <FolderTree size={18} color="#475569" />
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Plan de cuentas
                </Typography>
              </Stack>
              <Typography sx={{ color: "#64748b", maxWidth: 860 }}>
                Catalogo contable y punto de validacion de cuentas. Aqui se define si una
                cuenta existe, a que grupo pertenece y si puede usarse en registros
                directos de asientos.
              </Typography>
            </Stack>
            <Button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              variant="outlined"
              startIcon={<RefreshCcw size={14} />}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Recargar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.55fr) minmax(320px, 0.85fr)",
          },
          gap: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: "28px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
            backgroundColor: "#fff",
            p: 2,
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                size="small"
                placeholder="Buscar por codigo, nombre o grupo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { md: 340 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={onlyPostable}
                    onChange={(event) => setOnlyPostable(event.target.checked)}
                  />
                }
                label="Solo cuentas postables"
              />
            </Stack>

            <Box
              sx={{
                overflow: "hidden",
                borderRadius: "24px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
              }}
            >
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row.code}
                loading={loading}
                disableColumnMenu
                hideFooterSelectedRowCount
                rowSelectionModel={selectedAccountCode ? [selectedAccountCode] : []}
                onRowClick={(params) => setSelectedAccountCode(params.row.code)}
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
                  noRowsLabel: "No hay cuentas que coincidan con el filtro.",
                }}
                sx={{
                  minHeight: 620,
                  "& .MuiDataGrid-cell": {
                    fontSize: 13,
                    alignItems: "center",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontSize: 13,
                    fontWeight: 700,
                  },
                  "& .MuiDataGrid-row.Mui-selected": {
                    backgroundColor: "rgba(59, 130, 246, 0.06)",
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                    outline: "none",
                  },
                }}
              />
            </Box>
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "28px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              backgroundColor: "#fff",
              p: 2.2,
            }}
          >
            <Stack spacing={1.6}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Validador de cuenta
              </Typography>
              <TextField
                size="small"
                label="Codigo contable"
                placeholder="Ej. 110101"
                value={validatorCode}
                onChange={(event) => setValidatorCode(event.target.value)}
                InputProps={{
                  endAdornment: validatedAccount ? (
                    <InputAdornment position="end">
                      <BadgeCheck size={16} color="#16a34a" />
                    </InputAdornment>
                  ) : undefined,
                }}
              />

              {validatorCode.trim() ? (
                validatedAccount ? (
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: "16px" }}>
                    La cuenta {validatedAccount.code} es valida y pertenece al grupo{" "}
                    {validatedAccount.groupLabel}.
                  </Alert>
                ) : (
                  <Alert severity="warning" variant="outlined" sx={{ borderRadius: "16px" }}>
                    La cuenta ingresada no existe en el plan de cuentas actual.
                  </Alert>
                )
              ) : (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Ingresa un codigo para verificar si puede usarse en registros
                  contables.
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: "28px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              backgroundColor: "#fff",
              p: 2.2,
            }}
          >
            <Stack spacing={1.4}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Detalle de cuenta
              </Typography>
              {selectedAccount ? (
                <>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                    {selectedAccount.code} · {selectedAccount.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b" }}>
                    {selectedAccount.description}
                  </Typography>
                  <Chip
                    size="small"
                    label={selectedAccount.groupLabel}
                    color={ACCOUNTING_GROUP_TONES[selectedAccount.groupKey] ?? "default"}
                    variant="outlined"
                    sx={{ width: "fit-content", borderRadius: "999px", fontWeight: 600 }}
                  />
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Naturaleza:{" "}
                    {selectedAccount.defaultNature === "DEBIT" ? "Debito" : "Credito"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Uso directo en asientos:{" "}
                    {selectedAccount.acceptsPostings ? "Permitido" : "Solo agrupacion"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    Cuenta padre: {selectedAccount.parentCode ?? "Raiz"}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Selecciona una cuenta del catalogo para ver su estructura y reglas de uso.
                </Typography>
              )}
            </Stack>
          </Paper>

          <Alert severity="info" variant="outlined" sx={{ borderRadius: "18px" }}>
            Esta pantalla queda enfocada en catalogo y validacion. Los informes
            contables, como libro diario o mayor, deben vivir en sus propias opciones.
          </Alert>
        </Stack>
      </Box>
    </Stack>
  );
}
