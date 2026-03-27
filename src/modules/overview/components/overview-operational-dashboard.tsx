"use client";

import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  FileText,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import type {
  Product,
  Quote,
  SriInvoice,
  StockItem,
} from "@/shared/dashboard/types";

type OverviewOperationalDashboardProps = {
  products: Product[];
  stock: StockItem[];
  openQuotes: Quote[];
  pendingInvoices: SriInvoice[];
  errorInvoices: SriInvoice[];
};

type ActionItem = {
  href: string;
  label: string;
  meta: string;
  tone: "amber" | "rose" | "emerald" | "slate";
};

function toneStyles(tone: ActionItem["tone"]) {
  if (tone === "amber") {
    return {
      background: "rgba(255, 247, 237, 0.95)",
      border: "1px solid rgba(253, 186, 116, 0.75)",
      chipBg: "rgba(255, 237, 213, 1)",
      chipColor: "#c2410c",
    };
  }

  if (tone === "rose") {
    return {
      background: "rgba(255, 241, 242, 0.95)",
      border: "1px solid rgba(253, 164, 175, 0.7)",
      chipBg: "rgba(255, 228, 230, 1)",
      chipColor: "#be123c",
    };
  }

  if (tone === "emerald") {
    return {
      background: "rgba(236, 253, 245, 0.95)",
      border: "1px solid rgba(110, 231, 183, 0.7)",
      chipBg: "rgba(209, 250, 229, 1)",
      chipColor: "#047857",
    };
  }

  return {
    background: "rgba(248, 250, 252, 0.95)",
    border: "1px solid rgba(203, 213, 225, 0.8)",
    chipBg: "rgba(241, 245, 249, 1)",
    chipColor: "#475569",
  };
}

export function OverviewOperationalDashboard({
  products,
  stock,
  openQuotes,
  pendingInvoices,
  errorInvoices,
}: OverviewOperationalDashboardProps) {
  const lowStockItems = useMemo(
    () =>
      stock
        .filter((item) => item.lowStock)
        .sort(
          (a, b) =>
            b.minQuantity -
            b.quantity -
            (a.minQuantity - a.quantity),
        ),
    [stock],
  );

  const criticalStockItems = lowStockItems.slice(0, 6);
  const recentOpenQuotes = [...openQuotes]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 6);

  const attentionItems: ActionItem[] = [
    {
      href: "/inventory",
      label: "Stock bajo",
      meta: `${lowStockItems.length} producto${lowStockItems.length === 1 ? "" : "s"} requieren revisión`,
      tone: lowStockItems.length > 0 ? "amber" : "emerald",
    },
    {
      href: "/sri",
      label: "Pendientes SRI",
      meta: `${pendingInvoices.length} comprobante${pendingInvoices.length === 1 ? "" : "s"} siguen en cola`,
      tone: pendingInvoices.length > 0 ? "amber" : "emerald",
    },
    {
      href: "/sri",
      label: "Errores SRI",
      meta: `${errorInvoices.length} factura${errorInvoices.length === 1 ? "" : "s"} con error`,
      tone: errorInvoices.length > 0 ? "rose" : "emerald",
    },
    {
      href: "/quotes",
      label: "Cotizaciones abiertas",
      meta: `${openQuotes.length} cotizacion${openQuotes.length === 1 ? "" : "es"} por seguimiento`,
      tone: openQuotes.length > 0 ? "slate" : "emerald",
    },
  ];

  const quickActions = [
    {
      href: "/sales",
      label: "Facturar venta",
      caption: "Registrar venta y emitir documentos",
      icon: ShoppingCart,
    },
    {
      href: "/sales?mode=quote",
      label: "Nueva cotización",
      caption: "Crear propuesta sin afectar inventario",
      icon: FileText,
    },
    {
      href: "/inventory",
      label: "Ajustar stock",
      caption: "Corregir entradas, salidas o ajustes",
      icon: Boxes,
    },
    {
      href: "/sri",
      label: "Revisar SRI",
      caption: "Atender errores y pendientes de autorización",
      icon: CircleAlert,
    },
  ];

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75} sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Typography
          variant="h5"
          sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.1 }}
        >
          Centro Operativo
        </Typography>
        <Typography
          sx={{
            maxWidth: 760,
            color: "rgba(74, 60, 88, 0.68)",
            fontSize: 14,
          }}
        >
          Lo importante del día en un solo lugar: qué atender primero, dónde
          actuar y qué módulos necesitan seguimiento.
        </Typography>
      </Stack>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Paper sx={{ borderRadius: "24px", p: 2.5 }}>
          <Stack spacing={1}>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 13 }}>
              Cotizaciones abiertas
            </Typography>
            <Typography sx={{ color: "#4a3c58", fontSize: 30, fontWeight: 800 }}>
              {openQuotes.length}
            </Typography>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 12 }}>
              Propuestas que todavía esperan seguimiento o facturación.
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: "24px", p: 2.5 }}>
          <Stack spacing={1}>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 13 }}>
              Productos con stock bajo
            </Typography>
            <Typography sx={{ color: "#4a3c58", fontSize: 30, fontWeight: 800 }}>
              {lowStockItems.length}
            </Typography>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 12 }}>
              Ítems por debajo del mínimo configurado.
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: "24px", p: 2.5 }}>
          <Stack spacing={1}>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 13 }}>
              Pendientes SRI
            </Typography>
            <Typography sx={{ color: "#4a3c58", fontSize: 30, fontWeight: 800 }}>
              {pendingInvoices.length}
            </Typography>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 12 }}>
              Facturas todavía en cola o esperando resolución.
            </Typography>
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: "24px", p: 2.5 }}>
          <Stack spacing={1}>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 13 }}>
              Errores SRI
            </Typography>
            <Typography sx={{ color: "#4a3c58", fontSize: 30, fontWeight: 800 }}>
              {errorInvoices.length}
            </Typography>
            <Typography sx={{ color: "rgba(74, 60, 88, 0.62)", fontSize: 12 }}>
              Comprobantes que necesitan atención manual.
            </Typography>
          </Stack>
        </Paper>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Paper sx={{ borderRadius: "28px", p: 3 }}>
          <Stack spacing={2.5}>
            <div>
              <Typography sx={{ color: "#4a3c58", fontSize: 20, fontWeight: 700 }}>
                Pendientes por atender
              </Typography>
              <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 13 }}>
                Este bloque debería ayudarte a decidir dónde entrar primero.
              </Typography>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {attentionItems.map((item) => {
                const tone = toneStyles(item.tone);
                return (
                  <Link key={item.label} href={item.href} className="block">
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "22px",
                        backgroundColor: tone.background,
                        border: tone.border,
                        transition: "transform 160ms ease, box-shadow 160ms ease",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 16px 30px rgba(74, 60, 88, 0.08)",
                        },
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Chip
                          label={item.label}
                          size="small"
                          sx={{
                            width: "fit-content",
                            borderRadius: "999px",
                            fontWeight: 700,
                            backgroundColor: tone.chipBg,
                            color: tone.chipColor,
                          }}
                        />
                        <Typography sx={{ color: "#4a3c58", fontSize: 14 }}>
                          {item.meta}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ color: "#4a3c58", fontSize: 13, fontWeight: 700 }}>
                            Ir al módulo
                          </Typography>
                          <ArrowRight className="h-4 w-4 text-[#4a3c58]" />
                        </Stack>
                      </Stack>
                    </Paper>
                  </Link>
                );
              })}
            </div>
          </Stack>
        </Paper>

        <Stack spacing={3}>
          <Paper sx={{ borderRadius: "28px", p: 3 }}>
            <Stack spacing={2}>
              <div>
                <Typography sx={{ color: "#4a3c58", fontSize: 20, fontWeight: 700 }}>
                  Accesos rápidos
                </Typography>
                <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 13 }}>
                  Entradas directas a lo que más se usa en operación.
                </Typography>
              </div>
              <div className="grid gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <MuiButton
                      key={action.href}
                      component={Link}
                      href={action.href}
                      variant="outlined"
                      sx={{
                        justifyContent: "space-between",
                        borderRadius: "18px",
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Icon className="h-4 w-4" />
                        <Stack spacing={0.25} alignItems="flex-start">
                          <span>{action.label}</span>
                          <span className="text-[11px] font-normal text-[#4a3c58]/60">
                            {action.caption}
                          </span>
                        </Stack>
                      </Stack>
                      <ArrowRight className="h-4 w-4" />
                    </MuiButton>
                  );
                })}
              </div>
            </Stack>
          </Paper>

        </Stack>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Paper sx={{ borderRadius: "28px", p: 3 }}>
          <Stack spacing={2}>
            <div>
              <Typography sx={{ color: "#4a3c58", fontSize: 20, fontWeight: 700 }}>
                Stock crítico
              </Typography>
              <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 13 }}>
                Los productos con mayor urgencia para revisión.
              </Typography>
            </div>

            {criticalStockItems.length === 0 ? (
              <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 14 }}>
                No hay alertas de inventario en este momento.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {criticalStockItems.map((item) => (
                  <Paper
                    key={item.productId}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "20px",
                      border: "1px solid rgba(232, 213, 229, 0.7)",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <div>
                        <Typography sx={{ color: "#4a3c58", fontSize: 14, fontWeight: 700 }}>
                          {item.productName}
                        </Typography>
                        <Typography sx={{ color: "rgba(74, 60, 88, 0.64)", fontSize: 12 }}>
                          {item.codigo}
                        </Typography>
                      </div>
                      <Stack spacing={0.25} alignItems="flex-end">
                        <Typography sx={{ color: "#c2410c", fontSize: 13, fontWeight: 700 }}>
                          {item.quantity.toFixed(3)} / min {item.minQuantity.toFixed(3)}
                        </Typography>
                        <Typography sx={{ color: "rgba(74, 60, 88, 0.56)", fontSize: 12 }}>
                          Requiere ajuste
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>

        <Paper sx={{ borderRadius: "28px", p: 3 }}>
          <Stack spacing={2}>
            <div>
              <Typography sx={{ color: "#4a3c58", fontSize: 20, fontWeight: 700 }}>
                Cotizaciones recientes
              </Typography>
              <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 13 }}>
                Las abiertas más recientes para seguimiento o facturación.
              </Typography>
            </div>

            {recentOpenQuotes.length === 0 ? (
              <Typography sx={{ color: "rgba(74, 60, 88, 0.66)", fontSize: 14 }}>
                No hay cotizaciones abiertas por ahora.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {recentOpenQuotes.map((quote) => (
                  <Paper
                    key={quote.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "20px",
                      border: "1px solid rgba(232, 213, 229, 0.7)",
                      backgroundColor: "#fff",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <div>
                        <Typography sx={{ color: "#4a3c58", fontSize: 14, fontWeight: 700 }}>
                          #{quote.quoteNumber} · {quote.customerName}
                        </Typography>
                        <Typography sx={{ color: "rgba(74, 60, 88, 0.64)", fontSize: 12 }}>
                          {quote.customerIdentification} · {quote.fechaEmision}
                        </Typography>
                      </div>
                      <Stack spacing={0.25} alignItems="flex-end">
                        <Typography sx={{ color: "#4a3c58", fontSize: 13, fontWeight: 700 }}>
                          ${quote.total.toFixed(2)}
                        </Typography>
                        <Chip
                          label="Abierta"
                          size="small"
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 700,
                            backgroundColor: "#fff7ed",
                            color: "#c2410c",
                          }}
                        />
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </section>
    </Stack>
  );
}
