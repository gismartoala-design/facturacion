"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  ChevronDown,
  ConciergeBell,
  DoorOpen,
  ReceiptText,
  Search,
  Send,
  Table2,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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

type RestaurantWaiterScreenProps = {
  floorGroups: Array<{
    id: string;
    name: string;
    tables: RestaurantFloorTable[];
  }>;
  selectedTableId: string | null;
  selectedTable: RestaurantFloorTable | null;
  selectedOrder: RestaurantOrderDetail | null;
  orderLoading: boolean;
  restaurantProducts: RestaurantProduct[];
  productQuery: string;
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
  guestCountDraft: string;
  onGuestCountChange: (value: string) => void;
  onSelectTable: (tableId: string) => void;
  onOpenTable: (tableId: string) => void;
  onProductQueryChange: (value: string) => void;
  onAdjustDraft: (productId: string, delta: number) => void;
  onClearDraft: () => void;
  onCreateOrUpdateOrder: () => void;
  onFireOrder: () => void;
};

type WaiterView = "tables" | "menu" | "draft";

type TableEntry = RestaurantFloorTable & {
  areaId: string;
  areaLabel: string;
};

const STATUS_PRIORITY: Record<RestaurantFloorTable["operationalStatus"], number> =
  {
    ORDER_OPEN: 0,
    READY_FOR_SETTLEMENT: 1,
    SESSION_OPEN: 2,
    AVAILABLE: 3,
  };

const STATUS_LABEL: Record<RestaurantFloorTable["operationalStatus"], string> = {
  ORDER_OPEN: "Con orden",
  READY_FOR_SETTLEMENT: "Lista para cobro",
  SESSION_OPEN: "Sesión abierta",
  AVAILABLE: "Libre",
};

const STATUS_COLOR: Record<
  RestaurantFloorTable["operationalStatus"],
  "warning" | "success" | "info" | "default"
> = {
  ORDER_OPEN: "warning",
  READY_FOR_SETTLEMENT: "success",
  SESSION_OPEN: "info",
  AVAILABLE: "default",
};

const PANEL_SX = {
  borderRadius: "22px",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
} as const;

const LIST_SX = {
  minHeight: 0,
  overflowY: "auto",
  borderRadius: "16px",
  border: "1px solid",
  borderColor: "divider",
} as const;

function resolveGuestCount(
  selectedTable: RestaurantFloorTable | null,
  guestCountDraft: string,
) {
  return (selectedTable?.guestCount ?? Number(guestCountDraft || "1")) || 1;
}

function compactMoney(value: number) {
  return formatCurrency(value);
}

export function RestaurantWaiterScreen({
  floorGroups,
  selectedTableId,
  selectedTable,
  selectedOrder,
  orderLoading,
  restaurantProducts,
  productQuery,
  draftItems,
  draftSummary,
  currentPendingItems,
  productsById,
  actionLoading,
  guestCountDraft,
  onGuestCountChange,
  onSelectTable,
  onOpenTable,
  onProductQueryChange,
  onAdjustDraft,
  onClearDraft,
  onCreateOrUpdateOrder,
  onFireOrder,
}: RestaurantWaiterScreenProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [activeView, setActiveView] = useState<WaiterView>("tables");
  const [areaFilter, setAreaFilter] = useState("all");
  const [tableQuery, setTableQuery] = useState("");
  const [activeMenuGroup, setActiveMenuGroup] = useState("General");
  const [tableGuestDrafts, setTableGuestDrafts] = useState<Record<string, string>>(
    {},
  );

  const tableEntries = useMemo<TableEntry[]>(
    () =>
      floorGroups.flatMap((group) =>
        group.tables.map((table) => ({
          ...table,
          areaId: group.id,
          areaLabel: group.name,
        })),
      ),
    [floorGroups],
  );

  const areaOptions = useMemo(
    () => [
      { id: "all", label: "Todas las áreas" },
      ...floorGroups
        .filter((group) => group.tables.length > 0)
        .map((group) => ({
          id: group.id,
          label: group.name,
        })),
    ],
    [floorGroups],
  );

  const visibleTables = useMemo(() => {
    const normalized = tableQuery.trim().toLowerCase();

    return tableEntries
      .filter((table) =>
        areaFilter === "all" ? true : table.areaId === areaFilter,
      )
      .filter((table) =>
        normalized
          ? [table.code, table.name, table.areaLabel]
              .join(" ")
              .toLowerCase()
              .includes(normalized)
          : true,
      )
      .sort((left, right) => {
        const priorityDiff =
          STATUS_PRIORITY[left.operationalStatus] -
          STATUS_PRIORITY[right.operationalStatus];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        if (left.openTotal !== right.openTotal) {
          return right.openTotal - left.openTotal;
        }

        return left.code.localeCompare(right.code);
      });
  }, [areaFilter, tableEntries, tableQuery]);

  const menuGroups = useMemo(() => {
    const groups = new Map<string, RestaurantProduct[]>();

    for (const product of restaurantProducts) {
      const key = product.restaurantMenuGroup || "General";
      const current = groups.get(key) ?? [];
      current.push(product);
      groups.set(key, current);
    }

    return [...groups.entries()]
      .map(([group, products]) => [
        group,
        [...products].sort((left, right) => {
          const leftOrder =
            left.restaurantMenuSortOrder ?? Number.MAX_SAFE_INTEGER;
          const rightOrder =
            right.restaurantMenuSortOrder ?? Number.MAX_SAFE_INTEGER;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return left.nombre.localeCompare(right.nombre);
        }),
      ] as [string, RestaurantProduct[]])
      .sort(([left], [right]) => {
        if (left === "General") return -1;
        if (right === "General") return 1;
        return left.localeCompare(right);
      });
  }, [restaurantProducts]);

  const resolvedActiveMenuGroup = useMemo(() => {
    if (menuGroups.length === 0) {
      return "General";
    }

    return menuGroups.some(([group]) => group === activeMenuGroup)
      ? activeMenuGroup
      : menuGroups[0][0];
  }, [activeMenuGroup, menuGroups]);

  const groupProducts = useMemo(
    () =>
      menuGroups.find(([group]) => group === resolvedActiveMenuGroup)?.[1] ?? [],
    [menuGroups, resolvedActiveMenuGroup],
  );

  const normalizedProductQuery = productQuery.trim().toLowerCase();

  const visibleProducts = useMemo(() => {
    const filtered = groupProducts.filter((product) =>
      normalizedProductQuery
        ? [
            product.nombre,
            product.sku,
            product.secuencial,
            product.restaurantMenuGroup,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedProductQuery),
            )
        : true,
    );

    return filtered.slice(0, 10);
  }, [groupProducts, normalizedProductQuery]);

  const productOptions = useMemo(() => {
    const filtered = groupProducts.filter((product) =>
      normalizedProductQuery
        ? [
            product.nombre,
            product.sku,
            product.secuencial,
            product.restaurantMenuGroup,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedProductQuery),
            )
        : true,
    );

    return filtered.slice(0, 20);
  }, [groupProducts, normalizedProductQuery]);

  const draftByProductId = useMemo(
    () => new Map(draftItems.map((item) => [item.productId, item.quantity])),
    [draftItems],
  );

  const sentItems = useMemo(
    () => selectedOrder?.items.filter((item) => item.status !== "PENDING") ?? [],
    [selectedOrder],
  );

  const recentProducts = useMemo(() => {
    if (selectedOrder?.items.length) {
      const recentIds = Array.from(
        new Set(selectedOrder.items.map((item) => item.productId)),
      );

      return recentIds
        .map((productId) => productsById.get(productId))
        .filter((product): product is RestaurantProduct => Boolean(product))
        .slice(0, 6);
    }

    if (draftItems.length) {
      const recentIds = Array.from(new Set(draftItems.map((item) => item.productId)));

      return recentIds
        .map((productId) => productsById.get(productId))
        .filter((product): product is RestaurantProduct => Boolean(product))
        .slice(0, 6);
    }

    return [];
  }, [draftItems, productsById, selectedOrder]);

  function resolveTableGuestDraft(table: RestaurantFloorTable) {
    return (
      tableGuestDrafts[table.id] ??
      (selectedTableId === table.id
        ? guestCountDraft
        : table.guestCount != null
          ? String(table.guestCount)
          : guestCountDraft || "1")
    );
  }

  function handleTableGuestDraftChange(tableId: string, value: string) {
    const sanitized = value.replace(/[^\d]/g, "");

    setTableGuestDrafts((current) => ({
      ...current,
      [tableId]: sanitized,
    }));

    if (selectedTableId === tableId) {
      onGuestCountChange(sanitized);
    }
  }

  function syncGuestCountForTable(table: RestaurantFloorTable) {
    onGuestCountChange(resolveTableGuestDraft(table));
  }

  function handleSelectTable(table: RestaurantFloorTable) {
    syncGuestCountForTable(table);
    onSelectTable(table.id);

    if (isMobile) {
      setActiveView("menu");
    }
  }

  function handleOpenTable(table: RestaurantFloorTable) {
    syncGuestCountForTable(table);
    onOpenTable(table.id);

    if (isMobile) {
      setActiveView("menu");
    }
  }

  function handleQuickAdd(productId: string) {
    onAdjustDraft(productId, 1);

    if (isMobile) {
      setActiveView("draft");
    }
  }

  const tablesPanel = (
    <Paper variant="outlined" sx={PANEL_SX}>
      <Stack spacing={1.25} sx={{ p: 1.5, minHeight: 0, flex: 1 }}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Mesas
          </Typography>
        </Stack>

        <TextField
          size="small"
          label="Buscar mesa"
          value={tableQuery}
          onChange={(event) => setTableQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="Área"
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value)}
            sx={{ flex: 1 }}
          >
            {areaOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box sx={LIST_SX}>
          <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
            {visibleTables.length === 0 ? (
              <Box sx={{ px: 1.25, py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No hay mesas para ese filtro.
                </Typography>
              </Box>
            ) : null}

            {visibleTables.map((table) => {
              const selected = table.id === selectedTableId;
              const rowGuestDraft = resolveTableGuestDraft(table);

              return (
                <Box
                  key={table.id}
                  sx={{
                    px: 1.25,
                    py: 1,
                    backgroundColor: selected
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography fontWeight={800}>{table.code}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {table.areaLabel}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {table.guestCount != null
                            ? `${table.guestCount} comensales`
                            : "Sin sesión"}{" "}
                          · {compactMoney(table.openTotal)}
                        </Typography>
                      </Stack>

                      <Chip
                        size="small"
                        label={STATUS_LABEL[table.operationalStatus]}
                        color={STATUS_COLOR[table.operationalStatus]}
                        variant={
                          table.operationalStatus === "AVAILABLE"
                            ? "outlined"
                            : "filled"
                        }
                      />
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <TextField
                        size="small"
                        label="Pax"
                        value={rowGuestDraft}
                        onChange={(event) =>
                          handleTableGuestDraftChange(table.id, event.target.value)
                        }
                        sx={{ width: 84 }}
                        inputProps={{ inputMode: "numeric", min: 1 }}
                      />
                      <Button
                        size="small"
                        variant={selected ? "contained" : "outlined"}
                        startIcon={<ConciergeBell size={14} />}
                        onClick={() => handleSelectTable(table)}
                      >
                        Tomar orden
                      </Button>
                      {!table.hasActiveSession ? (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<DoorOpen size={14} />}
                          disabled={actionLoading === `open:${table.id}`}
                          onClick={() => handleOpenTable(table)}
                        >
                          Abrir mesa
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );

  const menuPanel = (
    <Paper variant="outlined" sx={PANEL_SX}>
      <Stack spacing={1.25} sx={{ p: 1.5, minHeight: 0, flex: 1 }}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Menú
          </Typography>
        </Stack>

        <Tabs
          value={resolvedActiveMenuGroup}
          onChange={(_event, value) => setActiveMenuGroup(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              px: 1.25,
              textTransform: "none",
              fontSize: 13,
            },
          }}
        >
          {menuGroups.map(([group]) => (
            <Tab key={group} value={group} label={group} />
          ))}
        </Tabs>

        <Autocomplete
          options={productOptions}
          value={null}
          inputValue={productQuery}
          onInputChange={(_event, value) => onProductQueryChange(value)}
          onChange={(_event, value) => {
            if (!value) {
              return;
            }

            handleQuickAdd(value.id);
            onProductQueryChange("");
          }}
          getOptionLabel={(option) => option.nombre}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Buscar producto"
              placeholder="Nombre, código o grupo"
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
              <Box component="li" key={key} {...optionProps}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ width: "100%" }}
                >
                  <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {option.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {option.secuencial} ·{" "}
                      {option.restaurantStationCode || "GENERAL"}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {compactMoney(option.precio)}
                  </Typography>
                </Stack>
              </Box>
            );
          }}
        />

        {recentProducts.length > 0 ? (
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Recientes por mesa
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {recentProducts.map((product) => (
                <Chip
                  key={`recent-${product.id}`}
                  size="small"
                  label={product.nombre}
                  onClick={() => handleQuickAdd(product.id)}
                  clickable
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        ) : null}

        <Box sx={{ ...LIST_SX, flex: 1 }}>
          <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
            {visibleProducts.length === 0 ? (
              <Box sx={{ px: 1.25, py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No hay productos para esa búsqueda o grupo.
                </Typography>
              </Box>
            ) : null}

            {visibleProducts.map((product) => {
              const draftQuantity = draftByProductId.get(product.id) ?? 0;

              return (
                <Box key={product.id} sx={{ px: 1.25, py: 0.95 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={800} fontSize={13.5} noWrap>
                        {product.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {compactMoney(product.precio)}
                        {product.restaurantStationCode
                          ? ` · ${product.restaurantStationCode}`
                          : ""}
                        {product.prepTimeMinutes != null
                          ? ` · ${product.prepTimeMinutes} min`
                          : ""}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {draftQuantity > 0 ? (
                        <Chip size="small" label={draftQuantity} />
                      ) : null}
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleQuickAdd(product.id)}
                      >
                        Agregar
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );

  const draftPanel = (
    <Paper variant="outlined" sx={PANEL_SX}>
      <Stack spacing={1.25} sx={{ p: 1.5, minHeight: 0, flex: 1 }}>
        <Stack spacing={0.35}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Borrador
          </Typography>
        </Stack>

        {selectedTable ? (
          <Paper variant="outlined" sx={{ p: 1.1, borderRadius: "14px" }}>
            <Stack spacing={0.75}>
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={1}
                alignItems="center"
              >
                <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800}>{selectedTable.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTable.code} · {selectedTable.capacity} pax
                  </Typography>
                </Stack>
                <Chip
                  icon={<Table2 size={14} />}
                  label={STATUS_LABEL[selectedTable.operationalStatus]}
                  size="small"
                  color={STATUS_COLOR[selectedTable.operationalStatus]}
                  variant={
                    selectedTable.operationalStatus === "AVAILABLE"
                      ? "outlined"
                      : "filled"
                  }
                  sx={{ p: 1 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  icon={<Users size={14} />}
                  label={`${resolveGuestCount(selectedTable, guestCountDraft)} comensales`}
                  variant="outlined"
                  sx={{ p: 1 }}
                />
                <Chip
                  size="small"
                  icon={<ReceiptText size={14} />}
                  label={selectedOrder ? "Orden abierta" : "Sin orden"}
                  variant="outlined"
                  sx={{ p: 1 }}
                />
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 1.4, borderRadius: "14px" }}>
            <Typography variant="body2" color="text.secondary">
              Selecciona una mesa para empezar a comandar.
            </Typography>
          </Paper>
        )}

        <Paper
          sx={{
            p: 1.25,
            borderRadius: "16px",
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          }}
        >
          <Stack spacing={0.2}>
            <Typography variant="caption" color="text.secondary">
              Total del borrador
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {compactMoney(draftSummary.total)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {draftSummary.items} ítems pendientes por guardar
            </Typography>
          </Stack>
        </Paper>

        <Stack spacing={0.75}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography fontWeight={800}>Borrador actual</Typography>
            {draftItems.length > 0 ? (
              <Button size="small" color="inherit" onClick={onClearDraft}>
                Limpiar
              </Button>
            ) : null}
          </Stack>

          <Box sx={{ ...LIST_SX, maxHeight: 220 }}>
            <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
              {draftItems.length === 0 ? (
                <Box sx={{ px: 1.25, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay ítems en borrador.
                  </Typography>
                </Box>
              ) : (
                draftItems.map((item) => {
                  const product = productsById.get(item.productId);

                  if (!product) {
                    return null;
                  }

                  return (
                    <Box key={item.productId} sx={{ px: 1.25, py: 0.95 }}>
                      <Stack spacing={0.65}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                            <Typography fontWeight={800} fontSize={13.5} noWrap>
                              {product.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {compactMoney(product.precio)} c/u · subtotal{" "}
                              {compactMoney(product.precio * item.quantity)}
                            </Typography>
                          </Stack>
                          <Chip size="small" label={item.quantity} />
                        </Stack>

                        <Stack direction="row" spacing={0.75}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onAdjustDraft(item.productId, -1)}
                          >
                            -1
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => onAdjustDraft(item.productId, 1)}
                          >
                            +1
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            color="error"
                            startIcon={<Trash2 size={14} />}
                            onClick={() => onAdjustDraft(item.productId, -item.quantity)}
                          >
                            Quitar
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Stack>
          </Box>
        </Stack>

        <Stack spacing={0.75}>
          <Button
            variant="contained"
            disabled={
              actionLoading === "create-order" ||
              actionLoading === "patch-order" ||
              draftItems.length === 0 ||
              !selectedTable
            }
            onClick={onCreateOrUpdateOrder}
          >
            {selectedOrder ? "Actualizar orden" : "Guardar orden"}
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
            Enviar a cocina
          </Button>

          {selectedOrder ? (
            <Button
              component={Link}
              href={`/restaurant/orders/${selectedOrder.id}/settlement`}
              variant="outlined"
              color="secondary"
            >
              Ir a liquidación
            </Button>
          ) : null}
        </Stack>

        <Stack spacing={0.75} sx={{ minHeight: 0, overflowY: "auto", pr: 0.25 }}>
          <Accordion
            disableGutters
            defaultExpanded={false}
            sx={{
              borderRadius: "14px",
              boxShadow: "none",
              border: "1px solid",
              borderColor: "divider",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ChevronDown size={16} />}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%", pr: 1 }}
              >
                <Typography fontWeight={800}>Pendientes por enviar</Typography>
                <Chip
                  size="small"
                  label={currentPendingItems.length}
                  color="warning"
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ ...LIST_SX, maxHeight: 180 }}>
                <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
                  {currentPendingItems.length === 0 ? (
                    <Box sx={{ px: 1.25, py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay ítems pendientes en la orden.
                      </Typography>
                    </Box>
                  ) : (
                    currentPendingItems.map((item) => (
                      <Box key={item.id} sx={{ px: 1.25, py: 0.9 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          alignItems="center"
                        >
                          <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                            <Typography fontWeight={800} fontSize={13} noWrap>
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.remainingQuantity} pendientes ·{" "}
                              {compactMoney(item.openTotals.total)}
                            </Typography>
                          </Stack>
                          <Chip size="small" label="Pendiente" color="warning" />
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion
            disableGutters
            defaultExpanded={false}
            sx={{
              borderRadius: "14px",
              boxShadow: "none",
              border: "1px solid",
              borderColor: "divider",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ChevronDown size={16} />}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%", pr: 1 }}
              >
                <Typography fontWeight={800}>Ya enviado / en cocina</Typography>
                <Chip size="small" label={sentItems.length} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Box sx={{ ...LIST_SX, maxHeight: 200 }}>
                <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
                  {orderLoading ? (
                    <Box sx={{ px: 1.25, py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Cargando orden...
                      </Typography>
                    </Box>
                  ) : sentItems.length === 0 ? (
                    <Box sx={{ px: 1.25, py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aún no hay ítems enviados o servidos.
                      </Typography>
                    </Box>
                  ) : (
                    sentItems.map((item) => (
                      <Box key={item.id} sx={{ px: 1.25, py: 0.9 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          alignItems="center"
                        >
                          <Stack spacing={0.1} sx={{ minWidth: 0 }}>
                            <Typography fontWeight={800} fontSize={13} noWrap>
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.quantity} uds · {compactMoney(item.openTotals.total)}
                            </Typography>
                            {item.notes ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                              >
                                {item.notes}
                              </Typography>
                            ) : null}
                          </Stack>
                          <Chip
                            size="small"
                            label={statusLabel(item.status)}
                            color={statusColor(item.status)}
                          />
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Stack>

        {selectedOrder?.session?.openedAt ? (
          <Typography variant="caption" color="text.secondary">
            Mesa abierta {formatDateTime(selectedOrder.session.openedAt)}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );

  return (
    <Stack spacing={1.25}>
      {isMobile ? (
        <Paper variant="outlined" sx={{ borderRadius: "20px", px: 1, py: 0.5 }}>
          <Tabs
            value={activeView}
            onChange={(_event, value: WaiterView) => setActiveView(value)}
            variant="fullWidth"
          >
            <Tab value="tables" label="Mesa" />
            <Tab value="menu" label="Menú" />
            <Tab value="draft" label="Borrador" />
          </Tabs>
        </Paper>
      ) : null}

      {isMobile ? (
        activeView === "tables" ? (
          tablesPanel
        ) : activeView === "menu" ? (
          menuPanel
        ) : (
          draftPanel
        )
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              md: "250px minmax(0, 1fr) 320px",
              lg: "270px minmax(0, 1fr) 340px",
              xl: "290px minmax(0, 1fr) 360px",
            },
            minHeight: { md: "calc(100vh - 220px)" },
            maxHeight: { md: "calc(100vh - 220px)" },
          }}
        >
          {tablesPanel}
          {menuPanel}
          {draftPanel}
        </Box>
      )}
    </Stack>
  );
}
