"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { MoreHorizontal, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MouseEvent,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { RestaurantFloorScreen } from "@/modules/restaurant/components/restaurant-floor-screen";
import { RestaurantKitchenScreen } from "@/modules/restaurant/components/restaurant-kitchen-screen";
import { RestaurantTableScreen } from "@/modules/restaurant/components/restaurant-table-screen";
import { RestaurantWaiterScreen } from "@/modules/restaurant/components/restaurant-waiter-screen";
import type {
  DraftItem,
  KitchenTicketView,
  RestaurantBootstrap,
  RestaurantFloorTable,
  RestaurantOperationsAppProps,
  RestaurantOrderDetail,
} from "@/modules/restaurant/components/restaurant-operations-types";

export function RestaurantOperationsApp({
  initialBootstrap,
  initialBootstrapError = null,
  screen = "floor",
  initialSelectedTableId = null,
}: RestaurantOperationsAppProps) {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<RestaurantBootstrap | null>(
    initialBootstrap,
  );
  const [bootError, setBootError] = useState<string | null>(
    initialBootstrapError,
  );
  const [bootLoading, setBootLoading] = useState(false);
  const [floor, setFloor] = useState<RestaurantFloorTable[]>(
    initialBootstrap?.floor ?? [],
  );
  const [kds, setKds] = useState<KitchenTicketView[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialSelectedTableId ??
      initialBootstrap?.floor.find((table) => table.activeOrderId)?.id ??
      null,
  );
  const [selectedOrder, setSelectedOrder] =
    useState<RestaurantOrderDetail | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [guestCountDraft, setGuestCountDraft] = useState("2");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const deferredProductQuery = useDeferredValue(productQuery);
  const [toolbarMenuAnchor, setToolbarMenuAnchor] =
      useState<null | HTMLElement>(null);

  const floorScreen = screen === "floor";
  const tableScreen = screen === "table";
  const waiterScreen = screen === "waiter";
  const kitchenScreen = screen === "kitchen";

  const selectedTable = useMemo(
    () => floor.find((table) => table.id === selectedTableId) ?? null,
    [floor, selectedTableId],
  );

  const restaurantProducts = useMemo(
    () =>
      (bootstrap?.products ?? []).filter(
        (product) => product.restaurantVisible,
      ),
    [bootstrap],
  );
  const productsById = useMemo(
    () => new Map(restaurantProducts.map((product) => [product.id, product])),
    [restaurantProducts],
  );

  const filteredProducts = useMemo(() => {
    const query = deferredProductQuery.trim().toLowerCase();
    if (!query) return restaurantProducts;

    return restaurantProducts.filter((product) =>
      [
        product.nombre,
        product.sku,
        product.secuencial,
        product.restaurantMenuGroup,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [deferredProductQuery, restaurantProducts]);

  const productGroups = useMemo(() => {
    const groups = new Map<string, typeof restaurantProducts>();

    for (const product of filteredProducts) {
      const key = product.restaurantMenuGroup || "General";
      const current = groups.get(key) ?? [];
      current.push(product);
      groups.set(key, current);
    }

    return [...groups.entries()]
      .map(
        ([group, items]) =>
          [
            group,
            [...items].sort((left, right) => {
              const leftOrder =
                left.restaurantMenuSortOrder ?? Number.MAX_SAFE_INTEGER;
              const rightOrder =
                right.restaurantMenuSortOrder ?? Number.MAX_SAFE_INTEGER;

              if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
              }

              return left.nombre.localeCompare(right.nombre);
            }),
          ] as [string, typeof restaurantProducts],
      )
      .sort(([left], [right]) => {
        if (left === "General") return -1;
        if (right === "General") return 1;
        return left.localeCompare(right);
      });
  }, [filteredProducts]);

  const floorGroups = useMemo(() => {
    const groupedAreas = (bootstrap?.diningAreas ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      tables: floor.filter((table) => table.areaName === area.name),
    }));
    const unassignedTables = floor.filter((table) => !table.areaName);

    return unassignedTables.length > 0
      ? [
          ...groupedAreas,
          {
            id: "unassigned",
            name: "Sin área",
            tables: unassignedTables,
          },
        ]
      : groupedAreas;
  }, [bootstrap?.diningAreas, floor]);

  const draftSummary = useMemo(() => {
    return draftItems.reduce(
      (acc, item) => {
        const product = productsById.get(item.productId);
        if (!product) return acc;
        const subtotal = product.precio * item.quantity;
        const tax = (subtotal * product.tarifaIva) / 100;

        return {
          items: acc.items + item.quantity,
          subtotal: acc.subtotal + subtotal,
          tax: acc.tax + tax,
          total: acc.total + subtotal + tax,
        };
      },
      { items: 0, subtotal: 0, tax: 0, total: 0 },
    );
  }, [draftItems, productsById]);

  const currentPendingItems = useMemo(
    () =>
      selectedOrder?.items.filter((item) => item.status === "PENDING") ?? [],
    [selectedOrder],
  );

  const headerCopy = useMemo(() => {
    if (kitchenScreen) {
      return {
        eyebrow: "Cocina",
        title: "Pase y estaciones",
        description:
          "Cola activa de tickets para cocina. Aquí no se opera salón ni liquidación.",
      };
    }

    if (waiterScreen) {
      return {
        eyebrow: "Pedidos",
        title: "Toma de orden",
        description:
          "Pantalla del mesero para abrir, completar y enviar comandas por mesa.",
      };
    }

    if (tableScreen) {
      return {
        eyebrow: "Mesa",
        title: selectedTable ? `${selectedTable.name}` : "Detalle de mesa",
        description:
          "Detalle operativo de la mesa, su orden y los ítems pendientes de cocina o cobro.",
      };
    }

    return {
      eyebrow: "Salón",
      title: "Piso de mesas",
      description:
        "Vista de ocupación del salón, sesiones abiertas y consumo en curso por mesa.",
    };
  }, [kitchenScreen, selectedTable, tableScreen, waiterScreen]);

  useEffect(() => {
    if (!initialSelectedTableId) {
      return;
    }

    setSelectedTableId(initialSelectedTableId);
  }, [initialSelectedTableId]);

  const refreshFloor = useCallback(async () => {
    const data = await fetchJson<RestaurantFloorTable[]>(
      "/api/v1/restaurant/floor",
    );
    startTransition(() => {
      setFloor(data);
      setBootstrap((current) =>
        current ? { ...current, floor: data } : current,
      );
    });
  }, []);

  const refreshKds = useCallback(async () => {
    const data = await fetchJson<KitchenTicketView[]>("/api/v1/restaurant/kds");
    startTransition(() => {
      setKds(data);
    });
  }, []);

  const loadBootstrap = useCallback(async () => {
    setBootLoading(true);
    setBootError(null);

    try {
      const data = await fetchJson<RestaurantBootstrap>(
        "/api/v1/restaurant/bootstrap",
      );
      startTransition(() => {
        setBootstrap(data);
        setFloor(data.floor);
        if (initialSelectedTableId) {
          setSelectedTableId(initialSelectedTableId);
        } else {
          setSelectedTableId(
            data.floor.find((table) => table.activeOrderId)?.id ?? null,
          );
        }
      });
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "No se pudo cargar restaurante";
      setBootError(nextMessage);
      setMessage({ tone: "error", text: nextMessage });
    } finally {
      setBootLoading(false);
    }
  }, [initialSelectedTableId]);

  const loadOrder = useCallback(async (orderId: string) => {
    setOrderLoading(true);
    try {
      const data = await fetchJson<RestaurantOrderDetail>(
        `/api/v1/restaurant/orders/${orderId}`,
      );
      startTransition(() => {
        setSelectedOrder(data);
      });
    } catch (error) {
      setSelectedOrder(null);
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo cargar la orden",
      });
    } finally {
      setOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshKds();
  }, [refreshKds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshFloor();
      void refreshKds();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshFloor, refreshKds]);

  useEffect(() => {
    if (!selectedTable?.activeOrderId) {
      setSelectedOrder(null);
      return;
    }

    void loadOrder(selectedTable.activeOrderId);
  }, [loadOrder, selectedTable?.activeOrderId]);

  function upsertDraftItem(productId: string, delta: number) {
    setDraftItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return delta > 0
          ? [...current, { productId, quantity: delta }]
          : current;
      }

      const nextQuantity = Math.max(existing.quantity + delta, 0);
      if (nextQuantity <= 0) {
        return current.filter((item) => item.productId !== productId);
      }

      return current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: nextQuantity }
          : item,
      );
    });
  }

  function clearDraftItems() {
    setDraftItems([]);
    setProductQuery("");
  }

  function handleSelectTable(tableId: string) {
    setSelectedTableId(tableId);
    clearDraftItems();
  }

  async function handleOpenTable(tableId: string) {
    setActionLoading(`open:${tableId}`);
    try {
      await fetchJson(`/api/v1/restaurant/tables/${tableId}/open`, {
        method: "POST",
        body: JSON.stringify({
          guestCount: Number(guestCountDraft) || 1,
        }),
      });
      await refreshFloor();
      handleSelectTable(tableId);
      if (!waiterScreen) {
        router.push(`/restaurant/tables/${tableId}`);
      }
      setMessage({
        tone: "success",
        text: "Mesa abierta y lista para comandar",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo abrir la mesa",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateOrUpdateOrder() {
    if (!selectedTable) {
      setMessage({ tone: "info", text: "Selecciona una mesa para continuar" });
      return;
    }

    if (draftItems.length === 0) {
      setMessage({ tone: "info", text: "Agrega productos antes de comandar" });
      return;
    }

    setActionLoading(selectedOrder ? "patch-order" : "create-order");

    const mappedItems = draftItems
      .map((item) => {
        const product = productsById.get(item.productId);
        if (!product) return null;

        return {
          productId: item.productId,
          cantidad: item.quantity,
          precioUnitario: product.precio,
          tarifaIva: product.tarifaIva,
          descuento: 0,
          modifiers: [],
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    try {
      if (selectedOrder) {
        const data = await fetchJson<RestaurantOrderDetail>(
          `/api/v1/restaurant/orders/${selectedOrder.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              addItems: mappedItems,
            }),
          },
        );
        startTransition(() => {
          setSelectedOrder(data);
          setDraftItems([]);
        });
      } else {
        const data = await fetchJson<RestaurantOrderDetail>(
          "/api/v1/restaurant/orders",
          {
            method: "POST",
            body: JSON.stringify({
              channel: "DINE_IN",
              tableId: selectedTable.id,
              guestCount: Number(guestCountDraft) || 1,
              items: mappedItems,
            }),
          },
        );
        startTransition(() => {
          setSelectedOrder(data);
          setDraftItems([]);
        });
      }

      await refreshFloor();
      setMessage({
        tone: "success",
        text: selectedOrder
          ? "Items agregados a la orden"
          : "Orden creada para la mesa",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la orden",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleFireOrder() {
    if (!selectedOrder) {
      setMessage({ tone: "info", text: "No hay orden activa para enviar" });
      return;
    }

    setActionLoading("fire-order");
    try {
      const data = await fetchJson<{
        order: RestaurantOrderDetail | null;
        missingRecipeProductIds: string[];
      }>(`/api/v1/restaurant/orders/${selectedOrder.id}/fire`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (data.order) {
        startTransition(() => {
          setSelectedOrder(data.order);
        });
      }
      await refreshFloor();
      await refreshKds();

      setMessage({
        tone: data.missingRecipeProductIds.length > 0 ? "info" : "success",
        text:
          data.missingRecipeProductIds.length > 0
            ? "Orden enviada. Hay productos sin receta configurada."
            : "Comanda enviada a cocina",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la orden a cocina",
      });
    } finally {
      setActionLoading(null);
    }
  }

  function openToolbarMenu(event: MouseEvent<HTMLButtonElement>) {
    setToolbarMenuAnchor(event.currentTarget);
  }

  function closeToolbarMenu() {
    setToolbarMenuAnchor(null);
  }

  if (!bootstrap && bootError) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          px: 3,
          background:
            "radial-gradient(circle at top, rgba(166, 123, 91, 0.16), transparent 26%), linear-gradient(180deg, #f4ecde 0%, #efe4d2 100%)",
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 520, borderRadius: "28px" }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>
              No se pudo cargar la operación restaurante
            </Typography>
            <Typography color="text.secondary">{bootError}</Typography>
            <Button variant="contained" onClick={() => void loadBootstrap()}>
              Reintentar
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2.25}>
        <Paper
          sx={{
            borderRadius: "22px",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, md: 2.25 },
              py: 1.25,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      opacity: 0.8,
                    }}
                  >
                    {headerCopy.eyebrow}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ mt: 0.25, fontWeight: 800, lineHeight: 1.1 }}
                  >
                    {bootstrap?.business.name}
                  </Typography>
                  <Typography sx={{ mt: 0.25, opacity: 0.78, fontSize: 13 }}>
                    Operador: 
                    {/* {initialSession.name} */}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  color="inherit"
                  size="small"
                  // onClick={() => resetSaleState(bootstrap.defaultDocumentType)}
                >
                  Nueva · F1
                </Button>
                {/* <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={
                    submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )
                  }
                  onClick={() => void checkoutSale()}
                  disabled={
                    submitting ||
                    !cashSession ||
                    checkoutPayments.length === 0 ||
                    remainingAmount > 0 ||
                    overAllocatedAmount > 0
                  }
                >
                  Procesar · F10
                </Button> */}
                {/* <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={<Wallet className="h-4 w-4" />}
                  onClick={() => setCashDialogOpen(true)}
                >
                  {cashSession ? "Caja · F4" : "Caja · F4"}
                </Button> */}
                {/* <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={
                    holding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PauseCircle className="h-4 w-4" />
                    )
                  }
                  onClick={() => void saveHeldSale()}
                  disabled={holding}
                >
                  Espera · F8
                </Button> */}
                {/* <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  onClick={() => setHeldSalesDialogOpen(true)}
                >
                  Esperas ({heldSales.length}) · F6
                </Button> */}
                {/* <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={<Printer className="h-4 w-4" />}
                  onClick={() =>
                    lastTicketData && void printTicket(lastTicketData)
                  }
                  disabled={!lastTicketData}
                >
                  Reimprimir · F9
                </Button> */}
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    minWidth: 42,
                    px: 1.1,
                  }}
                  onClick={openToolbarMenu}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {floorScreen ? (
          <RestaurantFloorScreen
            floorGroups={floorGroups}
            selectedTableId={selectedTableId}
            guestCountDraft={guestCountDraft}
            actionLoading={actionLoading}
            onGuestCountChange={setGuestCountDraft}
            onOpenTable={(tableId) => void handleOpenTable(tableId)}
            onEnterTable={(tableId) => {
              handleSelectTable(tableId);
              router.push(`/restaurant/tables/${tableId}`);
            }}
          />
        ) : null}

        {tableScreen ? (
          <RestaurantTableScreen
            selectedTable={selectedTable}
            selectedOrder={selectedOrder}
            orderLoading={orderLoading}
            restaurantProducts={restaurantProducts}
            productQuery={productQuery}
            productGroups={productGroups}
            draftItems={draftItems}
            draftSummary={draftSummary}
            currentPendingItems={currentPendingItems}
            productsById={productsById}
            actionLoading={actionLoading}
            onProductQueryChange={setProductQuery}
            onAdjustDraft={upsertDraftItem}
            onCreateOrUpdateOrder={() => void handleCreateOrUpdateOrder()}
            onFireOrder={() => void handleFireOrder()}
          />
        ) : null}

        {waiterScreen ? (
          <RestaurantWaiterScreen
            floorGroups={floorGroups}
            selectedTableId={selectedTableId}
            selectedTable={selectedTable}
            selectedOrder={selectedOrder}
            orderLoading={orderLoading}
            restaurantProducts={restaurantProducts}
            productQuery={productQuery}
            draftItems={draftItems}
            draftSummary={draftSummary}
            currentPendingItems={currentPendingItems}
            productsById={productsById}
            actionLoading={actionLoading}
            guestCountDraft={guestCountDraft}
            onGuestCountChange={setGuestCountDraft}
            onSelectTable={handleSelectTable}
            onOpenTable={(tableId) => void handleOpenTable(tableId)}
            onProductQueryChange={setProductQuery}
            onAdjustDraft={upsertDraftItem}
            onClearDraft={clearDraftItems}
            onCreateOrUpdateOrder={() => void handleCreateOrUpdateOrder()}
            onFireOrder={() => void handleFireOrder()}
          />
        ) : null}

        {kitchenScreen ? (
          <RestaurantKitchenScreen
            kds={kds}
            onRefresh={() => void refreshKds()}
            fullScreen
          />
        ) : null}
      </Stack>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3600}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={
            message?.tone === "error"
              ? "error"
              : message?.tone === "success"
                ? "success"
                : "info"
          }
          variant="filled"
          onClose={() => setMessage(null)}
        >
          {message?.text ?? ""}
        </Alert>
      </Snackbar>
    </Box>
  );
}
