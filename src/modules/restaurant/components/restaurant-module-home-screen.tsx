"use client";

import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowRight,
  ChefHat,
  ConciergeBell,
  CookingPot,
  Receipt,
  Settings2,
} from "lucide-react";
import Link from "next/link";

import { RestaurantModuleNav } from "@/modules/restaurant/components/restaurant-module-nav";
import type { RestaurantBootstrap } from "@/modules/restaurant/components/restaurant-operations-types";
import { formatCurrency } from "@/modules/restaurant/components/restaurant-operations-utils";

type RestaurantModuleHomeScreenProps = {
  initialBootstrap: RestaurantBootstrap | null;
  initialBootstrapError?: string | null;
};

const AREA_CARDS = [
  {
    id: "floor",
    title: "Salón y mesas",
    description: "Apertura de sesión, ocupación física y órdenes activas por mesa.",
    href: "/restaurant/floor",
    icon: ChefHat,
  },
  {
    id: "orders",
    title: "Pedidos",
    description: "Pantalla operativa del mesero para tomar orden y mandar tandas a cocina.",
    href: "/restaurant/orders/new",
    icon: ConciergeBell,
  },
  {
    id: "kitchen",
    title: "Cocina",
    description: "Seguimiento de tickets, estaciones y preparación híbrida KDS + impresión.",
    href: "/restaurant/kitchen",
    icon: CookingPot,
  },
  {
    id: "settings",
    title: "Configuración restaurante",
    description: "Administra menú, salón y mesas desde una capa separada de la operación diaria.",
    href: "/restaurant/settings/dishes",
    icon: Settings2,
  },
  {
    id: "pos",
    title: "POS y cierre",
    description: "El POS queda como capa final de cobro. No opera salón ni cocina.",
    href: "/pos",
    icon: Receipt,
  },
] as const;

export function RestaurantModuleHomeScreen({
  initialBootstrap,
  initialBootstrapError = null,
}: RestaurantModuleHomeScreenProps) {
  if (!initialBootstrap) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          px: 3,
          background:
            "radial-gradient(circle at top left, rgba(176, 127, 86, 0.15), transparent 24%), linear-gradient(180deg, #f4eadc 0%, #efe4d4 100%)",
        }}
      >
        <Alert severity="error" variant="outlined">
          {initialBootstrapError ?? "No se pudo cargar el módulo restaurante"}
        </Alert>
      </Box>
    );
  }

  const activeTables = initialBootstrap.floor.filter((table) => table.hasActiveSession).length;
  const activeOrders = initialBootstrap.floor.filter((table) => table.activeOrderId).length;
  const menuProducts = initialBootstrap.products.filter((product) => product.restaurantVisible).length;
  const openTotal = initialBootstrap.floor.reduce(
    (acc, table) => acc + table.openTotal,
    0,
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        background:
          "radial-gradient(circle at top left, rgba(176, 127, 86, 0.15), transparent 24%), radial-gradient(circle at top right, rgba(93, 141, 120, 0.1), transparent 18%), linear-gradient(180deg, #f4eadc 0%, #efe4d4 100%)",
      }}
    >
      <Stack spacing={2.25}>
        <Paper
          sx={{
            px: 2.5,
            py: 2.25,
            borderRadius: "26px",
            background:
              "linear-gradient(135deg, rgba(50,39,32,0.98) 0%, rgba(74,55,45,0.96) 58%, rgba(110,76,60,0.92) 100%)",
            color: "#fffaf3",
            borderColor: alpha("#f0d2af", 0.18),
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", lg: "center" }}
            >
              <Stack spacing={0.75}>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: alpha("#fffaf3", 0.72),
                  }}
                >
                  Centro de operación restaurante
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}
                >
                  {initialBootstrap.business.name}
                </Typography>
                <Typography sx={{ color: alpha("#fffaf3", 0.74), maxWidth: 820 }}>
                  Restaurante vive como vertical operativo aparte del POS. Aquí
                  separas salón, cocina, producción y cierre comercial sin
                  acoplar el core financiero.
                </Typography>
              </Stack>

              <Button
                component={Link}
                href="/restaurant/floor"
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                sx={{
                  color: "#fffaf3",
                  borderColor: alpha("#fffaf3", 0.22),
                  "&:hover": {
                    borderColor: alpha("#fffaf3", 0.45),
                    backgroundColor: alpha("#fffaf3", 0.08),
                  },
                }}
              >
                Ir a operación
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`Mesas activas: ${activeTables}`}
                sx={{ bgcolor: alpha("#fffaef", 0.12), color: "#fffaf3" }}
              />
              <Chip
                label={`Órdenes abiertas: ${activeOrders}`}
                sx={{ bgcolor: alpha("#fffaef", 0.12), color: "#fffaf3" }}
              />
              <Chip
                label={`Menú visible: ${menuProducts}`}
                sx={{ bgcolor: alpha("#fffaef", 0.12), color: "#fffaf3" }}
              />
              <Chip
                label={`Abierto actual: ${formatCurrency(openTotal)}`}
                sx={{ bgcolor: alpha("#fffaef", 0.12), color: "#fffaf3" }}
              />
            </Stack>
          </Stack>
        </Paper>

        <RestaurantModuleNav currentSection="home" />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {AREA_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <Paper
                key={card.id}
                sx={{
                  p: 2,
                  borderRadius: "24px",
                  background:
                    "linear-gradient(180deg, rgba(255,251,246,0.96) 0%, rgba(247,239,228,0.92) 100%)",
                  borderColor: alpha("#c2966d", 0.18),
                }}
              >
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "14px",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: alpha("#b98758", 0.12),
                      color: "#8a654a",
                    }}
                  >
                    <Icon size={20} />
                  </Box>

                  <Stack spacing={0.45}>
                    <Typography variant="h6" fontWeight={800}>
                      {card.title}
                    </Typography>
                    <Typography color="text.secondary" fontSize={13.5}>
                      {card.description}
                    </Typography>
                  </Stack>

                  <Button
                    component={Link}
                    href={card.href}
                    variant="outlined"
                    endIcon={<ArrowRight size={15} />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Abrir área
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </Stack>
    </Box>
  );
}
