"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MuiButton from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { BookOpenText } from "lucide-react";
import { useMemo } from "react";

import type { KardexMovementFilter } from "../hooks/use-kardex-page";
import type { KardexEntry } from "../types";

type ProductOption = {
  productId: string;
  label: string;
};

type KardexSectionProps = {
  entries: KardexEntry[];
  selectedProductId: string;
  onSelectedProductIdChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  movementFilter: KardexMovementFilter;
  onMovementFilterChange: (value: KardexMovementFilter) => void;
  onClearFilters: () => void;
  productOptions: Array<{
    productId: string;
    label: string;
  }>;
  summary: {
    total: number;
    visible: number;
    incomes: number;
    outcomes: number;
    adjustments: number;
  };
};

function formatSignedQuantity(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
}

export function KardexSection({
  entries,
  selectedProductId,
  onSelectedProductIdChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  movementFilter,
  onMovementFilterChange,
  onClearFilters,
  productOptions,
  summary,
}: KardexSectionProps) {
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const columns = useMemo<GridColDef<KardexEntry>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "Fecha",
        minWidth: 170,
        flex: 0.95,
        valueFormatter: (value) => dateFormatter.format(new Date(String(value))),
      },
      {
        field: "productCode",
        headerName: "Codigo",
        minWidth: 140,
        flex: 0.8,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            {params.row.productCode}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "Producto",
        minWidth: 240,
        flex: 1.5,
      },
      {
        field: "movementType",
        headerName: "Movimiento",
        minWidth: 150,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => {
          const chipStyles =
            params.row.movementType === "IN"
              ? {
                  backgroundColor: "#ecfdf3",
                  color: "#15803d",
                  border: "1px solid #86efac",
                }
              : params.row.movementType === "OUT"
                ? {
                    backgroundColor: "#fef2f2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                  }
                : {
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #93c5fd",
                  };

          return (
            <Chip
              label={params.row.movementLabel}
              size="small"
              sx={{
                borderRadius: "999px",
                fontWeight: 700,
                ...chipStyles,
              }}
            />
          );
        },
      },
      {
        field: "referenceLabel",
        headerName: "Origen",
        minWidth: 120,
        flex: 0.75,
      },
      {
        field: "signedQuantity",
        headerName: "Cantidad",
        minWidth: 130,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const value = params.row.signedQuantity;
          const color =
            value > 0 ? "#15803d" : value < 0 ? "#b91c1c" : "#4b5563";

          return (
            <span className="w-full text-right font-semibold" style={{ color }}>
              {formatSignedQuantity(value)}
            </span>
          );
        },
      },
      {
        field: "balanceBefore",
        headerName: "Saldo anterior",
        minWidth: 135,
        flex: 0.8,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "balanceAfter",
        headerName: "Saldo resultante",
        minWidth: 145,
        flex: 0.85,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "createdByName",
        headerName: "Usuario",
        minWidth: 150,
        flex: 0.8,
        valueGetter: (_value, row) => row.createdByName ?? "-",
      },
      {
        field: "notes",
        headerName: "Detalle",
        minWidth: 260,
        flex: 1.6,
        valueGetter: (_value, row) => row.notes ?? "-",
      },
    ],
    [dateFormatter],
  );

  const hasActiveFilters =
    selectedProductId !== "ALL" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    movementFilter !== "ALL";

  const autocompleteOptions = useMemo<ProductOption[]>(
    () => [{ productId: "ALL", label: "Todos los productos" }, ...productOptions],
    [productOptions],
  );

  const selectedProductOption = useMemo(
    () =>
      autocompleteOptions.find((option) => option.productId === selectedProductId) ??
      autocompleteOptions[0],
    [autocompleteOptions, selectedProductId],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={0.75}>
            <Typography
              variant="h5"
              sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
            >
              Kardex de Inventario
            </Typography>
            <Typography
              sx={{
                maxWidth: 760,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Historial operativo de entradas, salidas y ajustes con saldo
              anterior y saldo resultante por producto.
            </Typography>
          </Stack>
        </Box>
      </Grid>

      <Grid size={12}>
        <Paper
          sx={{
            borderRadius: "28px",
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Grid
                container
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Grid size={{ xs: 12, md: "grow" }}>
                  <Grid
                    container
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Autocomplete
                        options={autocompleteOptions}
                        value={selectedProductOption}
                        onChange={(_event, option) =>
                          onSelectedProductIdChange(option?.productId ?? "ALL")
                        }
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) =>
                          option.productId === value.productId
                        }
                        fullWidth
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Producto"
                            placeholder="Buscar producto..."
                          />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                      <TextField
                        type="date"
                        size="small"
                        fullWidth
                        label="Desde"
                        value={dateFrom}
                        onChange={(event) => onDateFromChange(event.target.value)}
                        slotProps={{
                          inputLabel: {
                            shrink: true,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
                      <TextField
                        type="date"
                        size="small"
                        fullWidth
                        label="Hasta"
                        value={dateTo}
                        onChange={(event) => onDateToChange(event.target.value)}
                        slotProps={{
                          inputLabel: {
                            shrink: true,
                          },
                        }}
                      />
                    </Grid>

                    {hasActiveFilters ? (
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="outlined"
                          onClick={onClearFilters}
                        >
                          Limpiar
                        </MuiButton>
                      </Grid>
                    ) : null}
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12, md: "auto" }}>
                  <Chip
                    label={`${summary.visible} de ${summary.total} movimientos`}
                    sx={{
                      height: 36,
                      borderRadius: "999px",
                      fontWeight: 700,
                      backgroundColor: "#f3f0ff",
                      color: "#4a3c58",
                      border: "1px solid #d8ccf5",
                    }}
                    icon={<BookOpenText className="h-4 w-4" />}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid size={12}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={movementFilter}
                onChange={(_event, value: KardexMovementFilter | null) => {
                  if (value) {
                    onMovementFilterChange(value);
                  }
                }}
                sx={{
                  flexWrap: "wrap",
                  gap: 1,
                  "& .MuiToggleButton-root": {
                    borderRadius: "999px !important",
                    border: "1px solid #e8d5e5 !important",
                    px: 1.5,
                  },
                }}
              >
                <ToggleButton value="ALL">Todos ({summary.total})</ToggleButton>
                <ToggleButton value="IN">
                  Ingresos ({summary.incomes})
                </ToggleButton>
                <ToggleButton value="OUT">
                  Salidas ({summary.outcomes})
                </ToggleButton>
                <ToggleButton value="ADJUSTMENT">
                  Ajustes ({summary.adjustments})
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid size={12}>
              <DataGrid
                rows={entries}
                columns={columns}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                disableColumnMenu
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 25 },
                  },
                }}
                localeText={{
                  noRowsLabel: hasActiveFilters
                    ? "Sin resultados con los filtros actuales."
                    : "Sin movimientos de inventario aun.",
                }}
                sx={{
                  height: 680,
                  "& .MuiDataGrid-cell": {
                    alignItems: "center",
                  },
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}
