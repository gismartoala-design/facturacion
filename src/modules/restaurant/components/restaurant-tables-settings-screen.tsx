"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { fetchJson } from "@/shared/dashboard/api";

type HallOption = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type TableRow = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  active: boolean;
  diningAreaId: string;
  diningAreaName: string | null;
};

type TableFormState = {
  diningAreaId: string;
  capacity: string;
  active: boolean;
};

const EMPTY_FORM: TableFormState = {
  diningAreaId: "",
  capacity: "4",
  active: true,
};

const GRID_SX = {
  height: 600,
  "& .MuiDataGrid-cell": {
    fontSize: 13,
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: 13,
    fontWeight: 700,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
} as const;

export function RestaurantTablesSettingsScreen() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState<TableRow[]>([]);
  const [areas, setAreas] = useState<HallOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [form, setForm] = useState<TableFormState>(EMPTY_FORM);

  async function loadData() {
    setLoading(true);
    try {
      const [tableData, areaData] = await Promise.all([
        fetchJson<TableRow[]>("/api/v1/restaurant/admin/tables"),
        fetchJson<HallOption[]>("/api/v1/restaurant/admin/dining-areas"),
      ]);

      setRows(tableData);
      setAreas(areaData);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración de mesas",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [row.code, row.diningAreaName ?? "", row.capacity.toString()]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  function getDefaultAreaId() {
    return areas.find((area) => area.active)?.id ?? areas[0]?.id ?? "";
  }

  function openCreateDialog() {
    setEditingRow(null);
    setForm({
      diningAreaId: getDefaultAreaId(),
      capacity: "4",
      active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(row: TableRow) {
    setEditingRow(row);
    setForm({
      diningAreaId: row.diningAreaId,
      capacity: String(row.capacity),
      active: row.active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        diningAreaId: form.diningAreaId,
        capacity: Number(form.capacity),
        active: form.active,
      };

      const saved = editingRow
        ? await fetchJson<TableRow>(`/api/v1/restaurant/admin/tables/${editingRow.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await fetchJson<TableRow>("/api/v1/restaurant/admin/tables", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setRows((current) => {
        if (editingRow) {
          return current.map((row) => (row.id === editingRow.id ? saved : row));
        }

        return [...current, saved].sort((left, right) => {
          if (left.active !== right.active) {
            return left.active ? -1 : 1;
          }

          const leftCode = Number(left.code);
          const rightCode = Number(right.code);
          if (Number.isInteger(leftCode) && Number.isInteger(rightCode)) {
            return leftCode - rightCode;
          }

          return left.code.localeCompare(right.code, "es");
        });
      });

      setDialogOpen(false);
      setEditingRow(null);
      setForm(EMPTY_FORM);
      setMessage(
        editingRow
          ? "Mesa actualizada correctamente"
          : "Mesa creada correctamente",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar la mesa",
      );
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<GridColDef<TableRow>[]>(
    () => [
      {
        field: "code",
        headerName: "Código",
        minWidth: 110,
        flex: 0.65,
      },
      {
        field: "diningAreaName",
        headerName: "Salón",
        minWidth: 180,
        flex: 1.1,
        valueGetter: (_value, row) => row.diningAreaName || "-",
      },
      {
        field: "capacity",
        headerName: "Capacidad",
        minWidth: 110,
        flex: 0.7,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "active",
        headerName: "Activo",
        minWidth: 110,
        flex: 0.65,
        renderCell: (params) => (
          <Chip
            label={params.row.active ? "Sí" : "No"}
            size="small"
            color={params.row.active ? "primary" : "default"}
            variant={params.row.active ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 110,
        flex: 0.65,
        renderCell: (params) => (
          <IconButton
            size="small"
            onClick={() => openEditDialog(params.row)}
            aria-label={`Editar mesa ${params.row.code}`}
          >
            <Pencil size={16} />
          </IconButton>
        ),
      },
    ],
    [],
  );

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={0.75}>
            <Typography
              variant="h5"
              sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
            >
              Configuración de mesas
            </Typography>
            <Typography
              sx={{
                maxWidth: 720,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Registra mesas con código automático, salón asignado y capacidad
              operativa.
            </Typography>
          </Stack>
        </Box>
      </Grid>

      {!areas.length ? (
        <Grid size={12}>
          <Alert severity="warning" variant="outlined">
            Primero necesitas al menos un salón activo para registrar mesas.
          </Alert>
        </Grid>
      ) : null}

      {message ? (
        <Grid size={12}>
          <Alert
            severity={
              message.toLowerCase().includes("no se pudo") ? "error" : "success"
            }
            variant="outlined"
          >
            {message}
          </Alert>
        </Grid>
      ) : null}

      <Grid size={12}>
        <Card variant="outlined" sx={{ borderRadius: "22px" }}>
          <CardContent
            sx={{
              p: { xs: 1.5, sm: 2 },
              "&:last-child": { pb: { xs: 1.5, sm: 2 } },
            }}
          >
            <Grid container spacing={2}>
              <Grid size={12}>
                <Grid
                  container
                  spacing={1.5}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <Grid size={{ xs: 12, md: "grow" }}>
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        maxWidth: 320,
                      }}
                    >
                      <Search
                        size={16}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          opacity: 0.6,
                        }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Buscar por código o salón"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        sx={{
                          "& .MuiInputBase-input": {
                            pl: 3.5,
                          },
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: "auto" }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Plus size={16} />}
                      onClick={openCreateDialog}
                      disabled={!areas.length}
                    >
                      Nueva mesa
                    </Button>
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={12}>
                <DataGrid
                  rows={filteredRows}
                  columns={columns}
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  loading={loading}
                  pageSizeOptions={[10, 20, 50]}
                  initialState={{
                    pagination: {
                      paginationModel: { page: 0, pageSize: 10 },
                    },
                  }}
                  localeText={{
                    noRowsLabel: search
                      ? `Sin resultados para "${search}".`
                      : "No hay mesas configuradas todavía.",
                  }}
                  sx={GRID_SX}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreenDialog}
      >
        <DialogTitle>{editingRow ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="restaurant-table-form"
            onSubmit={handleSubmit}
            sx={{
              pt: 1,
              display: "grid",
              gap: 1.5,
            }}
          >
            <Alert severity="info" variant="outlined">
              El código de mesa se asigna automáticamente al guardar.
            </Alert>

            <TextField
              select
              label="Salón"
              size="small"
              value={form.diningAreaId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  diningAreaId: event.target.value,
                }))
              }
              required
            >
              {areas.map((area) => (
                <MenuItem key={area.id} value={area.id}>
                  {area.code} · {area.name}
                  {!area.active ? " · inactivo" : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Capacidad"
              size="small"
              type="number"
              value={form.capacity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  capacity: event.target.value,
                }))
              }
              inputProps={{ min: 1, step: "1" }}
              required
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Activa
              </Typography>
              <Switch
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving} variant="outlined">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="restaurant-table-form"
            disabled={saving}
            variant="contained"
          >
            {saving ? "Guardando..." : editingRow ? "Guardar cambios" : "Crear mesa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
