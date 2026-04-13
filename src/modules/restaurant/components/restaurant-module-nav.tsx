"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ChefHat,
  ConciergeBell,
  CookingPot,
  LayoutGrid,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type RestaurantModuleSection =
  | "home"
  | "operations"
  | "orders"
  | "kitchen"
  | "settlement";

type RestaurantModuleNavProps = {
  currentSection: RestaurantModuleSection;
};

type RestaurantModuleNavItem = {
  id: "home" | "operations" | "orders" | "kitchen" | "pos";
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const RESTAURANT_MODULE_ITEMS: RestaurantModuleNavItem[] = [
  {
    id: "home",
    label: "Centro restaurante",
    description: "Vista general del vertical y accesos de operación.",
    href: "/restaurant",
    icon: LayoutGrid,
  },
  {
    id: "operations",
    label: "Salón y mesas",
    description: "Apertura de mesa, orden activa y comanda.",
    href: "/restaurant/floor",
    icon: ChefHat,
  },
  {
    id: "orders",
    label: "Pedidos",
    description: "Pantalla del mesero para tomar y enviar comandas.",
    href: "/restaurant/orders/new",
    icon: ConciergeBell,
  },
  {
    id: "kitchen",
    label: "Cocina",
    description: "KDS, estaciones y seguimiento de tickets.",
    href: "/restaurant/kitchen",
    icon: CookingPot,
  },
  {
    id: "pos",
    label: "POS",
    description: "Cobro rápido y caja, fuera de la operación restaurante.",
    href: "/pos",
    icon: Monitor,
  },
];

function isActive(
  itemId: RestaurantModuleNavItem["id"],
  currentSection: RestaurantModuleSection,
) {
  if (currentSection === "settlement") {
    return itemId === "orders";
  }

  if (currentSection === "operations") {
    return itemId === "operations";
  }

  return itemId === currentSection;
}

export function RestaurantModuleNav({
  currentSection,
}: RestaurantModuleNavProps) {
  return (
    <Paper
      sx={{
        p: 1.25,
        borderRadius: "24px",
        background:
          "linear-gradient(180deg, rgba(255,250,244,0.94) 0%, rgba(248,240,228,0.9) 100%)",
        borderColor: alpha("#c2966d", 0.16),
      }}
    >
      <Stack spacing={1}>
        <Typography
          variant="overline"
          sx={{
            px: 0.75,
            color: "#8a654a",
            fontWeight: 800,
            letterSpacing: "0.14em",
          }}
        >
          Módulo restaurante
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
            gap: 1,
          }}
        >
          {RESTAURANT_MODULE_ITEMS.map((item) => {
            const active = isActive(item.id, currentSection);
            const Icon = item.icon;

            return (
              <Box
                key={item.id}
                component={Link}
                href={item.href}
                sx={{
                  minWidth: 0,
                  p: 1.35,
                  borderRadius: "18px",
                  textDecoration: "none",
                  color: active ? "#fffaf3" : "text.primary",
                  background: active
                    ? "linear-gradient(135deg, rgba(71,52,40,0.96) 0%, rgba(108,76,58,0.94) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(247,238,225,0.86) 100%)",
                  border: "1px solid",
                  borderColor: active
                    ? alpha("#f0d2af", 0.28)
                    : alpha("#c2966d", 0.16),
                  boxShadow: active
                    ? "0 16px 32px rgba(77, 50, 33, 0.18)"
                    : "0 10px 22px rgba(93, 62, 40, 0.08)",
                  transition:
                    "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: active
                      ? "0 18px 36px rgba(77, 50, 33, 0.2)"
                      : "0 14px 26px rgba(93, 62, 40, 0.12)",
                  },
                }}
              >
                <Stack spacing={0.9}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "12px",
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: active
                        ? alpha("#fffaf3", 0.12)
                        : alpha("#b98758", 0.1),
                    }}
                  >
                    <Icon size={17} />
                  </Box>

                  <Stack spacing={0.25}>
                    <Typography fontWeight={800} fontSize={13.5} color="inherit">
                      {item.label}
                    </Typography>
                    <Typography
                      fontSize={12}
                      sx={{
                        color: active
                          ? alpha("#fffaf3", 0.74)
                          : alpha("#5f4a3b", 0.82),
                      }}
                    >
                      {item.description}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Stack>
    </Paper>
  );
}
