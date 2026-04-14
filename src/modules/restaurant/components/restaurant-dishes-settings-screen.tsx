"use client";

import {
  Alert,
  Autocomplete,
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
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
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

type IngredientDraftState = {
  product: InventoryProductOption | null;
  quantity: string;
  usePrepBatches: boolean;
  notes: string;
};

type RestaurantDishesSettingsScreenProps = {
  recipeCapabilityEnabled: boolean;
};

const EMPTY_FORM: DishFormState = {
  nombre: "",
  tipoProducto: "SERVICIO",
  precio: "",
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

const EMPTY_INGREDIENT_DRAFT: IngredientDraftState = {
  product: null,
  quantity: "1",
  usePrepBatches: false,
  notes: "",
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

const INGREDIENT_GRID_SX = {
  height: 280,
  "& .MuiDataGrid-cell": {
    alignItems: "center",
    // py: 1,
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

function buildRecipeStatus(row: DishRow): {
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

function mapRecipeToForm(recipe: RecipeDetail): RecipeFormState {
  return {
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
  const [dialogLoading, setDialogLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DishRow | null>(null);
  const [form, setForm] = useState<DishFormState>(EMPTY_FORM);
  const [recipeForm, setRecipeForm] =
    useState<RecipeFormState>(EMPTY_RECIPE_FORM);
  const [ingredientDraft, setIngredientDraft] =
    useState<IngredientDraftState>(EMPTY_INGREDIENT_DRAFT);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const ensureInventoryProducts = useCallback(async () => {
    if (inventoryProducts.length > 0) {
      return inventoryProducts;
    }

    const products =
      await fetchJson<InventoryProductOption[]>("/api/v1/products");
    setInventoryProducts(products);
    return products;
  }, [inventoryProducts]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [row.codigo, row.nombre, row.restaurantStationCode ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);

  const availableIngredientOptions = useMemo(
    () =>
      inventoryProducts.filter(
        (product) =>
          product.id !== editingRow?.id &&
          !recipeForm.ingredients.some(
            (ingredient) => ingredient.productId === product.id,
          ),
      ),
    [editingRow?.id, inventoryProducts, recipeForm.ingredients],
  );

  const inventoryProductMap = useMemo(
    () =>
      new Map(
        inventoryProducts.map((product) => [
          product.id,
          {
            codigo: product.codigo,
            nombre: product.nombre,
          },
        ]),
      ),
    [inventoryProducts],
  );

  const openCreateDialog = useCallback(async () => {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setRecipeForm(EMPTY_RECIPE_FORM);
    setIngredientDraft(EMPTY_INGREDIENT_DRAFT);
    setDialogOpen(true);

    if (!recipeCapabilityEnabled) {
      return;
    }

    setDialogLoading(true);
    try {
      await ensureInventoryProducts();
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo preparar el formulario del menú",
      );
    } finally {
      setDialogLoading(false);
    }
  }, [ensureInventoryProducts, recipeCapabilityEnabled]);

  const openEditDialog = useCallback(
    async (row: DishRow) => {
      setEditingRow(row);
      setForm({
        nombre: row.nombre,
        tipoProducto: row.tipoProducto,
        precio: String(row.precio),
        restaurantVisible: row.restaurantVisible,
        prepTimeMinutes:
          row.prepTimeMinutes != null ? String(row.prepTimeMinutes) : "",
        restaurantStationCode: row.restaurantStationCode ?? "",
        activo: row.activo,
      });
      setRecipeForm({
        recipeConsumptionEnabled: row.recipeConsumptionEnabled,
        notes: "",
        ingredients: [],
      });
      setIngredientDraft(EMPTY_INGREDIENT_DRAFT);
      setDialogOpen(true);

      if (!recipeCapabilityEnabled) {
        return;
      }

      setDialogLoading(true);
      try {
        await ensureInventoryProducts();
        const recipe = await fetchJson<RecipeDetail>(
          `/api/v1/inventory/recipes/${row.id}`,
        );
        setRecipeForm(mapRecipeToForm(recipe));
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
            : "No se pudo cargar la composición del menú",
        );
      } finally {
        setDialogLoading(false);
      }
    },
    [ensureInventoryProducts, recipeCapabilityEnabled],
  );

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setDialogLoading(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setRecipeForm(EMPTY_RECIPE_FORM);
    setIngredientDraft(EMPTY_INGREDIENT_DRAFT);
  }

  function addRecipeIngredient() {
    if (!ingredientDraft.product) {
      setMessage("Selecciona un insumo del inventario antes de agregarlo");
      return;
    }

    if (!ingredientDraft.quantity) {
      setMessage("Ingresa la cantidad usada del insumo");
      return;
    }

    const alreadyExists = recipeForm.ingredients.some(
      (ingredient) => ingredient.productId === ingredientDraft.product?.id,
    );

    if (alreadyExists) {
      setMessage("Ese insumo ya forma parte de la composición del plato");
      return;
    }

    setRecipeForm((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        createRecipeIngredientRow({
          productId: ingredientDraft.product!.id,
          quantity: ingredientDraft.quantity,
          usePrepBatches: ingredientDraft.usePrepBatches,
          notes: ingredientDraft.notes,
        }),
      ],
    }));
    setIngredientDraft(EMPTY_INGREDIENT_DRAFT);
    setMessage(null);
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

    const normalizedIngredients = recipeForm.ingredients
      .filter((ingredient) => ingredient.productId && ingredient.quantity)
      .map((ingredient) => ({
        productId: ingredient.productId,
        quantity: Number(ingredient.quantity),
        usePrepBatches: ingredient.usePrepBatches,
        notes: ingredient.notes,
      }));

    if (recipeCapabilityEnabled && recipeForm.recipeConsumptionEnabled) {
      if (normalizedIngredients.length === 0) {
        setMessage(
          "Debes agregar al menos un producto de inventario para la composición del plato",
        );
        return;
      }

      const uniqueIngredientIds = new Set(
        normalizedIngredients.map((ingredient) => ingredient.productId),
      );
      if (uniqueIngredientIds.size !== normalizedIngredients.length) {
        setMessage(
          "No puedes repetir el mismo producto de inventario dentro del mismo plato",
        );
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        nombre: form.nombre,
        tipoProducto: form.tipoProducto,
        precio: Number(form.precio),
        restaurantCategory: "",
        restaurantVisible: form.restaurantVisible,
        prepTimeMinutes: form.prepTimeMinutes
          ? Number(form.prepTimeMinutes)
          : null,
        restaurantStationCode: form.restaurantStationCode || "",
        activo: form.activo,
        recipeConsumptionEnabled: recipeCapabilityEnabled
          ? recipeForm.recipeConsumptionEnabled
          : false,
      };

      const saved = editingRow
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

      if (recipeCapabilityEnabled && recipeForm.recipeConsumptionEnabled) {
        await fetchJson(`/api/v1/inventory/recipes`, {
          method: "POST",
          body: JSON.stringify({
            productId: saved.id,
            notes: recipeForm.notes,
            ingredients: normalizedIngredients,
          }),
        });
      }

      await loadData();
      closeDialog();
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
        flex: 1.6,
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
        minWidth: 110,
        flex: 0.65,
        renderCell: (params) => (
          <IconButton
            size="small"
            onClick={() => void openEditDialog(params.row)}
            aria-label={`Editar ${params.row.nombre}`}
          >
            <Pencil size={16} />
          </IconButton>
        ),
      },
    );

    return baseColumns;
  }, [openEditDialog, recipeCapabilityEnabled]);

  const ingredientColumns = useMemo<GridColDef<RecipeIngredientFormRow>[]>(
    () => [
      {
        field: "codigo",
        headerName: "Código",
        minWidth: 120,
        flex: 0.7,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) =>
          inventoryProductMap.get(row.productId)?.codigo ?? "-",
      },
      {
        field: "productId",
        headerName: "Insumo",
        minWidth: 240,
        flex: 1.45,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) =>
          inventoryProductMap.get(row.productId)?.nombre ??
          "Insumo no encontrado",
      },
      {
        field: "quantity",
        headerName: "Cantidad",
        minWidth: 130,
        flex: 0.7,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row) => row.quantity || "-",
      },
      {
        field: "usePrepBatches",
        headerName: "Prep batch",
        minWidth: 130,
        flex: 0.75,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        valueGetter: (_value, row) => (row.usePrepBatches ? "Sí" : "No"),
      },
      {
        field: "actions",
        headerName: "",
        minWidth: 70,
        flex: 0.35,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <IconButton
            size="small"
            onClick={() => removeRecipeIngredient(params.row.localId)}
            disabled={!recipeForm.recipeConsumptionEnabled || saving}
          >
            <Trash2 size={16} />
          </IconButton>
        ),
      },
    ],
    [inventoryProductMap, recipeForm.recipeConsumptionEnabled, saving],
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
              Configuración de menú
            </Typography>
            <Typography
              sx={{
                maxWidth: 780,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Crea y administra los ítems vendibles del restaurante.
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
                        placeholder="Buscar por código, nombre o estación"
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
                      onClick={() => void openCreateDialog()}
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="lg">
        <DialogTitle>
          {editingRow ? "Editar ítem del menú" : "Nuevo ítem del menú"}
        </DialogTitle>
        <DialogContent>
          {dialogLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box
              component="form"
              id="restaurant-menu-form"
              onSubmit={handleSubmit}
              sx={{
                pt: 1,
                display: "grid",
                gap: 2,
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Datos del ítem
                </Typography>
              </Stack>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 6 }}>
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
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
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
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
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
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
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
                </Grid>
                {stations.length > 0 ? (
                  <Grid size={{ xs: 12, md: 6 }}>
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
                      fullWidth
                    >
                      <MenuItem value="">Sin estación</MenuItem>
                      {stations.map((station) => (
                        <MenuItem key={station.id} value={station.code}>
                          {station.code} · {station.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                ) : null}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    sx={{ minHeight: { md: 40 } }}
                  >
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
                </Grid>
              </Grid>

              {recipeCapabilityEnabled ? (
                <Stack spacing={1.5}>
                  <Stack spacing={0.75}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Composición del plato
                    </Typography>
                  </Stack>

                  <Card variant="outlined">
                    <CardContent
                      sx={{
                        p: { xs: 1.25, sm: 1.5 },
                        "&:last-child": { pb: { xs: 1.25, sm: 1.5 } },
                      }}
                    >
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Autocomplete
                            options={availableIngredientOptions}
                            value={ingredientDraft.product}
                            onChange={(_event, value) =>
                              setIngredientDraft((current) => ({
                                ...current,
                                product: value,
                              }))
                            }
                            isOptionEqualToValue={(option, value) =>
                              option.id === value.id
                            }
                            filterOptions={(options, state) => {
                              const normalized = state.inputValue
                                .trim()
                                .toLowerCase();
                              if (!normalized) return options;
                              return options.filter((option) =>
                                `${option.codigo} ${option.nombre}`
                                  .toLowerCase()
                                  .includes(normalized),
                              );
                            }}
                            getOptionLabel={(option) =>
                              `${option.codigo} · ${option.nombre}`
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                label="Agregar insumo"
                                size="small"
                                placeholder="Buscar por nombre o código"
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <InputAdornment position="start">
                                        <Search size={16} />
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
                                <Box
                                  component="li"
                                  key={key}
                                  {...optionProps}
                                  sx={{ py: 0.75 }}
                                >
                                  <Stack spacing={0.15} sx={{ width: "100%" }}>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {option.nombre}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {option.codigo} ·{" "}
                                      {option.tipoProducto === "BIEN"
                                        ? `Stock ${option.stock.toFixed(3)}`
                                        : "Servicio"}
                                    </Typography>
                                  </Stack>
                                </Box>
                              );
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                          <TextField
                            fullWidth
                            label="Cant."
                            size="small"
                            value={ingredientDraft.quantity}
                            onChange={(event) =>
                              setIngredientDraft((current) => ({
                                ...current,
                                quantity: event.target.value,
                              }))
                            }
                            inputProps={{ min: 0, step: "0.001" }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8, md: 1.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ minHeight: 40 }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Prep.
                            </Typography>
                            <Switch
                              checked={ingredientDraft.usePrepBatches}
                              onChange={(event) =>
                                setIngredientDraft((current) => ({
                                  ...current,
                                  usePrepBatches: event.target.checked,
                                }))
                              }
                            />
                          </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 2.5 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Plus size={16} />}
                            onClick={addRecipeIngredient}
                            disabled={saving}
                          >
                            Agregar insumo
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Card variant="outlined">
                    <CardContent
                      sx={{
                        p: { xs: 1, sm: 1.5 },
                        "&:last-child": { pb: { xs: 1, sm: 1.5 } },
                      }}
                    >
                      <DataGrid
                        rows={recipeForm.ingredients}
                        columns={ingredientColumns}
                        getRowId={(row) => row.localId}
                        hideFooter
                        disableRowSelectionOnClick
                        disableColumnMenu
                        rowHeight={22}
                        sx={INGREDIENT_GRID_SX}
                        localeText={{
                          noRowsLabel:
                            "Busca un insumo arriba y agrégalo a la composición del plato.",
                        }}
                      />
                    </CardContent>
                  </Card>
                </Stack>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving} variant="outlined">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="restaurant-menu-form"
            disabled={saving || dialogLoading}
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
    </Grid>
  );
}
