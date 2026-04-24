"use client";

import type { SessionFeatureKey } from "@/lib/auth";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import {
  BarChart3,
  Boxes,
  ChefHat,
  ConciergeBell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderTree,
  HandCoins,
  LayoutGrid,
  Monitor,
  PackageSearch,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Table2,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  adminOnly?: boolean;
  requiredFeature?: SessionFeatureKey;
  children?: NavItem[];
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const CORE_NAV_ITEMS: NavItem[] = [
  { id: "overview", href: "/overview", label: "Resumen", icon: Boxes },
  {
    id: "pos",
    href: "/pos",
    label: "POS",
    icon: Monitor,
    requiredFeature: "POS",
  },
];

const RESTAURANT_NAV_ITEMS: NavItem[] = [
  {
    id: "restaurant-floor",
    href: "/restaurant/floor",
    label: "Piso y Mesas",
    icon: ChefHat,
    requiredFeature: "POS",
  },
  {
    id: "restaurant-orders",
    href: "/restaurant/orders/new",
    label: "Pedidos",
    icon: ConciergeBell,
    requiredFeature: "POS",
  },
  {
    id: "restaurant-kitchen",
    href: "/restaurant/kitchen",
    label: "Cocina",
    icon: ChefHat,
    requiredFeature: "POS",
  },
  {
    id: "restaurant-settings",
    label: "Configuración restaurante",
    icon: Settings2,
    requiredFeature: "POS",
    adminOnly: true,
    children: [
      {
        id: "restaurant-settings-dishes",
        href: "/restaurant/settings/dishes",
        label: "Menú",
        icon: UtensilsCrossed,
      },
      {
        id: "restaurant-settings-halls",
        href: "/restaurant/settings/halls",
        label: "Salón",
        icon: LayoutGrid,
      },
      {
        id: "restaurant-settings-tables",
        href: "/restaurant/settings/tables",
        label: "Mesas",
        icon: Table2,
      },
    ],
  },
];

const BUSINESS_NAV_ITEMS: NavItem[] = [
  {
    id: "accounting",
    label: "Contabilidad",
    icon: HandCoins,
    adminOnly: true,
    children: [
      {
        id: "accounting-account-plan",
        href: "/accounting/account-plan",
        label: "Plan de Cuentas",
        icon: FolderTree,
      },
      {
        id: "accounting-entries",
        href: "/accounting/asientos",
        label: "Asientos Contables",
        icon: HandCoins,
      },
      {
        id: "accounting-journals",
        href: "/accounting/diarios",
        label: "Libro Diario",
        icon: HandCoins,
      },
      {
        id: "libro-mayor",
        href: "/accounting/libro-mayor",
        label: "Libro Mayor",
        icon: HandCoins,
      },
      {
        id: "balance-comprobacion",
        href: "/accounting/balance-comprobacion",
        label: "Balance de Comprobación",
        icon: HandCoins,
      },
      {
        id: "balance-general",
        href: "/accounting/balance-general",
        label: "Balance General",
        icon: HandCoins,
      },
      {
        id: "estado-resultados",
        href: "/accounting/estado-resultados",
        label: "Estado de Resultados",
        icon: HandCoins,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    icon: PackageSearch,
    children: [
      {
        id: "inventory-products",
        href: "/inventory/products",
        label: "Productos",
        icon: PackageSearch,
      },
      {
        id: "inventory-stock-taking",
        href: "/inventory/stock-taking",
        label: "Toma de Inventario",
        icon: PackageSearch,
      },
      {
        id: "inventory-adjustments",
        href: "/inventory/inventory-adjustment",
        label: "Ajustes de Inventario",
        icon: PackageSearch,
      },
      {
        id: "inventory-kardex",
        href: "/inventory/kardex",
        label: "Kardex",
        icon: PackageSearch,
      },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    icon: ClipboardList,
    children: [
      {
        id: "purchases-suppliers",
        href: "/purchases/suppliers",
        label: "Proveedores",
        icon: Truck,
      },
      {
        id: "purchases-register",
        href: "/purchases/register-purchases",
        label: "Registrar compra",
        icon: ReceiptText,
      },
      {
        id: "purchases-list",
        href: "/purchases/registered-purchases",
        label: "Compras registradas",
        icon: ClipboardList,
      },
      {
        id: "purchases-payables",
        href: "/purchases/payables",
        label: "Cuentas por pagar",
        icon: HandCoins,
      },
    ],
  },
  {
    id: "sales",
    label: "Ventas",
    icon: ShoppingCart,
    children: [
      {
        id: "sales-billing",
        href: "/sales",
        label: "Facturar",
        icon: ShoppingCart,
      },
      {
        id: "sales-quotes",
        href: "/quotes",
        label: "Cotizaciones",
        icon: FileText,
        requiredFeature: "QUOTES",
      },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    icon: BarChart3,
    children: [
      {
        id: "reports-sales-period",
        href: "/reports/sales-period",
        label: "Ventas por periodo",
        icon: BarChart3,
      },
      {
        id: "reports-sales-by-customer",
        href: "/reports/sales-by-customer",
        label: "Ventas por cliente",
        icon: BarChart3,
      },
      {
        id: "reports-sales-by-product",
        href: "/reports/sales-by-product",
        label: "Ventas por producto",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "electronic-invoicing",
    label: "Facturación Electrónica",
    icon: FileText,
    // requiredFeature: "ELECTRONIC_INVOICING",
    children: [
      {
        id: "electronic-documents",
        href: "/electronic-invoicing/documents",
        label: "Documentos Electronicos",
        icon: FileText,
      }
    ],
  },
];

type MvpDashboardNavProps = {
  userRole?: "ADMIN" | "SELLER";
  businessName?: string;
  enabledFeatures?: SessionFeatureKey[];
  restaurantEnabled?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
};

type NavLinkCardProps = {
  item: NavItem;
  active: boolean;
};

const TRANSITION = "320ms cubic-bezier(0.2, 0, 0, 1)";

function isPathActive(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemAllowed(
  item: NavItem,
  userRole?: MvpDashboardNavProps["userRole"],
  enabledFeatures?: SessionFeatureKey[],
) {
  const roleAllowed = !item.adminOnly || userRole === "ADMIN";
  const featureAllowed =
    !item.requiredFeature || enabledFeatures?.includes(item.requiredFeature);

  return roleAllowed && featureAllowed;
}

function getVisibleNavItems(
  items: NavItem[],
  userRole?: MvpDashboardNavProps["userRole"],
  enabledFeatures?: SessionFeatureKey[],
): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    if (!isItemAllowed(item, userRole, enabledFeatures)) {
      return acc;
    }

    if (!item.children?.length) {
      return item.href ? [...acc, item] : acc;
    }

    const visibleChildren = getVisibleNavItems(
      item.children,
      userRole,
      enabledFeatures,
    );

    if (!visibleChildren.length && !item.href) {
      return acc;
    }

    return [...acc, { ...item, children: visibleChildren }];
  }, []);
}

function getVisibleNavSections(
  sections: NavSection[],
  userRole?: MvpDashboardNavProps["userRole"],
  enabledFeatures?: SessionFeatureKey[],
) {
  return sections.reduce<NavSection[]>((acc, section) => {
    const items = getVisibleNavItems(section.items, userRole, enabledFeatures);

    return items.length ? [...acc, { ...section, items }] : acc;
  }, []);
}

function getNavSections(options?: { restaurantEnabled?: boolean }) {
  return [
    { id: "core", label: "Accesos principales", items: CORE_NAV_ITEMS },
    ...(options?.restaurantEnabled
      ? ([
          {
            id: "restaurant",
            label: "Operación restaurante",
            items: RESTAURANT_NAV_ITEMS,
          },
        ] satisfies NavSection[])
      : []),
    {
      id: "business",
      label: "Procesos del negocio",
      items: BUSINESS_NAV_ITEMS,
    },
  ];
}

function NavLinkCard({ item, active }: NavLinkCardProps) {
  const theme = useTheme();
  const Icon = item.icon;
  const activeBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.primary.main, 0.09)})`;
  const hoverBg = alpha(theme.palette.background.paper, 0.72);
  const focusRing = `0 0 0 1px ${alpha(theme.palette.primary.main, 0.34)}, 0 0 0 4px ${alpha(theme.palette.primary.main, 0.16)}`;

  return (
    <Box
      component={Link}
      href={item.href ?? "#"}
      aria-current={active ? "page" : undefined}
      sx={{
        display: "block",
        minWidth: 0,
        position: "relative",
        textDecoration: "none",
        borderRadius: "16px",
        border: "1px solid",
        borderColor: active
          ? alpha(theme.palette.primary.main, 0.24)
          : alpha(theme.palette.divider, 0.68),
        background: active
          ? activeBg
          : alpha(theme.palette.background.paper, 0.52),
        color: active ? "text.primary" : "text.secondary",
        boxShadow: active
          ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`
          : "none",
        transition:
          "border-color 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease",
        // "&::before": {
        //   content: '""',
        //   position: "absolute",
        //   top: 10,
        //   bottom: 10,
        //   left: 8,
        //   width: 3,
        //   borderRadius: 999,
        //   backgroundColor: active ? theme.palette.primary.main : "transparent",
        //   transition: "background-color 180ms ease",
        // },
        "&:hover": {
          background: active ? activeBg : hoverBg,
          color: "text.primary",
          borderColor: active
            ? alpha(theme.palette.primary.main, 0.24)
            : alpha(theme.palette.divider, 0.72),
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: focusRing,
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 1.75, py: 1.15, minWidth: 0 }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: active ? "primary.main" : "text.secondary",
            backgroundColor: active
              ? alpha(theme.palette.primary.light, 0.94)
              : alpha(theme.palette.background.paper, 0.76),
            border: "1px solid",
            borderColor: active
              ? alpha(theme.palette.primary.main, 0.18)
              : alpha(theme.palette.divider, 0.65),
          }}
        >
          <Icon className="h-4 w-4" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.2,
              color: "inherit",
            }}
          >
            {item.label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

type NavModuleCardProps = {
  item: NavItem;
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
  idPrefix?: string;
};

function NavSubItem({ item, active }: { item: NavItem; active: boolean }) {
  const theme = useTheme();
  const hoverBg = alpha(theme.palette.background.paper, 0.84);
  const activeBg = alpha(theme.palette.primary.main, 0.1);
  const focusRing = `0 0 0 1px ${alpha(theme.palette.primary.main, 0.28)}, 0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`;

  return (
    <Box
      component={Link}
      href={item.href ?? "#"}
      aria-current={active ? "page" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        textDecoration: "none",
        borderRadius: "14px",
        px: 1.5,
        py: 1,
        ml: 0.75,
        border: "1px solid",
        borderColor: active
          ? alpha(theme.palette.primary.main, 0.18)
          : "transparent",
        backgroundColor: active ? activeBg : "transparent",
        color: active ? theme.palette.primary.main : "text.secondary",
        transition:
          "background 180ms ease, color 180ms ease, border-color 180ms ease",
        "&:hover": {
          background: active ? activeBg : hoverBg,
          color: active ? theme.palette.primary.main : "text.primary",
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: focusRing,
        },
      }}
    >
      <Box
        sx={{
          width: active ? 8 : 5,
          height: active ? 8 : 5,
          borderRadius: "50%",
          flexShrink: 0,
          backgroundColor: active
            ? theme.palette.primary.main
            : alpha(theme.palette.text.secondary, 0.4),
          boxShadow: active
            ? `0 0 6px ${alpha(theme.palette.primary.main, 0.55)}`
            : "none",
          transition:
            "width 180ms ease, height 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
        }}
      />
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          lineHeight: 1.2,
          color: "inherit",
        }}
      >
        {item.label}
      </Typography>
    </Box>
  );
}

function NavModuleCard({
  item,
  items,
  open,
  onToggle,
  idPrefix = "nav",
}: NavModuleCardProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const Icon = item.icon;

  const anyChildActive = items.some((child) =>
    isPathActive(pathname, child.href),
  );
  const collapseId = `${idPrefix}-${item.id}-children`;

  const headerHighlighted = open || anyChildActive;
  const activeBg = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.16)}, ${alpha(theme.palette.primary.main, 0.08)})`;
  const focusRing = `0 0 0 1px ${alpha(theme.palette.primary.main, 0.34)}, 0 0 0 4px ${alpha(theme.palette.primary.main, 0.16)}`;

  return (
    <Box
      sx={{
        borderRadius: "18px",
        border: "1px solid",
        borderColor: headerHighlighted
          ? alpha(theme.palette.primary.main, 0.24)
          : alpha(theme.palette.divider, 0.68),
        background: headerHighlighted
          ? activeBg
          : alpha(theme.palette.background.paper, 0.52),
        overflow: "hidden",
        transition:
          "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
        boxShadow: headerHighlighted
          ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.14)}`
          : "none",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={collapseId}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.15,
          border: 0,
          background: "transparent",
          color: headerHighlighted ? "text.primary" : "text.secondary",
          cursor: "pointer",
          textAlign: "left",
          "&:focus-visible": {
            outline: "none",
            boxShadow: `inset ${focusRing}`,
          },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: anyChildActive ? "primary.main" : "text.secondary",
            backgroundColor: anyChildActive
              ? alpha(theme.palette.primary.light, 0.8)
              : alpha(theme.palette.background.paper, 0.76),
            border: "1px solid",
            borderColor: anyChildActive
              ? alpha(theme.palette.primary.main, 0.18)
              : alpha(theme.palette.divider, 0.65),
          }}
        >
          <Icon className="h-4 w-4" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.2,
              color: "inherit",
            }}
          >
            {item.label}
          </Typography>
        </Box>
        <ChevronDown
          className="h-4 w-4"
          style={{
            flexShrink: 0,
            transition: "transform 220ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      <Collapse in={open} timeout={220}>
        <Stack
          id={collapseId}
          spacing={0.5}
          sx={{
            mx: 1,
            mb: 1,
            px: 0.5,
            pb: 0.5,
            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
          }}
        >
          {items.map((subItem) => (
            <NavSubItem
              key={subItem.id}
              item={subItem}
              active={isPathActive(pathname, subItem.href)}
            />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

export function MvpDashboardNav({
  userRole,
  businessName,
  enabledFeatures,
  restaurantEnabled = false,
  collapsed = false,
  onToggle,
}: MvpDashboardNavProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const visibleSections = useMemo(
    () =>
      getVisibleNavSections(
        getNavSections({ restaurantEnabled }),
        userRole,
        enabledFeatures,
      ),
    [enabledFeatures, restaurantEnabled, userRole],
  );

  const shellBorder = alpha(theme.palette.divider, 0.72);
  const surfaceBorder = alpha(theme.palette.divider, 0.88);
  const panelBg = alpha(theme.palette.background.paper, 0.88);
  const surfaceBg = alpha(theme.palette.background.paper, 0.96);
  const mobileCardBg = alpha(theme.palette.background.paper, 0.86);
  const sectionLabelColor = alpha(theme.palette.text.secondary, 0.84);
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
  const firstActiveModuleId = useMemo(() => {
    for (const section of visibleSections) {
      const activeModule = section.items.find(
        (item) =>
          item.children?.length &&
          item.children.some((child) => isPathActive(pathname, child.href)),
      );

      if (activeModule) {
        return activeModule.id;
      }
    }

    return null;
  }, [pathname, visibleSections]);
  const [desktopOpenModuleId, setDesktopOpenModuleId] = useState<string | null>(
    firstActiveModuleId,
  );
  const [mobileOpenModuleId, setMobileOpenModuleId] = useState<string | null>(
    firstActiveModuleId,
  );

  function toggleModule(
    moduleId: string,
    currentOpenId: string | null,
    setOpenId: Dispatch<SetStateAction<string | null>>,
  ) {
    setOpenId(currentOpenId === moduleId ? null : moduleId);
  }

  return (
    <>
      <Paper
        elevation={0}
        component="aside"
        aria-label="Navegacion principal"
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
          p: collapsed ? 1.25 : 2,
          transition: `padding ${TRANSITION}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "12px",
            borderRadius: "24px",
            border: `1px solid`,
            borderColor: surfaceBorder,
            backgroundColor: surfaceBg,
            boxShadow: "0 10px 26px rgba(15,23,42,0.05)",
            p: collapsed ? 1.1 : 1.5,
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
          <Box
            sx={{
              width: collapsed ? 46 : 56,
              height: collapsed ? 46 : 56,
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: collapsed ? "16px" : "18px",
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

          <Box
            sx={{
              minWidth: 0,
              overflow: "hidden",
              maxWidth: collapsed ? 124 : 300,
              opacity: 1,
              whiteSpace: "nowrap",
              transition: `max-width ${TRANSITION}, opacity 200ms ease`,
            }}
          >
            <Typography
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: collapsed ? 10 : 11,
                fontWeight: 800,
                letterSpacing: collapsed ? "0.16em" : "0.22em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              {businessName ?? "Negocio Principal"}
            </Typography>
            <Typography
              sx={{
                mt: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: collapsed ? 13 : 15,
                fontWeight: 700,
                color: "text.primary",
              }}
            >
              Panel operativo
            </Typography>
            <Stack
              direction="row"
              spacing={0.8}
              alignItems="center"
              sx={{
                mt: 0.55,
                maxHeight: collapsed ? 0 : 24,
                opacity: collapsed ? 0 : 1,
                overflow: "hidden",
                transition: `max-height ${TRANSITION}, opacity 180ms ease`,
              }}
            >
              {/* <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.success.main,
                  boxShadow: `0 0 0 4px ${alpha(theme.palette.success.main, 0.14)}`,
                }}
              />
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Modulos operativos habilitados
              </Typography> */}
            </Stack>
          </Box>
        </Box>

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
          <Stack spacing={collapsed ? 1.1 : 2.2}>
            {visibleSections.map((section) => (
              <Box key={section.id}>
                <Typography
                  sx={{
                    px: 1,
                    mb: 0.9,
                    fontSize: collapsed ? 9 : 10,
                    fontWeight: 800,
                    letterSpacing: collapsed ? "0.14em" : "0.18em",
                    textTransform: "uppercase",
                    color: sectionLabelColor,
                    whiteSpace: "nowrap",
                    transition: `max-height ${TRANSITION}, opacity 180ms ease, margin-bottom 180ms ease`,
                  }}
                >
                  {section.label}
                </Typography>

                <Stack spacing={1.1}>
                  {section.items.map((item) => {
                    const content =
                      item.children && item.children.length > 0 ? (
                        <NavModuleCard
                          key={item.id}
                          item={item}
                          items={item.children}
                          open={desktopOpenModuleId === item.id}
                          onToggle={() =>
                            toggleModule(
                              item.id,
                              desktopOpenModuleId,
                              setDesktopOpenModuleId,
                            )
                          }
                          idPrefix="desktop"
                        />
                      ) : (
                        <NavLinkCard
                          key={item.id}
                          item={item}
                          active={isPathActive(pathname, item.href)}
                        />
                      );

                    return <Box key={item.id}>{content}</Box>;
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

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
              transition:
                "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
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

        <Paper
          elevation={0}
          sx={{
            borderRadius: "22px",
            border: `1px solid ${shellBorder}`,
            backgroundColor: mobileCardBg,
            backdropFilter: "blur(18px)",
            boxShadow: "0 8px 30px rgba(15,23,42,0.05)",
            p: 1,
          }}
        >
          <Stack
            spacing={2}
            sx={{
              maxHeight: "min(60vh, 520px)",
              overflowY: "auto",
              pr: 0.25,
              ...mobileScrollbarSx,
            }}
          >
            {visibleSections.map((section) => (
              <Box key={`mobile-${section.id}`}>
                <Typography
                  sx={{
                    px: 0.5,
                    mb: 0.9,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: sectionLabelColor,
                  }}
                >
                  {section.label}
                </Typography>
                <Stack spacing={1}>
                  {section.items.map((item) =>
                    item.children && item.children.length > 0 ? (
                      <NavModuleCard
                        key={`mobile-${item.id}`}
                        item={item}
                        items={item.children}
                        open={mobileOpenModuleId === item.id}
                        onToggle={() =>
                          toggleModule(
                            item.id,
                            mobileOpenModuleId,
                            setMobileOpenModuleId,
                          )
                        }
                        idPrefix="mobile"
                      />
                    ) : (
                      <NavLinkCard
                        key={`mobile-${item.id}`}
                        item={item}
                        active={isPathActive(pathname, item.href)}
                      />
                    ),
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </>
  );
}
