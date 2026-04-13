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

type HallRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  tableCount: number;
};

type HallFormState = {
  name: string;
  sortOrder: string;
  active: boolean;
};

const DEFAULT_HALL_CODE = "SG01";

const EMPTY_FORM: HallFormState = {
  name: "",
  sortOrder: "0",
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

export function RestaurantHallsSettingsScreen() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState<HallRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<HallRow | null>(null);
  const [form, setForm] = useState<HallFormState>(EMPTY_FORM);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchJson<HallRow[]>("/api/v1/restaurant/admin/dining-areas");
      setRows(data);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración de salones",
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
      [row.code, row.name].join(" ").toLowerCase().includes(query),
    );
  }, [rows, search]);

  function openCreateDialog() {
    const nextSortOrder =
      rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;

    setEditingRow(null);
    setForm({
      name: "",
      sortOrder: String(nextSortOrder),
      active: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(row: HallRow) {
    setEditingRow(row);
    setForm({
      name: row.name,
      sortOrder: String(row.sortOrder),
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
        name: form.name,
        sortOrder: Number(form.sortOrder),
        active: form.active,
      };

      const saved = editingRow
        ? await fetchJson<HallRow>(
            `/api/v1/restaurant/admin/dining-areas/${editingRow.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await fetchJson<HallRow>("/api/v1/restaurant/admin/dining-areas", {
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

          if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
          }

          return left.name.localeCompare(right.name, "es");
        });
      });

      setDialogOpen(false);
      setEditingRow(null);
      setForm(EMPTY_FORM);
      setMessage(
        editingRow
          ? "Salón actualizado correctamente"
          : "Salón creado correctamente",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar el salón",
      );
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<GridColDef<HallRow>[]>(
    () => [
      {
        field: "code",
        headerName: "Código",
        minWidth: 120,
        flex: 0.75,
      },
      {
        field: "name",
        headerName: "Salón",
        minWidth: 220,
        flex: 1.4,
        renderCell: (params) => (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0, py: 0.75 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {params.row.name}
            </Typography>
            {params.row.code === DEFAULT_HALL_CODE ? (
              <Chip size="small" label="Default" color="primary" variant="outlined" />
            ) : null}
          </Stack>
        ),
      },
      {
        field: "sortOrder",
        headerName: "Orden",
        minWidth: 100,
        flex: 0.55,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "active",
        headerName: "Activo",
        minWidth: 110,
        flex: 0.6,
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
        field: "tableCount",
        headerName: "Mesas",
        minWidth: 110,
        flex: 0.65,
        align: "center",
        headerAlign: "center",
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
            aria-label={`Editar ${params.row.name}`}
          >
            <Pencil size={16} />
          </IconButton>
        ),
      },
    ],
    [],
  );

  const editingDefaultHall = editingRow?.code === DEFAULT_HALL_CODE;

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={0.75}>
            <Typography
              variant="h5"
              sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
            >
              Configuración de salón
            </Typography>
            <Typography
              sx={{
                maxWidth: 720,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Organiza los salones disponibles y conserva un Salón General como
              base operativa.
            </Typography>
          </Stack>
        </Box>
      </Grid>

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
                    >
                      Nuevo salón
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
                      : "No hay salones configurados todavía.",
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
        <DialogTitle>{editingRow ? "Editar salón" : "Nuevo salón"}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="restaurant-hall-form"
            onSubmit={handleSubmit}
            sx={{
              pt: 1,
              display: "grid",
              gap: 1.5,
            }}
          >
            <TextField
              label="Nombre"
              size="small"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              required
              autoFocus
              disabled={editingDefaultHall}
              helperText={
                editingDefaultHall
                  ? "Salón General se mantiene como base operativa del sistema."
                  : "Usa un nombre corto y operativo."
              }
            />

            <TextField
              label="Orden"
              size="small"
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sortOrder: event.target.value,
                }))
              }
              inputProps={{ min: 0, step: "1" }}
              required
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Activo
              </Typography>
              <Switch
                checked={editingDefaultHall ? true : form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
                disabled={editingDefaultHall}
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
            form="restaurant-hall-form"
            disabled={saving}
            variant="contained"
          >
            {saving ? "Guardando..." : editingRow ? "Guardar cambios" : "Crear salón"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
