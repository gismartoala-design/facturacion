"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Search } from "lucide-react";
import { useMemo } from "react";

import { ACCOUNTING_GROUP_TONES } from "@/modules/accounting/lib/format";
import type {
  AccountNature,
  AccountRow,
} from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";
import { Grid } from "@mui/material";

type AccountPlanGridProps = {
  rows: AccountRow[];
  loading: boolean;
  search: string;
  onlyPostable: boolean;
  includeInactive: boolean;
  selectedAccountId: string | null;
  onSearchChange: (value: string) => void;
  onOnlyPostableChange: (checked: boolean) => void;
  onIncludeInactiveChange: (checked: boolean) => void;
  onRowClick: (accountId: string) => void;
  onRowDoubleClick: () => void;
  formatCompactNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string | null) => string;
};

export function AccountPlanGrid({
  rows,
  loading,
  search,
  onlyPostable,
  includeInactive,
  selectedAccountId,
  onSearchChange,
  onOnlyPostableChange,
  onIncludeInactiveChange,
  onRowClick,
  onRowDoubleClick,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
}: AccountPlanGridProps) {
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
        flex: 1.25,
        renderCell: (params) => (
          <Stack
            spacing={0.35}
            sx={{
              minWidth: 0,
              py: 1,
              pl: `${Math.max(0, params.row.level - 1) * 1.1}rem`,
            }}
          >
            <Stack direction="row" spacing={0.8} alignItems="center">
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
              {params.row.system ? (
                <Chip
                  size="small"
                  label="Base"
                  color="default"
                  variant="outlined"
                  sx={{ borderRadius: "999px", fontWeight: 700 }}
                />
              ) : null}
            </Stack>
            <Typography
              variant="caption"
              sx={{
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.row.description || "Sin descripcion"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "groupLabel",
        headerName: "Grupo",
        width: 130,
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
        width: 120,
        valueFormatter: (value: AccountNature) =>
          value === "DEBIT" ? "Debito" : "Credito",
      },
      {
        field: "parentCode",
        headerName: "Padre",
        width: 110,
        valueFormatter: (value: string | null) => value ?? "Raiz",
      },
      {
        field: "acceptsPostings",
        headerName: "Postable",
        width: 120,
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
        field: "active",
        headerName: "Estado",
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? "Activa" : "Inactiva"}
            color={params.row.active ? "primary" : "default"}
            variant={params.row.active ? "filled" : "outlined"}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          />
        ),
      },
      {
        field: "usageCount",
        headerName: "Movs.",
        width: 90,
        valueFormatter: (value: number) => formatCompactNumber(value),
      },
      {
        field: "balance",
        headerName: "Saldo acumulado",
        width: 150,
        valueFormatter: (value: number) => formatCurrency(value),
      },
      {
        field: "lastPostedAt",
        headerName: "Ultimo uso",
        width: 180,
        valueFormatter: (value: string | null) => formatDateTime(value),
      },
    ],
    [formatCompactNumber, formatCurrency, formatDateTime],
  );

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <TextField
            size="small"
            placeholder="Buscar por codigo, nombre, padre o descripcion"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            sx={{ minWidth: { lg: 380 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#64748b" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Switch
                checked={onlyPostable}
                onChange={(event) => onOnlyPostableChange(event.target.checked)}
              />
            }
            label="Solo postables"
          />
          <FormControlLabel
            control={
              <Switch
                checked={includeInactive}
                onChange={(event) =>
                  onIncludeInactiveChange(event.target.checked)
                }
              />
            }
            label="Ver inactivas"
          />
        </Stack>
      </Grid>

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
          getRowId={(row) => row.id}
          loading={loading}
          disableColumnMenu
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          onRowClick={(params) => onRowClick(params.row.id)}
          onRowDoubleClick={() => onRowDoubleClick()}
          getRowClassName={(params) =>
            params.row.id === selectedAccountId
              ? "account-plan-row-selected"
              : ""
          }
          pageSizeOptions={[10, 25, 50, 100]}
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
            minHeight: 520,
            "& .MuiDataGrid-cell": {
              fontSize: 13,
              alignItems: "center",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontSize: 13,
              fontWeight: 700,
            },
            "& .account-plan-row-selected": {
              backgroundColor: "rgba(59, 130, 246, 0.06)",
            },
            "& .account-plan-row-selected:hover": {
              backgroundColor: "rgba(59, 130, 246, 0.09)",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none",
            },
          }}
        />
      </Box>
    </Stack>
  );
}
