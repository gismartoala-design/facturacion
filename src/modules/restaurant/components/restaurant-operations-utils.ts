"use client";

import type {
  KitchenTicketView,
  RestaurantOrderDetail,
} from "@/modules/restaurant/components/restaurant-operations-types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusLabel(
  value:
    | RestaurantOrderDetail["status"]
    | RestaurantOrderDetail["items"][number]["status"]
    | KitchenTicketView["status"],
) {
  return {
    OPEN: "Abierta",
    IN_PREPARATION: "En preparación",
    PARTIALLY_SERVED: "Parcial servida",
    SERVED: "Servida",
    PARTIALLY_PAID: "Pago parcial",
    PAID: "Pagada",
    CANCELLED: "Cancelada",
    PENDING: "Pendiente",
    SENT: "Enviada",
    READY: "Lista",
    BILLED: "Liquidada",
    NEW: "Nueva",
  }[value];
}

export function statusColor(
  value:
    | RestaurantOrderDetail["status"]
    | RestaurantOrderDetail["items"][number]["status"]
    | KitchenTicketView["status"],
) {
  if (value === "PAID" || value === "SERVED" || value === "READY") return "success";
  if (value === "CANCELLED") return "error";
  if (value === "PARTIALLY_PAID" || value === "PARTIALLY_SERVED") return "warning";
  return "default";
}
