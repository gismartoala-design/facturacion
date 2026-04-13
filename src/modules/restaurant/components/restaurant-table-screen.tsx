"use client";

import {
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { PackageCheck, Plus, Receipt, Send, Table2, Trash2, Users } from "lucide-react";
import Link from "next/link";

import type {
  DraftItem,
  RestaurantFloorTable,
  RestaurantOrderDetail,
  RestaurantProduct,
} from "@/modules/restaurant/components/restaurant-operations-types";
import {
  formatCurrency,
  formatDateTime,
  statusColor,
  statusLabel,
} from "@/modules/restaurant/components/restaurant-operations-utils";

type RestaurantTableScreenProps = {
  selectedTable: RestaurantFloorTable | null;
  selectedOrder: RestaurantOrderDetail | null;
  orderLoading: boolean;
  restaurantProducts: RestaurantProduct[];
  productQuery: string;
  productGroups: Array<[string, RestaurantProduct[]]>;
  draftItems: DraftItem[];
  draftSummary: {
    items: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  currentPendingItems: RestaurantOrderDetail["items"];
  productsById: Map<string, RestaurantProduct>;
  actionLoading: string | null;
  onProductQueryChange: (value: string) => void;
  onAdjustDraft: (productId: string, delta: number) => void;
  onCreateOrUpdateOrder: () => void;
  onFireOrder: () => void;
};

export function RestaurantTableScreen({
  selectedTable,
  selectedOrder,
  orderLoading,
  restaurantProducts,
  productQuery,
  productGroups,
  draftItems,
  draftSummary,
  currentPendingItems,
  productsById,
  actionLoading,
  onProductQueryChange,
  onAdjustDraft,
  onCreateOrUpdateOrder,
  onFireOrder,
}: RestaurantTableScreenProps) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: "22px",
        background: "#fbf7f1",
        border: "1px solid",
        borderColor: "rgba(205, 191, 173, 0.72)",
        minHeight: "calc(100vh - 180px)",
      }}
    >
      <Stack spacing={2}>
        <Stack spacing={0.55}>
          <Typography
            variant="overline"
            sx={{ color: "#8a654a", fontWeight: 800, letterSpacing: "0.14em" }}
          >
            Mesa / Order Composer
          </Typography>
          <Typography variant="h6" fontWeight={800}>
            {selectedTable
              ? `${selectedTable.name} · ${
                  selectedOrder ? statusLabel(selectedOrder.status) : "Lista para comandar"
                }`
              : "Selecciona una mesa"}
          </Typography>
          <Typography color="text.secondary" fontSize={13}>
            Agrega productos al borrador, crea la orden de mesa y envía
            los pendientes a cocina.
          </Typography>
        </Stack>

        <Divider />

        {selectedTable ? (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <Paper
                sx={{
                  p: 1.4,
                  borderRadius: "18px",
                  flex: 1,
                  bgcolor: alpha("#efe4d1", 0.5),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Users size={16} color="#8a654a" />
                  <Typography variant="body2" color="text.secondary">
                    Mesa
                  </Typography>
                </Stack>
                <Typography fontWeight={900} sx={{ mt: 0.6 }}>
                  {selectedTable.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTable.code} · capacidad {selectedTable.capacity}
                </Typography>
              </Paper>
              <Paper
                sx={{
                  p: 1.4,
                  borderRadius: "18px",
                  width: { xs: "100%", md: 190 },
                  bgcolor: alpha("#efe4d1", 0.5),
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Abierto actual
                </Typography>
                <Typography fontWeight={900} sx={{ mt: 0.6 }}>
                  {formatCurrency(selectedOrder?.totals.openTotal ?? selectedTable.openTotal)}
                </Typography>
              </Paper>
            </Stack>

            {selectedOrder ? (
              <Paper
                sx={{
                  p: 1.5,
                  borderRadius: "20px",
                  bgcolor: alpha("#f7efe2", 0.72),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={statusLabel(selectedOrder.status)}
                    color={statusColor(selectedOrder.status)}
                    size="small"
                  />
                  {selectedOrder.session ? (
                    <Chip
                      label={`${selectedOrder.session.guestCount} comensales`}
                      size="small"
                    />
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {selectedOrder.session?.openedAt
                      ? `Abierta ${formatDateTime(selectedOrder.session.openedAt)}`
                      : "Sin sesión visible"}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}

            <Autocomplete
              options={restaurantProducts}
              getOptionLabel={(option) => option.nombre}
              onChange={(_event, value) => {
                if (value) {
                  onAdjustDraft(value.id, 1);
                  onProductQueryChange("");
                }
              }}
              inputValue={productQuery}
              onInputChange={(_event, value) => onProductQueryChange(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar producto de menú"
                  placeholder="Nombre, código o categoría"
                />
              )}
            />

            <Stack spacing={1.25}>
              {productGroups.map(([groupName, products]) => (
                <Stack key={groupName} spacing={0.9}>
                  <Typography fontWeight={800} fontSize={13} color="#8a654a">
                    {groupName}
                  </Typography>
                  <Grid container spacing={1}>
                    {products.slice(0, 8).map((product) => {
                      const draft = draftItems.find(
                        (item) => item.productId === product.id,
                      );
                      return (
                        <Grid key={product.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                          <Paper
                            sx={{
                              p: 1.2,
                              borderRadius: "18px",
                              bgcolor: alpha("#fffaf5", 0.9),
                              borderColor: alpha("#d8c2a5", 0.4),
                            }}
                          >
                            <Stack spacing={0.75}>
                              <Typography fontWeight={800} fontSize={13.5}>
                                {product.nombre}
                              </Typography>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">
                                  {product.restaurantStationCode || "GENERAL"}
                                </Typography>
                                <Typography variant="caption" fontWeight={700}>
                                  {formatCurrency(product.precio)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.75}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => onAdjustDraft(product.id, -1)}
                                >
                                  -1
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<Plus size={14} />}
                                  onClick={() => onAdjustDraft(product.id, 1)}
                                >
                                  {draft ? `${draft.quantity} en borrador` : "Agregar"}
                                </Button>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Stack>
              ))}
            </Stack>

            <Divider />

            <Stack spacing={1.15}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={900}>Borrador de comanda</Typography>
                <Chip
                  label={`${draftSummary.items} ítems`}
                  size="small"
                  sx={{ bgcolor: alpha("#8a654a", 0.1), color: "#8a654a" }}
                />
              </Stack>

              {draftItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay productos en borrador.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {draftItems.map((item) => {
                    const product = productsById.get(item.productId);
                    if (!product) return null;

                    return (
                      <Paper
                        key={item.productId}
                        sx={{
                          p: 1.2,
                          borderRadius: "16px",
                          bgcolor: alpha("#fffaf5", 0.92),
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Stack spacing={0.2}>
                            <Typography fontWeight={800} fontSize={13.5}>
                              {product.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.restaurantStationCode || "GENERAL"} · {formatCurrency(product.precio)} c/u
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => onAdjustDraft(item.productId, -1)}
                            >
                              -1
                            </Button>
                            <Chip label={`${item.quantity}`} size="small" />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onAdjustDraft(item.productId, 1)}
                            >
                              +1
                            </Button>
                            <IconButton
                              color="error"
                              onClick={() => onAdjustDraft(item.productId, -item.quantity)}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              <Paper
                sx={{
                  p: 1.35,
                  borderRadius: "18px",
                  bgcolor: "rgba(56,42,34,0.96)",
                  color: "#fffaf3",
                  borderColor: alpha("#f5d3ae", 0.2),
                }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal + IVA</Typography>
                  <Typography fontWeight={900}>
                    {formatCurrency(draftSummary.total)}
                  </Typography>
                </Stack>
              </Paper>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<PackageCheck size={16} />}
                  disabled={
                    actionLoading === "create-order" ||
                    actionLoading === "patch-order" ||
                    draftItems.length === 0
                  }
                  onClick={onCreateOrUpdateOrder}
                >
                  {selectedOrder ? "Agregar a orden" : "Crear orden"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Send size={16} />}
                  disabled={
                    actionLoading === "fire-order" ||
                    !selectedOrder ||
                    currentPendingItems.length === 0
                  }
                  onClick={onFireOrder}
                >
                  Enviar {currentPendingItems.length > 0 ? `(${currentPendingItems.length})` : ""} a cocina
                </Button>
                {selectedOrder ? (
                  <Button
                    component={Link}
                    href={`/restaurant/orders/${selectedOrder.id}/settlement`}
                    variant="outlined"
                    color="secondary"
                    startIcon={<Receipt size={16} />}
                  >
                    Ir a liquidación
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography fontWeight={900}>Orden actual</Typography>
              {orderLoading ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={18} />
                  <Typography variant="body2">Cargando orden...</Typography>
                </Stack>
              ) : selectedOrder?.items.length ? (
                selectedOrder.items.map((item) => (
                  <Paper
                    key={item.id}
                    sx={{
                      p: 1.2,
                      borderRadius: "16px",
                      bgcolor: alpha("#fffdf8", 0.94),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Stack spacing={0.35}>
                        <Typography fontWeight={800} fontSize={13.5}>
                          {item.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.quantity} uds · pendientes {item.remainingQuantity} · {formatCurrency(item.openTotals.total)}
                        </Typography>
                      </Stack>
                      <Chip
                        label={statusLabel(item.status)}
                        color={statusColor(item.status)}
                        size="small"
                      />
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  La mesa aún no tiene orden creada.
                </Typography>
              )}
            </Stack>
          </Stack>
        ) : (
          <Stack
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 420 }}
          >
            <Table2 size={34} color="#8a654a" />
            <Typography fontWeight={800}>Selecciona una mesa del salón</Typography>
            <Typography color="text.secondary" textAlign="center" maxWidth={360}>
              Desde aquí podrás abrir sesión, crear la primera comanda y
              enviarla a cocina.
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
