"use client";

import {
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ConciergeBell, DoorOpen, ReceiptText, Table2, Users } from "lucide-react";

import { RestaurantTableScreen } from "@/modules/restaurant/components/restaurant-table-screen";
import type {
  DraftItem,
  RestaurantFloorTable,
  RestaurantOrderDetail,
  RestaurantProduct,
} from "@/modules/restaurant/components/restaurant-operations-types";
import { formatCurrency } from "@/modules/restaurant/components/restaurant-operations-utils";

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
  guestCountDraft: string;
  onGuestCountChange: (value: string) => void;
  onSelectTable: (tableId: string) => void;
  onOpenTable: (tableId: string) => void;
  onProductQueryChange: (value: string) => void;
  onAdjustDraft: (productId: string, delta: number) => void;
  onCreateOrUpdateOrder: () => void;
  onFireOrder: () => void;
};

export function RestaurantWaiterScreen({
  floorGroups,
  selectedTableId,
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
  guestCountDraft,
  onGuestCountChange,
  onSelectTable,
  onOpenTable,
  onProductQueryChange,
  onAdjustDraft,
  onCreateOrUpdateOrder,
  onFireOrder,
}: RestaurantWaiterScreenProps) {
  return (
    <Stack direction={{ xs: "column", xl: "row" }} spacing={2.25} alignItems="stretch">
      <Paper
        sx={{
          p: 2,
          borderRadius: "22px",
          width: { xs: "100%", xl: 360 },
          flexShrink: 0,
          background: "#fbf7f1",
          border: "1px solid",
          borderColor: "rgba(205, 191, 173, 0.72)",
        }}
      >
        <Stack spacing={1.5}>
          <Stack spacing={0.55}>
            <Typography
              variant="overline"
              sx={{ color: "#8a654a", fontWeight: 800, letterSpacing: "0.14em" }}
            >
              Pedidos / Mesero
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              Toma de orden
            </Typography>
            <Typography color="text.secondary" fontSize={13}>
              Selecciona mesa, ajusta comensales y carga la comanda sin pasar por
              el POS.
            </Typography>
          </Stack>

          <TextField
            label="Comensales por mesa"
            value={guestCountDraft}
            onChange={(event) => onGuestCountChange(event.target.value)}
          />

          {selectedTable ? (
            <Paper
              sx={{
                p: 1.35,
                borderRadius: "18px",
                bgcolor: alpha("#fff8ef", 0.92),
                borderColor: alpha("#bc8f66", 0.18),
              }}
            >
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Users size={15} color="#8a654a" />
                  <Typography fontWeight={800}>{selectedTable.name}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} flexWrap="wrap">
                  <Chip
                    label={selectedTable.hasActiveSession ? "Sesión activa" : "Mesa disponible"}
                    size="small"
                    sx={{
                      bgcolor: alpha(
                        selectedTable.hasActiveSession ? "#5f8f74" : "#8a654a",
                        0.12,
                      ),
                      color: selectedTable.hasActiveSession ? "#4f7c64" : "#8a654a",
                    }}
                  />
                  <Chip
                    label={`Abierto ${formatCurrency(selectedTable.openTotal)}`}
                    size="small"
                  />
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          <Divider />

          <Stack spacing={1}>
            {floorGroups.map((area) => {
              if (area.tables.length === 0) return null;

              return (
                <Stack key={area.id} spacing={0.85}>
                  <Typography fontWeight={800} fontSize={13} color="#8a654a">
                    {area.name}
                  </Typography>

                  {area.tables.map((table) => {
                    const selected = table.id === selectedTableId;

                    return (
                      <Paper
                        key={table.id}
                        sx={{
                          p: 1.1,
                          borderRadius: "18px",
                          bgcolor: selected
                            ? "rgba(73,54,42,0.96)"
                            : "rgba(255,250,242,0.92)",
                          color: selected ? "#fffaf3" : "text.primary",
                          borderColor: selected
                            ? alpha("#f5d3ae", 0.28)
                            : alpha("#bc8f66", 0.15),
                        }}
                      >
                        <Stack spacing={0.9}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Stack spacing={0.2}>
                              <Typography fontWeight={800}>{table.name}</Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: selected
                                    ? alpha("#fffaf3", 0.72)
                                    : "text.secondary",
                                }}
                              >
                                {table.code} · {table.capacity} pax
                              </Typography>
                            </Stack>
                            <Chip
                              label={table.activeOrderId ? "Con orden" : "Sin orden"}
                              size="small"
                              sx={{
                                bgcolor: selected
                                  ? alpha("#fffaf3", 0.12)
                                  : alpha(
                                      table.activeOrderId ? "#8a654a" : "#5f8f74",
                                      0.12,
                                    ),
                                color: selected
                                  ? "#fffaf3"
                                  : table.activeOrderId
                                    ? "#8a654a"
                                    : "#4f7c64",
                              }}
                            />
                          </Stack>

                          <Stack direction="row" spacing={0.75}>
                            <Button
                              size="small"
                              variant={selected ? "contained" : "outlined"}
                              startIcon={<ConciergeBell size={14} />}
                              onClick={() => onSelectTable(table.id)}
                            >
                              Tomar pedido
                            </Button>
                            {!table.hasActiveSession ? (
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<DoorOpen size={14} />}
                                disabled={actionLoading === `open:${table.id}`}
                                onClick={() => onOpenTable(table.id)}
                              >
                                Abrir mesa
                              </Button>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={1.2} sx={{ minWidth: 0, flex: 1 }}>
        <Paper
          sx={{
            p: 1.5,
            borderRadius: "22px",
            background: "#fffdf9",
            border: "1px solid",
            borderColor: "rgba(205, 191, 173, 0.72)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
            <Stack spacing={0.35}>
              <Typography fontWeight={900}>Mesa y comanda</Typography>
              <Typography color="text.secondary" fontSize={13}>
                El mesero trabaja aquí la toma de pedido. Salón queda para ver ocupación y cocina para despacho.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={<Table2 size={14} />}
                label={selectedTable ? selectedTable.name : "Sin mesa"}
                size="small"
              />
              <Chip
                icon={<ReceiptText size={14} />}
                label={selectedOrder ? "Orden abierta" : "Sin orden"}
                size="small"
              />
            </Stack>
          </Stack>
        </Paper>

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
          onProductQueryChange={onProductQueryChange}
          onAdjustDraft={onAdjustDraft}
          onCreateOrUpdateOrder={onCreateOrUpdateOrder}
          onFireOrder={onFireOrder}
        />
      </Stack>
    </Stack>
  );
}
