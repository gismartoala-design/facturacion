"use client";

import {
  Badge,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ConciergeBell, DoorOpen, Store, Table2 } from "lucide-react";

import type { RestaurantFloorTable } from "@/modules/restaurant/components/restaurant-operations-types";
import { formatCurrency } from "@/modules/restaurant/components/restaurant-operations-utils";

type RestaurantFloorScreenProps = {
  floorGroups: Array<{
    id: string;
    name: string;
    tables: RestaurantFloorTable[];
  }>;
  selectedTableId: string | null;
  guestCountDraft: string;
  actionLoading: string | null;
  onGuestCountChange: (value: string) => void;
  onOpenTable: (tableId: string) => void;
  onEnterTable: (tableId: string) => void;
};

export function RestaurantFloorScreen({
  floorGroups,
  selectedTableId,
  guestCountDraft,
  actionLoading,
  onGuestCountChange,
  onOpenTable,
  onEnterTable,
}: RestaurantFloorScreenProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: "22px",
        minHeight: "calc(100vh - 180px)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
        >
          <Stack spacing={0.55}>
            <Typography
              variant="overline"
              sx={{ color: "#8a654a", fontWeight: 800, letterSpacing: "0.14em" }}
            >
              Floor / Mesas
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              Estado del salón
            </Typography>
            <Typography color="text.secondary" fontSize={13}>
              Abre una mesa, entra a una sesión activa o detecta consumo
              pendiente por área.
            </Typography>
          </Stack>
          <TextField
            label="Comensales por apertura"
            value={guestCountDraft}
            onChange={(event) => onGuestCountChange(event.target.value)}
            sx={{ width: { xs: "100%", sm: 170 } }}
          />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          {floorGroups.map((area) => {
            const tables = area.tables;
            if (tables.length === 0) return null;

            return (
              <Stack key={area.id} spacing={1.15}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Store size={16} color="#8a654a" />
                  <Typography fontWeight={800}>{area.name}</Typography>
                  <Chip
                    label={`${tables.length} mesas`}
                    size="small"
                    sx={{ bgcolor: alpha("#b98758", 0.1), color: "#8a654a" }}
                  />
                </Stack>
                <Grid container spacing={1.15}>
                  {tables.map((table) => {
                    const selected = table.id === selectedTableId;
                    const statusTone = !table.hasActiveSession
                      ? "#9b8a78"
                      : table.activeOrderId
                        ? "#8c5c35"
                        : "#45745f";

                    return (
                      <Grid key={table.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                        <Paper
                          onClick={() => onEnterTable(table.id)}
                          sx={{
                            p: 1.4,
                            borderRadius: "20px",
                            cursor: "pointer",
                            background: selected
                              ? "linear-gradient(180deg, rgba(76,55,44,0.98) 0%, rgba(99,69,52,0.96) 100%)"
                              : "linear-gradient(180deg, rgba(255,250,242,0.98) 0%, rgba(249,240,228,0.96) 100%)",
                            color: selected ? "#fff9f3" : theme.palette.text.primary,
                            borderColor: selected
                              ? alpha("#f5d3ae", 0.32)
                              : alpha("#b98758", 0.14),
                            boxShadow: selected
                              ? "0 16px 34px rgba(71, 44, 26, 0.18)"
                              : "0 10px 24px rgba(87, 59, 39, 0.08)",
                          }}
                        >
                          <Stack spacing={1.15}>
                            <Stack direction="row" justifyContent="space-between">
                              <Stack spacing={0.35}>
                                <Typography fontWeight={900}>{table.name}</Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: selected
                                      ? alpha("#fff9f3", 0.72)
                                      : alpha(theme.palette.text.secondary, 0.9),
                                  }}
                                >
                                  {table.code} · {table.capacity} pax
                                </Typography>
                              </Stack>
                              <Badge
                                color="success"
                                variant={table.hasActiveSession ? "standard" : "dot"}
                                badgeContent={table.hasActiveSession ? " " : undefined}
                              >
                                <Table2
                                  size={18}
                                  color={selected ? "#f8ddbc" : statusTone}
                                />
                              </Badge>
                            </Stack>

                            <Chip
                              label={
                                !table.hasActiveSession
                                  ? "Disponible"
                                  : table.activeOrderId
                                    ? "Con orden activa"
                                    : "Mesa abierta"
                              }
                              size="small"
                              sx={{
                                alignSelf: "flex-start",
                                bgcolor: selected
                                  ? alpha("#fff9f3", 0.12)
                                  : alpha(statusTone, 0.12),
                                color: selected ? "#fff9f3" : statusTone,
                              }}
                            />

                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Stack spacing={0.15}>
                                <Typography
                                  variant="caption"
                                  color={selected ? alpha("#fff9f3", 0.72) : "text.secondary"}
                                >
                                  Consumo abierto
                                </Typography>
                                <Typography fontWeight={900}>
                                  {formatCurrency(table.openTotal)}
                                </Typography>
                              </Stack>

                              {!table.hasActiveSession ? (
                                <Button
                                  size="small"
                                  variant={selected ? "contained" : "outlined"}
                                  startIcon={<DoorOpen size={14} />}
                                  disabled={actionLoading === `open:${table.id}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onOpenTable(table.id);
                                  }}
                                >
                                  Abrir
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  variant={selected ? "contained" : "text"}
                                  startIcon={<ConciergeBell size={14} />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onEnterTable(table.id);
                                  }}
                                >
                                  Entrar
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}
