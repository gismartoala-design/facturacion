"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MuiButton from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  ClipboardCheck,
  ClipboardList,
  ClipboardX,
  History,
  Plus,
  RefreshCcw,
  Save,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { StockTakingSummary } from "@/modules/inventory/stock-taking/types";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

import type {
  StockTakingFilter,
  StockTakingRow,
} from "../hooks/use-stock-taking-page";

type StockTakingSectionProps = {
  rows: StockTakingRow[];
  search: string;
  onSearchChange: (value: string) => void;
  filter: StockTakingFilter;
  onFilterChange: (value: StockTakingFilter) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onCountChange: (productId: string, value: string) => void;
  onCountFocus: (productId: string) => void;
  onCountBlur: (productId: string) => void;
  onFillWithSystemStock: () => void;
  onClearCounts: () => void;
  onStartNewTaking: () => void;
  onSaveDraft: () => void;
  onApplyTaking: () => void;
  onOpenTaking: (id: string) => void;
  takings: StockTakingSummary[];
  activeTaking: StockTakingSummary | null;
  saving: boolean;
  loadingTakingId: string | null;
  canEdit: boolean;
  canSaveDraft: boolean;
  canApplyTaking: boolean;
  draftDirty: boolean;
  summary: {
    totalItems: number;
    countedItems: number;
    invalidItems: number;
    rowsWithDifference: number;
    unchangedItems: number;
    pendingCountItems: number;
  };
};

export function StockTakingSection({
  rows,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  notes,
  onNotesChange,
  onCountChange,
  onCountFocus,
  onCountBlur,
  onFillWithSystemStock,
  onClearCounts,
  onStartNewTaking,
  onSaveDraft,
  onApplyTaking,
  onOpenTaking,
  takings,
  activeTaking,
  saving,
  loadingTakingId,
  canEdit,
  canSaveDraft,
  canApplyTaking,
  draftDirty,
  summary,
}: StockTakingSectionProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activeLabel = activeTaking
    ? `Toma #${activeTaking.takingNumber}`
    : "Nueva toma";

  const statusLabel =
    activeTaking?.status === "APPLIED" ? "Aplicada" : "Borrador";

  const statusChipStyles =
    activeTaking?.status === "APPLIED"
      ? {
          backgroundColor: "#ecfdf3",
          color: "#15803d",
          border: "1px solid #86efac",
        }
      : {
          backgroundColor: "#fff7ed",
          color: "#c2410c",
          border: "1px solid #fdba74",
        };

  const columns = useMemo<GridColDef<StockTakingRow>[]>(
    () => [
      {
        field: "codigo",
        headerName: "Codigo",
        minWidth: 150,
        flex: 0.8,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            {params.row.codigo}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "Producto",
        minWidth: 260,
        flex: 1.5,
      },
      {
        field: "quantity",
        headerName: "Sistema actual",
        type: "number",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "savedSystemQuantity",
        headerName: "Sistema base",
        type: "number",
        minWidth: 120,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "countedQuantity",
        headerName: "Conteo fisico",
        minWidth: 170,
        flex: 0.9,
        sortable: false,
        renderCell: (params) => (
          <TextField
            size="small"
            value={params.row.countedQuantity}
            onChange={(event) =>
              onCountChange(params.row.productId, event.target.value)
            }
            onFocus={() => onCountFocus(params.row.productId)}
            onBlur={() => onCountBlur(params.row.productId)}
            placeholder="0.000"
            error={params.row.invalid}
            disabled={!canEdit || saving}
            slotProps={{
              htmlInput: {
                min: 0,
                step: "0.001",
                inputMode: "decimal",
              },
            }}
            sx={{
              width: "100%",
              minWidth: 130,
              "& .MuiInputBase-root": {
                backgroundColor: "#fffdf7",
              },
            }}
          />
        ),
      },
      {
        field: "difference",
        headerName: "Diferencia",
        minWidth: 130,
        flex: 0.75,
        align: "right",
        headerAlign: "right",
        sortable: false,
        renderCell: (params) => {
          if (params.row.invalid) {
            return (
              <span className="w-full text-right text-[#b91c1c]">Inválido</span>
            );
          }

          if (!params.row.hasCount || params.row.difference === null) {
            return <span className="w-full text-right text-[#6b7280]">-</span>;
          }

          const value = params.row.difference;
          const color =
            Math.abs(value) <= 0.000_001
              ? "#15803d"
              : value > 0
                ? "#1d4ed8"
                : "#b45309";

          return (
            <span className="w-full text-right font-semibold" style={{ color }}>
              {value > 0 ? "+" : ""}
              {value.toFixed(3)}
            </span>
          );
        },
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 150,
        flex: 0.8,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          let label = "Sin contar";
          let sx = {
            backgroundColor: "#f3f4f6",
            color: "#4b5563",
            border: "1px solid #d1d5db",
          };

          if (params.row.invalid) {
            label = "Inválido";
            sx = {
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            };
          } else if (params.row.systemChangedSinceDraft) {
            label = "Base cambió";
            sx = {
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #93c5fd",
            };
          } else if (params.row.hasCount && params.row.difference !== null) {
            if (Math.abs(params.row.difference) <= 0.000_001) {
              label = "Sin diferencia";
              sx = {
                backgroundColor: "#ecfdf3",
                color: "#15803d",
                border: "1px solid #86efac",
              };
            } else {
              label = "Pendiente aplicar";
              sx = {
                backgroundColor: "#fff7ed",
                color: "#c2410c",
                border: "1px solid #fdba74",
              };
            }
          }

          return (
            <Chip
              label={label}
              size="small"
              sx={{
                borderRadius: "999px",
                fontWeight: 700,
                ...sx,
              }}
            />
          );
        },
      },
    ],
    [canEdit, onCountBlur, onCountChange, onCountFocus, saving],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="Toma de Inventario"
          description="Captura el conteo fisico de cada producto y aplica solo las diferencias contra el stock del sistema."
          titleColor="#4a3c58"
          descriptionColor="rgba(74, 60, 88, 0.68)"
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
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
              <Stack spacing={2}>
                <Grid
                  container
                  spacing={2}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <Grid size={{ xs: 12, md: "grow" }}>
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Typography
                          variant="h6"
                          sx={{ color: "#4a3c58", fontWeight: 700 }}
                        >
                          {activeLabel}
                        </Typography>

                        <Chip
                          size="small"
                          label={statusLabel}
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 700,
                            ...statusChipStyles,
                          }}
                        />

                        {draftDirty ? (
                          <Chip
                            size="small"
                            label="Cambios sin guardar"
                            sx={{
                              borderRadius: "999px",
                              fontWeight: 700,
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fcd34d",
                            }}
                          />
                        ) : null}
                      </Stack>

                      <Typography
                        sx={{
                          color: "rgba(74, 60, 88, 0.7)",
                          fontSize: 14,
                        }}
                      >
                        {activeTaking
                          ? `Productos guardados: ${activeTaking.itemCount}. Diferencias registradas: ${activeTaking.rowsWithDifference}.`
                          : "Empieza una toma nueva, guarda el borrador y aplica cuando el conteo esté listo."}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: "auto" }}>
                    <Grid
                      container
                      spacing={1}
                      justifyContent={{ xs: "stretch", md: "flex-end" }}
                    >
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="outlined"
                          onClick={() => setIsHistoryOpen(true)}
                          disabled={saving}
                          startIcon={<History className="h-4 w-4" />}
                        >
                          Tomas recientes
                        </MuiButton>
                      </Grid>
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="outlined"
                          onClick={onStartNewTaking}
                          disabled={saving}
                          startIcon={<Plus className="h-4 w-4" />}
                        >
                          Nueva toma
                        </MuiButton>
                      </Grid>
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="outlined"
                          onClick={onSaveDraft}
                          disabled={saving || !canSaveDraft}
                          startIcon={<Save className="h-4 w-4" />}
                        >
                          Guardar borrador
                        </MuiButton>
                      </Grid>
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="contained"
                          onClick={onApplyTaking}
                          disabled={saving || !canApplyTaking}
                          startIcon={<ClipboardCheck className="h-4 w-4" />}
                        >
                          Aplicar toma
                        </MuiButton>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <TextField
                  label="Notas operativas"
                  placeholder="Observaciones del conteo, responsable, novedades de bodega..."
                  value={notes}
                  onChange={(event) => onNotesChange(event.target.value)}
                  disabled={!canEdit || saving}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </Grid>

            <Grid size={12}>
              <Grid
                container
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Grid size={{ xs: 12, md: "grow" }}>
                  <Box
                    sx={{ position: "relative", width: "100%", maxWidth: 360 }}
                  >
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b1a1c6]" />
                    <Input
                      placeholder="Buscar por codigo o producto..."
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="border-[#e8d5e5]/70 bg-[#fdfcf5]/75 pl-9"
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: "auto" }}>
                  <Grid
                    container
                    spacing={1}
                    justifyContent={{ xs: "stretch", md: "flex-end" }}
                  >
                    <Grid size={{ xs: 12, sm: "auto" }}>
                      <MuiButton
                        type="button"
                        variant="outlined"
                        onClick={onFillWithSystemStock}
                        disabled={saving || !canEdit}
                        startIcon={<RefreshCcw className="h-4 w-4" />}
                      >
                        Copiar base
                      </MuiButton>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "auto" }}>
                      <MuiButton
                        type="button"
                        variant="outlined"
                        onClick={onClearCounts}
                        disabled={saving || !canEdit}
                        startIcon={<ClipboardX className="h-4 w-4" />}
                      >
                        Limpiar
                      </MuiButton>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "auto" }}>
                      <Chip
                        label={`${summary.countedItems} contados / ${summary.pendingCountItems} pendientes`}
                        sx={{
                          height: 36,
                          borderRadius: "999px",
                          fontWeight: 700,
                          backgroundColor: "#f3f0ff",
                          color: "#4a3c58",
                          border: "1px solid #d8ccf5",
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={12}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={filter}
                onChange={(_event, value: StockTakingFilter | null) => {
                  if (value) {
                    onFilterChange(value);
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
                <ToggleButton value="PENDING_COUNT">
                  Pendientes por contar ({summary.pendingCountItems})
                </ToggleButton>
                <ToggleButton value="WITH_DIFFERENCE">
                  Con diferencia ({summary.rowsWithDifference})
                </ToggleButton>
                <ToggleButton value="UNCHANGED">
                  Sin diferencia ({summary.unchangedItems})
                </ToggleButton>
                <ToggleButton value="INVALID">
                  Inválidos ({summary.invalidItems})
                </ToggleButton>
                <ToggleButton value="ALL">
                  Todos ({summary.totalItems})
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid size={12}>
              <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => row.productId}
                disableRowSelectionOnClick
                disableColumnMenu
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 10 },
                  },
                }}
                localeText={{
                  noRowsLabel: search
                    ? `Sin resultados para "${search}".`
                    : "Sin productos pendientes en este filtro.",
                }}
                sx={{
                  height: 640,
                  "& .MuiDataGrid-cell": {
                    alignItems: "center",
                  },
                }}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Dialog
        open={isHistoryOpen}
        onClose={() => {
          if (!saving) {
            setIsHistoryOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Tomas recientes</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {takings.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: "20px",
                  px: 2,
                  py: 2.5,
                  textAlign: "center",
                  borderStyle: "dashed",
                }}
              >
                <Typography
                  sx={{ color: "rgba(74, 60, 88, 0.7)", fontSize: 14 }}
                >
                  Aún no hay tomas guardadas en este negocio.
                </Typography>
              </Paper>
            ) : (
              takings.map((taking) => {
                const selected = activeTaking?.id === taking.id;

                return (
                  <Paper
                    key={taking.id}
                    variant="outlined"
                    sx={{
                      borderRadius: "20px",
                      px: 2,
                      py: 2,
                      borderColor: selected ? "#c4b5fd" : "#eadfd9",
                      backgroundColor: selected ? "#faf5ff" : "#fff",
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography sx={{ fontWeight: 700, color: "#4a3c58" }}>
                          #{taking.takingNumber}
                        </Typography>
                        <Chip
                          size="small"
                          label={
                            taking.status === "APPLIED"
                              ? "Aplicada"
                              : "Borrador"
                          }
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 700,
                            ...(taking.status === "APPLIED"
                              ? {
                                  backgroundColor: "#ecfdf3",
                                  color: "#15803d",
                                  border: "1px solid #86efac",
                                }
                              : {
                                  backgroundColor: "#fff7ed",
                                  color: "#c2410c",
                                  border: "1px solid #fdba74",
                                }),
                          }}
                        />
                      </Stack>

                      <Typography
                        sx={{ fontSize: 13, color: "rgba(74, 60, 88, 0.68)" }}
                      >
                        {dateFormatter.format(new Date(taking.createdAt))}
                      </Typography>

                      <Typography sx={{ fontSize: 13, color: "#4a3c58" }}>
                        {taking.itemCount} productos |{" "}
                        {taking.rowsWithDifference} con diferencia
                      </Typography>

                      {taking.notes ? (
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "rgba(74, 60, 88, 0.72)",
                            display: "-webkit-box",
                            overflow: "hidden",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {taking.notes}
                        </Typography>
                      ) : null}

                      <MuiButton
                        type="button"
                        variant={selected ? "contained" : "outlined"}
                        onClick={() => {
                          onOpenTaking(taking.id);
                          setIsHistoryOpen(false);
                        }}
                        disabled={saving || loadingTakingId === taking.id}
                        startIcon={<ClipboardList className="h-4 w-4" />}
                      >
                        {loadingTakingId === taking.id
                          ? "Abriendo..."
                          : selected
                            ? "Activa"
                            : "Abrir"}
                      </MuiButton>
                    </Stack>
                  </Paper>
                );
              })
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <MuiButton
            type="button"
            onClick={() => setIsHistoryOpen(false)}
            disabled={saving}
          >
            Cerrar
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
