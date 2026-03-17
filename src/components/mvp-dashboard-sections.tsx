import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
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
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type IdentificationTypeOption,
  type LineItem,
  type LinePreviewItem,
  type PaymentMethodOption,
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

export function OverviewSection({ products, lowStockCount, pendingInvoices, checkoutTotal, stock }: OverviewSectionProps) {
  const [alertsQuery, setAlertsQuery] = useState("");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const lowStockItems = useMemo(
    () =>
      stock
        .filter((item) => item.lowStock)
        .sort((a, b) => (b.minQuantity - b.quantity) - (a.minQuantity - a.quantity)),
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
      <div className="flex items-center gap-4 mb-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden p-1 border border-[#e8d5e5]/30">
          <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
        </div>
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
                  {filteredAlerts.length} alerta{filteredAlerts.length !== 1 ? "s" : ""} encontrada{filteredAlerts.length !== 1 ? "s" : ""}
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
            <div className="max-h-[430px] overflow-auto">
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
                        {alertsQuery ? "Sin coincidencias para tu busqueda." : "Sin alertas de stock."}
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
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAllAlerts((prev) => !prev)}>
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
                {pendingInvoices.length} comprobante{pendingInvoices.length !== 1 ? "s" : ""} en cola
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPreview.length === 0 ? (
                <p className="text-sm text-[#4a3c58]/60">No hay facturas pendientes por enviar.</p>
              ) : (
                <div className="space-y-2">
                  {pendingPreview.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-[#e8d5e5]/60 bg-[#fdfcf5] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-[#4a3c58]">Venta #{invoice.saleNumber}</p>
                        <p className="text-xs text-[#4a3c58]/60">Intentos: {invoice.retryCount}</p>
                      </div>
                      <Badge variant="warning">Pendiente</Badge>
                    </div>
                  ))}
                </div>
              )}

              {pendingInvoices.length > OVERVIEW_PENDING_PREVIEW ? (
                <p className="mt-3 text-xs text-slate-500">
                  +{pendingInvoices.length - OVERVIEW_PENDING_PREVIEW} pendientes adicionales en la seccion SRI.
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
                <Badge variant={pendingInvoices.length > 0 ? "warning" : "success"}>
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

type ProductsSectionProps = {
  products: Product[];
  onOpenProductModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

const PRODUCTS_PAGE_SIZE = 10;

export function ProductsSection({ products, onOpenProductModal, onEditProduct, onDeleteProduct }: ProductsSectionProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q),
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PRODUCTS_PAGE_SIZE, safePage * PRODUCTS_PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Gestion de Productos</CardTitle>
              <CardDescription>Incluye secuencial automatico y datos para checkout.</CardDescription>
            </div>
            <Button type="button" onClick={onOpenProductModal}>
              Nuevo producto
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Catalogo de Productos</CardTitle>
              <CardDescription>
                {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                {search ? " encontrado" + (filtered.length !== 1 ? "s" : "") : " en total"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b1a1c6]" />
              <Input
                placeholder="Buscar por nombre, SKU o codigo..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>Codigo</Th>
                  <Th>Nombre</Th>
                  <Th>Precio</Th>
                  <Th>IVA</Th>
                  <Th>Stock</Th>
                  <Th>Acciones</Th>
                </Tr>
              </THead>
              <TBody>
                {paginated.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} className="text-center text-slate-500">
                      {search ? "Sin resultados para \"" + search + "\"." : "Sin productos aun."}
                    </Td>
                  </Tr>
                ) : (
                  paginated.map((product) => (
                    <Tr key={product.id}>
                      <Td className="font-medium">{product.codigo}</Td>
                      <Td>{product.nombre}</Td>
                      <Td>${product.precio.toFixed(2)}</Td>
                      <Td>{product.tarifaIva}%</Td>
                      <Td>{product.stock.toFixed(3)}</Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onEditProduct(product)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteProduct(product)}
                            title="Desactivar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-[#4a3c58]">
              <span>
                Pagina {safePage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type InventorySectionProps = {
  stock: StockItem[];
  onOpenStockModal: () => void;
};

export function InventorySection({ stock, onOpenStockModal }: InventorySectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Ajuste de Stock</CardTitle>
              <CardDescription>Entradas, salidas y ajustes manuales con trazabilidad.</CardDescription>
            </div>
            <Button type="button" variant="secondary" onClick={onOpenStockModal}>
              Ajustar stock
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Actual</CardTitle>
          <CardDescription>Control de inventario en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>Codigo</Th>
                  <Th>Producto</Th>
                  <Th>Stock</Th>
                  <Th>Minimo</Th>
                  <Th>Estado</Th>
                </Tr>
              </THead>
              <TBody>
                {stock.map((row) => (
                  <Tr key={row.productId}>
                    <Td className="font-medium">{row.codigo}</Td>
                    <Td>{row.productName}</Td>
                    <Td>{row.quantity.toFixed(3)}</Td>
                    <Td>{row.minQuantity.toFixed(3)}</Td>
                    <Td>{row.lowStock ? <Badge variant="warning">Stock bajo</Badge> : <Badge variant="success">OK</Badge>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type CheckoutSectionProps = {
  checkout: CheckoutForm;
  setCheckout: Dispatch<SetStateAction<CheckoutForm>>;
  linePreview: LinePreviewItem[];
  checkoutSubtotal: number;
  checkoutTax: number;
  checkoutTotal: number;
  selectedIdentificationType?: IdentificationTypeOption;
  selectedPaymentMethod?: PaymentMethodOption;
  canPrintDocuments: boolean;
  canResetCheckout: boolean;
  saving: boolean;
  savingQuote: boolean;
  editingQuoteId: string | null;
  onPrintRide: () => void;
  onPrintXml: () => void;
  onSaveQuote: () => void;
  onCancelEdit: () => void;
  onOpenQuotesModal: () => void;
  onResetCheckout: () => void;
  onCheckout: (e: FormEvent<HTMLFormElement>) => void;
  onOpenCustomerPicker: () => void;
  onOpenProductPicker: () => void;
  incrementLineQuantity: (productId: string, delta: number) => void;
  updateLineByProduct: (productId: string, patch: Partial<LineItem>) => void;
  removeLine: (productId: string) => void;
};

export function CheckoutSection({
  checkout,
  setCheckout,
  linePreview,
  checkoutSubtotal,
  checkoutTax,
  checkoutTotal,
  selectedIdentificationType,
  selectedPaymentMethod,
  canPrintDocuments,
  canResetCheckout,
  saving,
  savingQuote,
  editingQuoteId,
  onPrintRide,
  onPrintXml,
  onSaveQuote,
  onCancelEdit,
  onOpenQuotesModal,
  onResetCheckout,
  onCheckout,
  onOpenCustomerPicker,
  onOpenProductPicker,
  incrementLineQuantity,
  updateLineByProduct,
  removeLine,
}: CheckoutSectionProps) {
  const hasCustomerSelected = Boolean(checkout.identificacion.trim() && checkout.razonSocial.trim());

  return (
    <Card className="border-[#e8d5e5]/60">
      <CardHeader>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden p-1 border border-[#e8d5e5]/30">
            <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
          </div>
          <div>
            <CardTitle className="text-[#4a3c58]">Facturar Venta</CardTitle>
            <CardDescription>Registrar la venta, validar cliente y emitir factura en un solo paso.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]" onSubmit={onCheckout}>
          <div className="space-y-4">
            <section className="rounded-xl border border-[#e8d5e5] bg-[#fdfcf5]/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">1. Documento</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <Label htmlFor="fecha">Fecha emision</Label>
                  <Input
                    id="fecha"
                    value={checkout.fechaEmision}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, fechaEmision: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipoId">Tipo identificacion</Label>
                  <select
                    id="tipoId"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={checkout.tipoIdentificacion}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, tipoIdentificacion: e.target.value }))}
                  >
                    {IDENTIFICATION_TYPES.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.label} ({type.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[#4a3c58]/50">
                    Codigo enviado: {selectedIdentificationType?.code ?? checkout.tipoIdentificacion}
                  </p>
                </div>
                <div>
                  <Label htmlFor="formaPago">Forma pago</Label>
                  <select
                    id="formaPago"
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                    value={checkout.formaPago}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, formaPago: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.code} value={method.code}>
                        {method.label} ({method.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Codigo enviado: {selectedPaymentMethod?.code ?? checkout.formaPago}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#e8d5e5]/50 bg-[#fdfcf5]/50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">2. Cliente</p>
                  <p className="text-sm text-[#4a3c58]/70">Puedes buscar uno existente o capturar uno nuevo.</p>
                </div>
                <Button type="button" variant="outline" onClick={onOpenCustomerPicker}>
                  Buscar cliente
                </Button>
              </div>

              {hasCustomerSelected ? (
                <div className="mt-3 rounded-md border-[#e8d5e5] bg-[#b1a1c6]/10 px-3 py-2 text-sm text-[#4a3c58]">
                  Cliente activo: <span className="font-semibold">{checkout.razonSocial}</span> ({checkout.identificacion})
                </div>
              ) : (
                <p className="mt-3 rounded-md border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aun no has seleccionado cliente.
                </p>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="identificacion">Identificacion</Label>
                  <Input
                    id="identificacion"
                    value={checkout.identificacion}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, identificacion: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="razon">Razon social</Label>
                  <Input
                    id="razon"
                    value={checkout.razonSocial}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, razonSocial: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <Label htmlFor="direccion">Direccion</Label>
                  <Input
                    id="direccion"
                    value={checkout.direccion}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, direccion: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={checkout.email} onChange={(e) => setCheckout((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={checkout.telefono}
                    onChange={(e) => setCheckout((prev) => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-[#e8d5e5]/50 bg-[#fdfcf5]/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">3. Detalle</p>
                  <p className="text-sm text-[#4a3c58]/70">Selecciona productos y ajusta cantidades/descuentos.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onOpenProductPicker}>
                  Seleccionar productos
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Codigo</Th>
                      <Th>Producto</Th>
                      <Th>Precio</Th>
                      <Th>Cantidad</Th>
                      <Th>Descuento</Th>
                      <Th>Total</Th>
                      <Th>Accion</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {linePreview.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} className="text-[#4a3c58]/60">
                          Aun no hay productos en el detalle. Usa el boton Seleccionar productos.
                        </Td>
                      </Tr>
                    ) : (
                      linePreview.map((line) => (
                        <Tr key={line.productId} className="hover:bg-[#fdfcf5] transition-colors">
                          <Td className="font-medium">{line.product.codigo}</Td>
                          <Td>{line.product.nombre}</Td>
                          <Td className="w-28">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.precioUnitario}
                              onChange={(e) => updateLineByProduct(line.productId, { precioUnitario: Number(e.target.value) || 0.01 })}
                              className="h-8 border-[#e8d5e5]/50 bg-white/80 focus:bg-white transition-all text-right px-2"
                              required
                            />
                          </Td>
                          <Td className="w-44">
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="outline" size="sm" onClick={() => incrementLineQuantity(line.productId, -1)}>
                                -
                              </Button>
                              <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={line.cantidad}
                                onChange={(e) => updateLineByProduct(line.productId, { cantidad: Number(e.target.value) || 0.001 })}
                                className="h-9 w-20 text-center"
                                required
                              />
                              <Button type="button" variant="outline" size="sm" onClick={() => incrementLineQuantity(line.productId, 1)}>
                                +
                              </Button>
                            </div>
                          </Td>
                          <Td className="w-28">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.descuento}
                              onChange={(e) => updateLineByProduct(line.productId, { descuento: Number(e.target.value) || 0 })}
                              className="h-8 border-[#e8d5e5]/50 bg-white/80 focus:bg-white transition-all text-right px-2"
                            />
                          </Td>
                          <Td className="font-semibold">${line.total.toFixed(2)}</Td>
                          <Td>
                            <Button type="button" variant="secondary" onClick={() => removeLine(line.productId)}>
                              Quitar
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
            <div className="rounded-xl border-[#e8d5e5] bg-[#b1a1c6]/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4a3c58]">Resumen en tiempo real</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-[#4a3c58]">
                  <span>Subtotal</span>
                  <span>${checkoutSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a3c58]">
                  <span>IVA</span>
                  <span>${checkoutTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#e8d5e5] pt-2 text-base font-semibold text-[#4a3c58]">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>${checkoutTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#e8d5e5]/50 bg-[#fdfcf5]/80 p-4 text-sm text-[#4a3c58]/80">
              <p className="font-semibold text-[#4a3c58]">Datos de emision</p>
              <p className="mt-2">Items: {linePreview.length}</p>
              <p>Identificacion: {selectedIdentificationType?.label ?? "N/A"}</p>
              <p>Pago: {selectedPaymentMethod?.label ?? "N/A"}</p>
            </div>

            <Button disabled={saving || linePreview.length === 0} type="submit" size="lg" className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Registrar Venta
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onSaveQuote}
              disabled={saving || savingQuote || linePreview.length === 0}
            >
              {savingQuote ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingQuoteId ? "Actualizando cotizacion..." : "Guardando cotizacion..."}
                </>
              ) : editingQuoteId ? (
                "Actualizar cotizacion"
              ) : (
                "Guardar cotizacion"
              )}
            </Button>
            {editingQuoteId ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onCancelEdit}
                disabled={saving || savingQuote}
              >
                Cancelar edicion
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onOpenQuotesModal}
              disabled={saving || savingQuote}
            >
              Ver cotizaciones
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={onResetCheckout}
              disabled={saving || savingQuote || !canResetCheckout}
            >
              <RefreshCcw className="h-4 w-4" />
              Resetear todo
            </Button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button className="w-full" type="button" variant="outline" disabled={!canPrintDocuments} onClick={onPrintRide}>
                  Descargar PDF
                </Button>
                <Button className="w-full" type="button" variant="outline" disabled={!canPrintDocuments} onClick={onPrintXml}>
                  Descargar XML
                </Button>
              </div>
              {!canPrintDocuments ? (
                <p className="text-xs text-[#4a3c58]/50">Se habilitan cuando la factura este autorizada.</p>
              ) : null}
            </div>
          </aside>
        </form>
      </CardContent>
    </Card>
  );
}

const SRI_STATUS_LABELS: Record<string, string> = {
  NOT_AUTHORIZED: "No autorizadas",
  ALL: "Todas",
  DRAFT: "Borrador",
  AUTHORIZED: "Autorizadas",
  PENDING_SRI: "Pendiente SRI",
  ERROR: "Con error",
};

function sriBadgeVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "AUTHORIZED") return "success";
  if (status === "ERROR") return "danger";
  if (status === "PENDING_SRI") return "warning";
  return "default";
}

type SriSectionProps = {
  loading: boolean;
  invoices: SriInvoice[];
  pagination: PaginationMeta;
  statusFilter: string;
  saving: boolean;
  onRetry: (invoiceId: string) => void;
  onViewDetails: (invoiceId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (value: string) => void;
};

export function SriSection({
  loading,
  invoices,
  pagination,
  statusFilter,
  saving,
  onRetry,
  onViewDetails,
  onPageChange,
  onFilterChange,
}: SriSectionProps) {
  const canRetry = (invoice: SriInvoice) =>
    (invoice.status === "PENDING_SRI" || invoice.status === "ERROR") && invoice.saleStatus !== "CANCELLED";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden p-1 border border-[#e8d5e5]/30">
              <Image src="/logo.png" alt="Logo DOVI VELAS" width={48} height={48} className="object-contain" priority unoptimized />
            </div>
            <div>
              <CardTitle className="text-[#4a3c58]">Facturas SRI</CardTitle>
              <CardDescription>
                {SRI_STATUS_LABELS[statusFilter] ?? statusFilter} &mdash; pagina {pagination.page} de {pagination.totalPages || 1}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border border-[#e8d5e5] bg-[#fdfcf5] px-3 text-sm text-[#4a3c58] focus:outline-none focus:ring-2 focus:ring-[#b1a1c6] transition-all"
              value={statusFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              disabled={loading}
            >
              <option value="NOT_AUTHORIZED">No autorizadas</option>
              <option value="ALL">Todas</option>
              <option value="DRAFT">Borrador</option>
              <option value="PENDING_SRI">Pendiente SRI</option>
              <option value="AUTHORIZED">Autorizadas</option>
              <option value="ERROR">Con error</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-[#4a3c58]/70">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No hay facturas para este filtro.</p>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-2 rounded-lg border border-[#e8d5e5]/60 bg-[#fdfcf5]/50 p-3 md:flex-row md:items-center md:justify-between hover:bg-[#fdfcf5] transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#4a3c58]">Venta #{invoice.saleNumber}</p>
                    <p className="text-xs text-[#4a3c58]/60">
                      Intentos: {invoice.retryCount}
                      {invoice.saleStatus === "CANCELLED" ? " · Venta anulada" : ""}
                    </p>
                    {invoice.lastError ? <p className="text-xs text-rose-600 font-medium">{invoice.lastError}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sriBadgeVariant(invoice.status)}>{SRI_STATUS_LABELS[invoice.status] ?? invoice.status}</Badge>
                    {canRetry(invoice) && (
                      <Button size="sm" variant="outline" onClick={() => onRetry(invoice.id)} disabled={saving}>
                        <RefreshCcw className="h-4 w-4" /> Reintentar
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onViewDetails(invoice.id)}>
                      <Eye className="h-4 w-4" /> Ver
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
