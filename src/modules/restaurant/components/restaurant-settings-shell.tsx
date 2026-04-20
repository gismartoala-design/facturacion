"use client";

import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { ArrowLeftRight, Building2, PackageSearch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { RestaurantBootstrap } from "@/modules/restaurant/components/restaurant-operations-types";

type RestaurantSettingsShellProps = {
  title: string;
  description: string;
  initialBootstrap: RestaurantBootstrap | null;
  initialBootstrapError?: string | null;
  children: ReactNode;
};

export function RestaurantSettingsShell({
  title,
  description,
  initialBootstrap,
  initialBootstrapError = null,
  children,
}: RestaurantSettingsShellProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 1.5, sm: 2, lg: 3 },
        py: { xs: 1.5, sm: 2, lg: 2.5 },
      }}
    >
      <Stack spacing={2}>
        <Paper
          variant="outlined"
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: { xs: 1.5, sm: 2 },
            borderRadius: "22px",
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Stack spacing={0.5}>
                <Typography variant="overline" sx={{ fontWeight: 700 }}>
                  Configuración restaurante
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {initialBootstrap?.business.name ?? "Restaurante"} · {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  component={Link}
                  href="/restaurant/orders/new"
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowLeftRight size={16} />}
                >
                  Volver a operación
                </Button>
                <Button
                  component={Link}
                  href="/company"
                  variant="outlined"
                  size="small"
                  startIcon={<Building2 size={16} />}
                >
                  Empresa
                </Button>
                <Button
                  component={Link}
                  href="/inventory/products"
                  variant="outlined"
                  size="small"
                  startIcon={<PackageSearch size={16} />}
                >
                  Catálogo base
                </Button>
              </Stack>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Administra estructura base del restaurante sin mezclarlo con la operación diaria.
            </Typography>
          </Stack>
        </Paper>

        {initialBootstrapError ? (
          <Alert severity="error" variant="outlined">
            {initialBootstrapError}
          </Alert>
        ) : null}

        {children}
      </Stack>
    </Box>
  );
}
