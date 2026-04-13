"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CookingPot,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { fetchJson } from "@/shared/dashboard/api";

type DishRow = {
  id: string;
  codigo: string;
  nombre: string;
  tipoProducto: "BIEN" | "SERVICIO";
  activo: boolean;
  precio: number;
  restaurantVisible: boolean;
  restaurantCategory: string | null;
  restaurantStationCode: string | null;
  allowsModifiers: boolean;
  prepTimeMinutes: number | null;
  recipeConsumptionEnabled: boolean;
  hasRecipe: boolean;
  ingredientCount: number;
};

type StationOption = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type InventoryProductOption = {
  id: string;
  codigo: string;
  nombre: string;
  tipoProducto: "BIEN" | "SERVICIO";
  activo: boolean;
  stock: number;
};

type DishFormState = {
  nombre: string;
  tipoProducto: "BIEN" | "SERVICIO";
  precio: string;
  restaurantCategory: string;
  restaurantVisible: boolean;
  prepTimeMinutes: string;
  restaurantStationCode: string;
  activo: boolean;
};

type RecipeIngredientFormRow = {
  localId: string;
  productId: string;
  quantity: string;
  usePrepBatches: boolean;
  notes: string;
};

type RecipeDetail = {
  productId: string;
  productName: string;
  recipeConsumptionEnabled: boolean;
  notes: string | null;
  ingredients: Array<{
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    productType: "BIEN" | "SERVICIO";
    active: boolean;
    quantity: number;
    usePrepBatches: boolean;
    notes: string | null;
  }>;
};

type RecipeFormState = {
  recipeConsumptionEnabled: boolean;
  notes: string;
  ingredients: RecipeIngredientFormRow[];
};

type RestaurantDishesSettingsScreenProps = {
  recipeCapabilityEnabled: boolean;
};

const EMPTY_FORM: DishFormState = {
  nombre: "",
  tipoProducto: "SERVICIO",
  precio: "",
  restaurantCategory: "",
  restaurantVisible: true,
  prepTimeMinutes: "",
  restaurantStationCode: "",
  activo: true,
};

const EMPTY_RECIPE_FORM: RecipeFormState = {
  recipeConsumptionEnabled: false,
  notes: "",
  ingredients: [],
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
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
    {
      outline: "none",
    },
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function createRecipeIngredientRow(
  overrides?: Partial<RecipeIngredientFormRow>,
): RecipeIngredientFormRow {
  return {
    localId: crypto.randomUUID(),
    productId: "",
    quantity: "",
    usePrepBatches: false,
    notes: "",
    ...overrides,
  };
}

function buildRecipeStatus(
  row: DishRow,
): {
  label: string;
  color: "warning" | "success" | "default";
  variant: "filled" | "outlined";
} {
  if (!row.recipeConsumptionEnabled) {
    return {
      label: "Receta opcional apagada",
      color: "default",
      variant: "outlined",
    };
  }

  if (row.hasRecipe) {
    return {
      label: `Receta configurada${row.ingredientCount > 0 ? ` · ${row.ingredientCount}` : ""}`,
      color: "success",
      variant: "filled",
    };
  }

  return {
    label: "Sin receta",
    color: "warning",
    variant: "outlined",
  };
}

export function RestaurantDishesSettingsScreen({
  recipeCapabilityEnabled,
}: RestaurantDishesSettingsScreenProps) {
  const [rows, setRows] = useState<DishRow[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<
    InventoryProductOption[]
  >([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DishRow | null>(null);
  const [form, setForm] = useState<DishFormState>(EMPTY_FORM);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [recipeDialogLoading, setRecipeDialogLoading] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);
  const [recipeRow, setRecipeRow] = useState<DishRow | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(
    EMPTY_RECIPE_FORM,
  );

  async function loadData() {
    setLoading(true);
    try {
      const [products, stationData] = await Promise.all([
        fetchJson<DishRow[]>("/api/v1/restaurant/admin/menu-products"),
        fetchJson<StationOption[]>(
          "/api/v1/restaurant/admin/kitchen-stations",
        ).catch(() => []),
      ]);
      setRows(products);
      setStations(stationData.filter((station) => station.active));
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración del menú",
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
      [
        row.codigo,
        row.nombre,
        row.restaurantCategory ?? "",
        row.restaurantStationCode ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  const openEditDialog = useCallback((row: DishRow) => {
    setEditingRow(row);
    setForm({
      nombre: row.nombre,
      tipoProducto: row.tipoProducto,
      precio: String(row.precio),
      restaurantCategory: row.restaurantCategory ?? "",
      restaurantVisible: row.restaurantVisible,
      prepTimeMinutes:
        row.prepTimeMinutes != null ? String(row.prepTimeMinutes) : "",
      restaurantStationCode: row.restaurantStationCode ?? "",
      activo: row.activo,
    });
    setDialogOpen(true);
  }, []);

  const openRecipeDialog = useCallback(async (row: DishRow) => {
    setRecipeRow(row);
    setRecipeDialogOpen(true);
    setRecipeDialogLoading(true);

    try {
      const [recipe, products] = await Promise.all([
        fetchJson<RecipeDetail>(`/api/v1/inventory/recipes/${row.id}`),
        inventoryProducts.length > 0
          ? Promise.resolve(inventoryProducts)
          : fetchJson<InventoryProductOption[]>("/api/v1/products"),
      ]);

      if (inventoryProducts.length === 0) {
        setInventoryProducts(products);
      }

      setRecipeForm({
        recipeConsumptionEnabled: recipe.recipeConsumptionEnabled,
        notes: recipe.notes ?? "",
        ingredients: recipe.ingredients.map((ingredient) =>
          createRecipeIngredientRow({
            productId: ingredient.productId,
            quantity: String(ingredient.quantity),
            usePrepBatches: ingredient.usePrepBatches,
            notes: ingredient.notes ?? "",
          }),
        ),
      });
      setMessage(null);
    } catch (error) {
      setRecipeForm({
        recipeConsumptionEnabled: row.recipeConsumptionEnabled,
        notes: "",
        ingredients: [],
      });
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la receta del ítem",
      );
    } finally {
      setRecipeDialogLoading(false);
    }
  }, [inventoryProducts]);

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
  }

  function closeRecipeDialog() {
    if (recipeSaving) return;
    setRecipeDialogOpen(false);
    setRecipeDialogLoading(false);
    setRecipeRow(null);
    setRecipeForm(EMPTY_RECIPE_FORM);
  }

  function addRecipeIngredient() {
    setRecipeForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, createRecipeIngredientRow()],
    }));
  }

  function updateRecipeIngredient(
    localId: string,
    patch: Partial<RecipeIngredientFormRow>,
  ) {
    setRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.localId === localId
          ? { ...ingredient, ...patch }
          : ingredient,
      ),
    }));
  }

  function removeRecipeIngredient(localId: string) {
    setRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (ingredient) => ingredient.localId !== localId,
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        nombre: form.nombre,
        tipoProducto: form.tipoProducto,
        precio: Number(form.precio),
        restaurantCategory: form.restaurantCategory,
        restaurantVisible: form.restaurantVisible,
        prepTimeMinutes: form.prepTimeMinutes
          ? Number(form.prepTimeMinutes)
          : null,
        restaurantStationCode: form.restaurantStationCode || "",
        activo: form.activo,
      };

      const updated = editingRow
        ? await fetchJson<DishRow>(
            `/api/v1/restaurant/admin/menu-products/${editingRow.id}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            },
          )
        : await fetchJson<DishRow>("/api/v1/restaurant/admin/menu-products", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setRows((current) => {
        if (editingRow) {
          return current.map((row) =>
            row.id === editingRow.id ? updated : row,
          );
        }

        return [updated, ...current];
      });
      setDialogOpen(false);
      setEditingRow(null);
      setForm(EMPTY_FORM);
      setMessage(
        editingRow
          ? "Ítem del menú actualizado correctamente"
          : "Ítem del menú creado correctamente",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el ítem del menú",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRecipeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recipeRow) {
      return;
    }

    const normalizedIngredients = recipeForm.ingredients
      .filter((ingredient) => ingredient.productId && ingredient.quantity)
      .map((ingredient) => ({
        productId: ingredient.productId,
        quantity: Number(ingredient.quantity),
        usePrepBatches: ingredient.usePrepBatches,
        notes: ingredient.notes,
      }));

    if (recipeForm.recipeConsumptionEnabled) {
      if (normalizedIngredients.length === 0) {
        setMessage(
          "Debes agregar al menos un ingrediente si este ítem exige receta",
        );
        return;
      }

      const uniqueIngredientIds = new Set(
        normalizedIngredients.map((ingredient) => ingredient.productId),
      );
      if (uniqueIngredientIds.size !== normalizedIngredients.length) {
        setMessage("No puedes repetir el mismo ingrediente dentro de una receta");
        return;
      }
    }

    setRecipeSaving(true);

    try {
      if (recipeForm.recipeConsumptionEnabled) {
        await fetchJson(`/api/v1/inventory/recipes`, {
          method: "POST",
          body: JSON.stringify({
            productId: recipeRow.id,
            notes: recipeForm.notes,
            ingredients: normalizedIngredients,
          }),
        });
      }

      await fetchJson<DishRow>(
        `/api/v1/restaurant/admin/menu-products/${recipeRow.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            recipeConsumptionEnabled: recipeForm.recipeConsumptionEnabled,
          }),
        },
      );

      await loadData();
      setMessage(
        recipeForm.recipeConsumptionEnabled
          ? "Receta guardada correctamente"
          : "Control por receta desactivado para este ítem",
      );
      closeRecipeDialog();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la receta del ítem",
      );
    } finally {
      setRecipeSaving(false);
    }
  }

  const columns = useMemo<GridColDef<DishRow>[]>(() => {
    const baseColumns: GridColDef<DishRow>[] = [
      {
        field: "codigo",
        headerName: "Código",
        minWidth: 110,
        flex: 0.75,
      },
      {
        field: "nombre",
        headerName: "Nombre",
        minWidth: 220,
        flex: 1.5,
      },
      {
        field: "restaurantCategory",
        headerName: "Categoría",
        minWidth: 140,
        flex: 0.95,
        valueGetter: (_value, row) => row.restaurantCategory || "-",
      },
      {
        field: "precio",
        headerName: "Precio",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
    ];

    if (recipeCapabilityEnabled) {
      baseColumns.push({
        field: "recipeStatus",
        headerName: "Receta",
        minWidth: 230,
        flex: 1.15,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const status = buildRecipeStatus(params.row);
          return (
            <Chip
              label={status.label}
              size="small"
              color={status.color}
              variant={status.variant}
            />
          );
        },
      });
    }

    baseColumns.push(
      {
        field: "restaurantVisible",
        headerName: "Visible",
        minWidth: 110,
        flex: 0.65,
        renderCell: (params) => (
          <Chip
            label={params.row.restaurantVisible ? "Sí" : "No"}
            size="small"
            color={params.row.restaurantVisible ? "success" : "default"}
            variant={params.row.restaurantVisible ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "activo",
        headerName: "Activo",
        minWidth: 110,
        flex: 0.65,
        renderCell: (params) => (
          <Chip
            label={params.row.activo ? "Sí" : "No"}
            size="small"
            color={params.row.activo ? "primary" : "default"}
            variant={params.row.activo ? "filled" : "outlined"}
          />
        ),
      },
      {
        field: "prepTimeMinutes",
        headerName: "Prep.",
        minWidth: 110,
        flex: 0.6,
        valueGetter: (_value, row) =>
          row.prepTimeMinutes != null ? `${row.prepTimeMinutes} min` : "-",
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: recipeCapabilityEnabled ? 150 : 110,
        flex: recipeCapabilityEnabled ? 0.9 : 0.65,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5}>
            {recipeCapabilityEnabled ? (
              <Tooltip title="Receta e inventario">
                <IconButton
                  size="small"
                  onClick={() => void openRecipeDialog(params.row)}
                  aria-label={`Configurar receta de ${params.row.nombre}`}
                >
                  <CookingPot size={16} />
                </IconButton>
              </Tooltip>
            ) : null}
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => openEditDialog(params.row)}
                aria-label={`Editar ${params.row.nombre}`}
              >
                <Pencil size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    );

    return baseColumns;
  }, [openEditDialog, openRecipeDialog, recipeCapabilityEnabled]);

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={0.75}>
            <Typography
              variant="h5"
              sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
            >
              Configuración de menú
            </Typography>
            <Typography
              sx={{
                maxWidth: 780,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Crea y administra los ítems vendibles del restaurante. Si el
              blueprint activa consumo por receta, cada ítem puede decidir si
              exige o no ingredientes de inventario.
            </Typography>
          </Stack>
        </Box>
      </Grid>

      {message ? (
        <Grid size={12}>
          <Alert
            severity={
              /no se pudo|debes|inval/i.test(message) ? "error" : "success"
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
                        placeholder="Buscar por código, nombre o categoría"
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
                      Nuevo ítem
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
                      : "No hay ítems configurados en el menú todavía.",
                  }}
                  sx={GRID_SX}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingRow ? "Editar ítem del menú" : "Nuevo ítem del menú"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="restaurant-menu-form"
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
              value={form.nombre}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nombre: event.target.value,
                }))
              }
              required
              autoFocus
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                label="Tipo"
                size="small"
                value={form.tipoProducto}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tipoProducto: event.target
                      .value as DishFormState["tipoProducto"],
                  }))
                }
                fullWidth
              >
                <MenuItem value="SERVICIO">Servicio</MenuItem>
                <MenuItem value="BIEN">Bien</MenuItem>
              </TextField>
              <TextField
                label="Precio"
                size="small"
                type="number"
                value={form.precio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    precio: event.target.value,
                  }))
                }
                inputProps={{ min: 0, step: "0.01" }}
                required
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Categoría"
                size="small"
                value={form.restaurantCategory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    restaurantCategory: event.target.value,
                  }))
                }
                fullWidth
              />
              <TextField
                label="Tiempo de preparación"
                size="small"
                type="number"
                value={form.prepTimeMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    prepTimeMinutes: event.target.value,
                  }))
                }
                inputProps={{ min: 0, step: "1" }}
                placeholder="Minutos"
                fullWidth
              />
            </Stack>

            {stations.length > 0 ? (
              <TextField
                select
                label="Estación"
                size="small"
                value={form.restaurantStationCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    restaurantStationCode: event.target.value,
                  }))
                }
              >
                <MenuItem value="">Sin estación</MenuItem>
                {stations.map((station) => (
                  <MenuItem key={station.id} value={station.code}>
                    {station.code} · {station.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Visible en restaurante
                </Typography>
                <Switch
                  checked={form.restaurantVisible}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      restaurantVisible: event.target.checked,
                    }))
                  }
                />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Activo
                </Typography>
                <Switch
                  checked={form.activo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      activo: event.target.checked,
                    }))
                  }
                />
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving} variant="outlined">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="restaurant-menu-form"
            disabled={saving}
            variant="contained"
          >
            {saving
              ? "Guardando..."
              : editingRow
                ? "Guardar cambios"
                : "Crear ítem"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={recipeDialogOpen}
        onClose={closeRecipeDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {recipeRow ? `Receta e inventario · ${recipeRow.nombre}` : "Receta"}
        </DialogTitle>
        <DialogContent>
          {recipeDialogLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box
              component="form"
              id="restaurant-recipe-form"
              onSubmit={handleRecipeSubmit}
              sx={{
                pt: 1,
                display: "grid",
                gap: 2,
              }}
            >
              <Alert severity="info" variant="outlined">
                Si activas receta para este ítem, el envío a cocina exigirá
                ingredientes válidos y stock suficiente.
              </Alert>

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Exigir receta para descontar inventario
                </Typography>
                <Switch
                  checked={recipeForm.recipeConsumptionEnabled}
                  onChange={(event) =>
                    setRecipeForm((current) => ({
                      ...current,
                      recipeConsumptionEnabled: event.target.checked,
                    }))
                  }
                />
              </Stack>

              <TextField
                label="Notas de receta"
                size="small"
                multiline
                minRows={2}
                value={recipeForm.notes}
                onChange={(event) =>
                  setRecipeForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Indicaciones internas o notas de preparación"
              />

              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Ingredientes de inventario
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={addRecipeIngredient}
                    disabled={recipeSaving}
                  >
                    Agregar ingrediente
                  </Button>
                </Stack>

                {recipeForm.ingredients.length === 0 ? (
                  <Alert severity="warning" variant="outlined">
                    Aún no hay ingredientes configurados para este ítem.
                  </Alert>
                ) : null}

                {recipeForm.ingredients.map((ingredient, index) => {
                  const selectedIds = new Set(
                    recipeForm.ingredients
                      .filter((row) => row.localId !== ingredient.localId)
                      .map((row) => row.productId),
                  );

                  return (
                    <Card key={ingredient.localId} variant="outlined">
                      <CardContent
                        sx={{
                          p: 1.5,
                          "&:last-child": { pb: 1.5 },
                        }}
                      >
                        <Grid container spacing={1.5}>
                          <Grid size={12}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Ingrediente {index + 1}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => removeRecipeIngredient(ingredient.localId)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Stack>
                          </Grid>

                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="Producto de inventario"
                              value={ingredient.productId}
                              onChange={(event) =>
                                updateRecipeIngredient(ingredient.localId, {
                                  productId: event.target.value,
                                })
                              }
                            >
                              {inventoryProducts
                                .filter(
                                  (product) =>
                                    product.id !== recipeRow?.id &&
                                    (!selectedIds.has(product.id) ||
                                      product.id === ingredient.productId),
                                )
                                .map((product) => (
                                  <MenuItem key={product.id} value={product.id}>
                                    {product.codigo} · {product.nombre}
                                    {product.tipoProducto === "BIEN"
                                      ? ` · Stock ${product.stock.toFixed(3)}`
                                      : ""}
                                  </MenuItem>
                                ))}
                            </TextField>
                          </Grid>

                          <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Cantidad"
                              type="number"
                              value={ingredient.quantity}
                              onChange={(event) =>
                                updateRecipeIngredient(ingredient.localId, {
                                  quantity: event.target.value,
                                })
                              }
                              inputProps={{ min: 0, step: "0.001" }}
                            />
                          </Grid>

                          <Grid size={{ xs: 12, md: 3 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ minHeight: 40, display: "flex", alignItems: "center" }}
                              >
                                Usar prep batches
                              </Typography>
                              <Switch
                                checked={ingredient.usePrepBatches}
                                onChange={(event) =>
                                  updateRecipeIngredient(ingredient.localId, {
                                    usePrepBatches: event.target.checked,
                                  })
                                }
                              />
                            </Stack>
                          </Grid>

                          <Grid size={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Nota del ingrediente"
                              value={ingredient.notes}
                              onChange={(event) =>
                                updateRecipeIngredient(ingredient.localId, {
                                  notes: event.target.value,
                                })
                              }
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeRecipeDialog}
            disabled={recipeSaving}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="restaurant-recipe-form"
            disabled={recipeSaving || recipeDialogLoading}
            variant="contained"
          >
            {recipeSaving ? "Guardando..." : "Guardar receta"}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
