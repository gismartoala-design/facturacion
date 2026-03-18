import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type Product,
  type SriInvoice,
  type StockItem,
} from "@/components/mvp-dashboard-types";
import type { PaginationMeta } from "@/components/mvp-dashboard-types";

type OverviewSectionProps = {
  products: Product[];
  lowStockCount: number;
  pendingInvoices: SriInvoice[];
  checkoutTotal: number;
  stock: StockItem[];
};

const OVERVIEW_ALERTS_PREVIEW = 8;
const OVERVIEW_PENDING_PREVIEW = 6;

export function OverviewSection({
  products,
  lowStockCount,
  pendingInvoices,
  checkoutTotal,
  stock,
}: OverviewSectionProps) {
  const [alertsQuery, setAlertsQuery] = useState("");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const lowStockItems = useMemo(
    () =>
      stock
        .filter((item) => item.lowStock)
        .sort(
          (a, b) => b.minQuantity - b.quantity - (a.minQuantity - a.quantity),
        ),
    [stock],
  );

  const filteredAlerts = useMemo(() => {
    const q = alertsQuery.trim().toLowerCase();
    if (!q) return lowStockItems;
    return lowStockItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q),
    );
  }, [alertsQuery, lowStockItems]);

  const visibleAlerts = showAllAlerts
    ? filteredAlerts
    : filteredAlerts.slice(0, OVERVIEW_ALERTS_PREVIEW);
  const pendingPreview = pendingInvoices.slice(0, OVERVIEW_PENDING_PREVIEW);

  function onSearchAlerts(value: string) {
    setAlertsQuery(value);
    setShowAllAlerts(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2 h-24">
        <h1 className="text-2xl font-bold text-[#4a3c58]">Resumen Operativo</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Productos</CardDescription>
            <CardTitle>{products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>SKU con stock bajo</CardDescription>
            <CardTitle>{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pendientes SRI</CardDescription>
            <CardTitle>{pendingInvoices.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total carrito actual</CardDescription>
            <CardTitle>${checkoutTotal.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Alertas de Inventario</CardTitle>
                <CardDescription>
                  {filteredAlerts.length} alerta
                  {filteredAlerts.length !== 1 ? "s" : ""} encontrada
                  {filteredAlerts.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b1a1c6]" />
                <Input
                  placeholder="Buscar por codigo o producto..."
                  value={alertsQuery}
                  onChange={(e) => onSearchAlerts(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-107.5 overflow-auto">
              <Table>
                <THead>
                  <Tr>
                    <Th>Codigo</Th>
                    <Th>Producto</Th>
                    <Th>Stock</Th>
                    <Th>Minimo</Th>
                  </Tr>
                </THead>
                <TBody>
                  {visibleAlerts.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} className="text-[#4a3c58]/60">
                        {alertsQuery
                          ? "Sin coincidencias para tu busqueda."
                          : "Sin alertas de stock."}
                      </Td>
                    </Tr>
                  ) : (
                    visibleAlerts.map((row) => (
                      <Tr key={row.productId}>
                        <Td className="font-medium">{row.codigo}</Td>
                        <Td>{row.productName}</Td>
                        <Td>{row.quantity.toFixed(3)}</Td>
                        <Td>{row.minQuantity.toFixed(3)}</Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>

            {filteredAlerts.length > OVERVIEW_ALERTS_PREVIEW ? (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllAlerts((prev) => !prev)}
                >
                  {showAllAlerts
                    ? "Ver menos"
                    : `Ver todas (${filteredAlerts.length - OVERVIEW_ALERTS_PREVIEW} mas)`}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pendientes SRI</CardTitle>
              <CardDescription>
                {pendingInvoices.length} comprobante
                {pendingInvoices.length !== 1 ? "s" : ""} en cola
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPreview.length === 0 ? (
                <p className="text-sm text-[#4a3c58]/60">
                  No hay facturas pendientes por enviar.
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingPreview.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-lg border border-[#e8d5e5]/60 bg-[#fdfcf5] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#4a3c58]">
                          Venta #{invoice.saleNumber}
                        </p>
                        <p className="text-xs text-[#4a3c58]/60">
                          Intentos: {invoice.retryCount}
                        </p>
                      </div>
                      <Badge variant="warning">Pendiente</Badge>
                    </div>
                  ))}
                </div>
              )}

              {pendingInvoices.length > OVERVIEW_PENDING_PREVIEW ? (
                <p className="mt-3 text-xs text-slate-500">
                  +{pendingInvoices.length - OVERVIEW_PENDING_PREVIEW}{" "}
                  pendientes adicionales en la seccion SRI.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado Rapido</CardTitle>
              <CardDescription>Semaforo operativo del sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[#4a3c58]">
              <div className="flex items-center justify-between">
                <span>Inventario</span>
                <Badge variant={lowStockCount > 0 ? "warning" : "success"}>
                  {lowStockCount > 1 ? "Atencion" : "Estable"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Facturacion SRI</span>
                <Badge
                  variant={pendingInvoices.length > 0 ? "warning" : "success"}
                >
                  {pendingInvoices.length > 0 ? "Pendientes" : "Al dia"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Catalogo</span>
                <Badge variant={products.length > 0 ? "success" : "danger"}>
                  {products.length > 0 ? "Con datos" : "Vacio"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
