"use client";

import type { SessionFeatureKey } from "@/lib/auth";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Monitor,
  PackageSearch,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  requiredFeature?: SessionFeatureKey;
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Resumen", icon: Boxes },
  {
    href: "/pos",
    label: "POS",
    icon: Monitor,
    requiredFeature: "POS",
  },
  {
    href: "/products",
    label: "Productos",
    icon: ClipboardList,
  },
  {
    href: "/inventory",
    label: "Inventario",
    icon: PackageSearch,
  },
  {
    href: "/sales",
    label: "Facturar Venta",
    icon: ShoppingCart,
  },
  {
    href: "/reports",
    label: "Reportes",
    icon: BarChart3,
  },
  {
    href: "/quotes",
    label: "Cotizaciones",
    icon: FileText,
    requiredFeature: "QUOTES",
  },
  {
    href: "/sri",
    label: "Facturacion",
    icon: WalletCards,
    requiredFeature: "BILLING",
  },
  {
    href: "/users",
    label: "Usuarios",
    icon: Users,
    adminOnly: true,
  },
  // {
  //   href: "#",
  //   label: "Cuentas por Cobrar",
  //   icon: Users,
  //   adminOnly: true,
  //   requiredFeature: "ACCOUNTS_RECEIVABLE",
  //   children: [
  //     { href: "/accounts-receivable", label: "Listado", icon: Users },
  //     { href: "/accounts-receivable/create", label: "Crear", icon: Users },
  //   ],
  // }
];

type MvpDashboardNavProps = {
  userRole?: "ADMIN" | "SELLER";
  businessName?: string;
  enabledFeatures?: SessionFeatureKey[];
  collapsed?: boolean;
  onToggle?: () => void;
};

type NavLinkCardProps = {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  iconOnly?: boolean;
};

const TRANSITION = "320ms cubic-bezier(0.2, 0, 0, 1)";

function NavLinkCard({ item, active, compact = false, iconOnly = false }: NavLinkCardProps) {
  const theme = useTheme();
  const Icon = item.icon;
  const activeBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.secondary.main, 0.12)})`;
  const hoverBg = alpha(theme.palette.background.paper, 0.84);

  // Mobile compact layout — unchanged
  if (compact) {
    return (
      <Box
        component={Link}
        href={item.href}
        sx={{
          display: "block",
          minWidth: 0,
          textDecoration: "none",
          borderRadius: "14px",
          border: "1px solid",
          borderColor: active ? alpha(theme.palette.primary.main, 0.24) : "transparent",
          background: active ? activeBg : "transparent",
          color: active ? "text.primary" : "text.secondary",
          boxShadow: active ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.14)}` : "none",
          transform: active ? "translateX(4px)" : "none",
          transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease",
          "&:hover": {
            background: active ? activeBg : hoverBg,
            color: "text.primary",
            borderColor: active ? alpha(theme.palette.primary.main, 0.24) : alpha(theme.palette.divider, 0.72),
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1.15, minWidth: 0 }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              color: active ? "primary.main" : "text.secondary",
              backgroundColor: active ? alpha(theme.palette.primary.light, 0.8) : alpha(theme.palette.background.paper, 0.76),
              border: "1px solid",
              borderColor: active ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.divider, 0.65),
            }}
          >
            <Icon className="h-4 w-4" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: "inherit" }}>
              {item.label}
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }

  // Desktop layout — texto se desvanece con CSS, sin render condicional
  return (
    <Box
      component={Link}
      href={item.href}
      sx={{
        display: "flex",
        textDecoration: "none",
        borderRadius: "18px",
        border: "1px solid",
        borderColor: active ? alpha(theme.palette.primary.main, 0.24) : "transparent",
        background: active ? activeBg : "transparent",
        color: active ? "text.primary" : "text.secondary",
        boxShadow: active ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.14)}` : "none",
        transform: active && !iconOnly ? "translateX(4px)" : "none",
        alignItems: "center",
        justifyContent: iconOnly ? "center" : "flex-start",
        px: iconOnly ? 0 : 2,
        py: 1.5,
        gap: iconOnly ? 0 : "10px",
        overflow: "hidden",
        transition: [
          `transform 180ms ease`,
          `border-color 180ms ease`,
          `background 180ms ease`,
          `color 180ms ease`,
          `box-shadow 180ms ease`,
          `padding ${TRANSITION}`,
          `gap ${TRANSITION}`,
          `justify-content ${TRANSITION}`,
        ].join(", "),
        "&:hover": {
          background: active ? activeBg : hoverBg,
          color: "text.primary",
          borderColor: active ? alpha(theme.palette.primary.main, 0.24) : alpha(theme.palette.divider, 0.72),
        },
      }}
    >
      <Box
        sx={{
          width: 38, height: 38, borderRadius: "14px",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          color: active ? "primary.main" : "text.secondary",
          backgroundColor: active ? alpha(theme.palette.primary.light, 0.8) : alpha(theme.palette.background.paper, 0.76),
          border: "1px solid",
          borderColor: active ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.divider, 0.65),
        }}
      >
        <Icon className="h-4.5 w-4.5" />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          overflow: "hidden",
          maxWidth: iconOnly ? 0 : 300,
          opacity: iconOnly ? 0 : 1,
          whiteSpace: "nowrap",
          transition: `max-width ${TRANSITION}, opacity 180ms ease`,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, color: "inherit" }}>
          {item.label}
        </Typography>
      </Box>
    </Box>
  );
}

export function MvpDashboardNav({
  userRole,
  businessName,
  enabledFeatures,
  collapsed = false,
  onToggle,
}: MvpDashboardNavProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => {
    const roleAllowed = !item.adminOnly || userRole === "ADMIN";
    const featureAllowed =
      !item.requiredFeature || enabledFeatures?.includes(item.requiredFeature);
    return roleAllowed && featureAllowed;
  });

  const shellBorder = alpha(theme.palette.divider, 0.72);
  const surfaceBorder = alpha(theme.palette.divider, 0.88);
  const panelBg = alpha(theme.palette.background.paper, 0.88);
  const surfaceBg = alpha(theme.palette.background.paper, 0.96);
  const mobileCardBg = alpha(theme.palette.background.paper, 0.86);
  const scrollbarThumb = alpha(theme.palette.primary.main, 0.28);
  const scrollbarThumbHover = alpha(theme.palette.primary.main, 0.42);
  const scrollbarTrack = alpha(theme.palette.background.default, 0.78);
  const desktopScrollbarSx = {
    scrollbarWidth: "thin",
    scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
    "&::-webkit-scrollbar": {
      width: 8,
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: scrollbarTrack,
      borderRadius: 999,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: scrollbarThumb,
      borderRadius: 999,
      border: `2px solid ${scrollbarTrack}`,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: scrollbarThumbHover,
    },
  } as const;
  const mobileScrollbarSx = {
    scrollbarWidth: "thin",
    scrollbarColor: `${scrollbarThumb} transparent`,
    "&::-webkit-scrollbar": {
      height: 8,
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: alpha(theme.palette.background.default, 0.5),
      borderRadius: 999,
      marginInline: 8,
    },
    "&::-webkit-scrollbar-thumb": {
      background: `linear-gradient(90deg, ${scrollbarThumb}, ${alpha(theme.palette.secondary.main, 0.34)})`,
      borderRadius: 999,
      border: `2px solid ${alpha(theme.palette.background.paper, 0.9)}`,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: `linear-gradient(90deg, ${scrollbarThumbHover}, ${alpha(theme.palette.secondary.main, 0.48)})`,
    },
  } as const;

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <Paper
        elevation={0}
        component="aside"
        sx={{
          display: { xs: "none", lg: "flex" },
          height: "100%",
          width: "100%",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "30px",
          border: `1px solid ${shellBorder}`,
          backgroundColor: panelBg,
          backdropFilter: "blur(18px)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
          p: collapsed ? 1 : 2,
          transition: `padding ${TRANSITION}`,
        }}
      >
        {/* Logo / business section — animado */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : "12px",
            borderRadius: "24px",
            border: `1px solid`,
            borderColor: collapsed ? "transparent" : surfaceBorder,
            backgroundColor: collapsed ? "transparent" : surfaceBg,
            boxShadow: collapsed ? "none" : "0 10px 26px rgba(15,23,42,0.05)",
            p: collapsed ? 0.5 : 1.5,
            overflow: "hidden",
            transition: [
              `gap ${TRANSITION}`,
              `padding ${TRANSITION}`,
              `background-color ${TRANSITION}`,
              `border-color ${TRANSITION}`,
              `box-shadow ${TRANSITION}`,
            ].join(", "),
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              width: collapsed ? 44 : 56,
              height: collapsed ? 44 : 56,
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: collapsed ? "14px" : "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${surfaceBorder}`,
              backgroundColor: alpha(theme.palette.primary.light, 0.72),
              boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
              p: 0.75,
              transition: `width ${TRANSITION}, height ${TRANSITION}, border-radius ${TRANSITION}`,
            }}
          >
            <Image
              src="/api/v1/business/logo"
              alt="Logo del negocio"
              width={100}
              height={100}
              className="object-contain"
              priority
              unoptimized
            />
          </Box>

          {/* Texto del negocio — se desvanece al colapsar */}
          <Box
            sx={{
              minWidth: 0,
              overflow: "hidden",
              maxWidth: collapsed ? 0 : 300,
              opacity: collapsed ? 0 : 1,
              whiteSpace: "nowrap",
              transition: `max-width ${TRANSITION}, opacity 200ms ease`,
            }}
          >
            <Typography
              sx={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "text.secondary" }}
            >
              {businessName ?? "Negocio Principal"}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 15, fontWeight: 700, color: "text.primary" }}>
              Panel operativo
            </Typography>
            <Typography sx={{ mt: 0.2, fontSize: 12, color: "text.secondary" }}>
              Gestion central del negocio
            </Typography>
          </Box>
        </Box>

        {/* Nav items */}
        <Box
          sx={{
            mt: collapsed ? 1 : 3,
            minHeight: 0,
            flex: 1,
            overflowY: "auto",
            pr: collapsed ? 0 : 0.5,
            ...desktopScrollbarSx,
          }}
        >
          <Typography
            sx={{
              px: 1,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "text.secondary",
              maxHeight: collapsed ? 0 : 24,
              opacity: collapsed ? 0 : 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
              transition: `max-height ${TRANSITION}, opacity 180ms ease`,
            }}
          >
            Navegacion
          </Typography>

          <Stack spacing={1.1} sx={{ mt: collapsed ? 0 : 1.5, transition: `margin-top ${TRANSITION}` }}>
            {visibleItems.map((item) => (
              <NavLinkCard
                key={item.href}
                item={item}
                active={pathname === item.href}
                iconOnly={collapsed}
              />
            ))}
          </Stack>
        </Box>

        {/* Toggle button */}
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          <IconButton
            onClick={onToggle}
            size="small"
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            sx={{
              borderRadius: "12px",
              border: `1px solid ${shellBorder}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              color: "text.secondary",
              transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
              "&:hover": {
                backgroundColor: alpha(theme.palette.background.paper, 0.95),
                borderColor: alpha(theme.palette.primary.main, 0.3),
                color: "text.primary",
              },
            }}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </IconButton>
        </Box>
      </Paper>

      {/* ── Mobile nav (horizontal scroll, unchanged) ── */}
      <Stack spacing={1.5} sx={{ display: { xs: "flex", lg: "none" } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "22px",
            border: `1px solid ${shellBorder}`,
            backgroundColor: mobileCardBg,
            backdropFilter: "blur(18px)",
            boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
            p: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                overflow: "hidden",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${surfaceBorder}`,
                backgroundColor: alpha(theme.palette.primary.light, 0.72),
                boxShadow: "0 2px 10px rgba(15,23,42,0.05)",
                p: 0.75,
              }}
            >
              <Image
                src="/api/v1/business/logo"
                alt="Logo del negocio"
                width={48}
                height={48}
                className="object-contain"
                priority
                unoptimized
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                {businessName ?? "Negocio Principal"}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                Panel operativo
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            pr: 0.25,
            scrollBehavior: "smooth",
            scrollSnapType: "x proximity",
            ...mobileScrollbarSx,
          }}
        >
          {visibleItems.map((item) => (
            <Box
              key={`mobile-${item.href}`}
              sx={{ minWidth: 180, flexShrink: 0, scrollSnapAlign: "start" }}
            >
              <NavLinkCard
                item={item}
                active={pathname === item.href}
                compact
              />
            </Box>
          ))}
        </Box>
      </Stack>
    </>
  );
}
