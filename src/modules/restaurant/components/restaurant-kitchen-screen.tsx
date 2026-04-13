"use client";

import {
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChefHat, Clock3, Flame, RefreshCcw } from "lucide-react";

import type { KitchenTicketView } from "@/modules/restaurant/components/restaurant-operations-types";
import {
  formatDateTime,
  statusColor,
  statusLabel,
} from "@/modules/restaurant/components/restaurant-operations-utils";

type RestaurantKitchenScreenProps = {
  kds: KitchenTicketView[];
  onRefresh: () => void;
  fullScreen?: boolean;
};

export function RestaurantKitchenScreen({
  kds,
  onRefresh,
  fullScreen = false,
}: RestaurantKitchenScreenProps) {
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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack spacing={0.55}>
            <Typography
              variant="overline"
              sx={{ color: "#8a654a", fontWeight: 800, letterSpacing: "0.14em" }}
            >
              Kitchen Display
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {fullScreen ? "Pantalla de cocina" : "Cola de cocina"}
            </Typography>
          </Stack>
          <IconButton onClick={onRefresh}>
            <RefreshCcw size={17} />
          </IconButton>
        </Stack>

        <Divider />

        <Stack spacing={1.1}>
          {kds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay tickets activos en cocina.
            </Typography>
          ) : (
            kds.map((ticket) => (
              <Paper
                key={ticket.id}
                sx={{
                  p: 1.25,
                  borderRadius: "18px",
                  bgcolor: alpha(
                    ticket.status === "READY" ? "#e7f4ea" : "#fffaf4",
                    0.94,
                  ),
                  borderColor: alpha(
                    ticket.status === "READY" ? "#5d8f73" : "#d8c2a5",
                    0.34,
                  ),
                }}
              >
                <Stack spacing={0.9}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <ChefHat size={15} color="#8a654a" />
                        <Typography fontWeight={800} fontSize={13.5}>
                          {ticket.stationName}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.order.tableName || ticket.order.customerName || ticket.order.channel}
                      </Typography>
                    </Stack>
                    <Chip
                      label={statusLabel(ticket.status)}
                      color={statusColor(ticket.status)}
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Clock3 size={13} color="#8a654a" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(ticket.createdAt)}
                    </Typography>
                  </Stack>

                  <Stack spacing={0.65}>
                    {ticket.items.map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Stack spacing={0.15}>
                          <Typography fontSize={12.5} fontWeight={700}>
                            {item.quantity} × {item.productName}
                          </Typography>
                          {item.modifiers.length > 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              {item.modifiers.join(", ")}
                            </Typography>
                          ) : null}
                        </Stack>
                        <Flame
                          size={14}
                          color={item.status === "READY" ? "#4c7b5f" : "#b76a3a"}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
