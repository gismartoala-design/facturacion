import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

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

export function OverviewSection({ products, lowStockCount, pendingInvoices, checkoutTotal, stock }: OverviewSectionProps) {
  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Inventario</CardTitle>
          <CardDescription>Productos que ya requieren reposicion.</CardDescription>
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
                </Tr>
              </THead>
              <TBody>
                {stock.filter((item) => item.lowStock).length === 0 ? (
                  <Tr>
                    <Td colSpan={4} className="text-slate-500">
                      Sin alertas de stock.
                    </Td>
                  </Tr>
                ) : (
                  stock
                    .filter((item) => item.lowStock)
                    .map((row) => (
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
        </CardContent>
      </Card>
    </div>
  );
}

type ProductsSectionProps = {
  products: Product[];
  onOpenProductModal: () => void;
};

export function ProductsSection({ products, onOpenProductModal }: ProductsSectionProps) {
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
          <CardTitle>Catalogo de Productos</CardTitle>
          <CardDescription>Listado operativo para seleccionar rapidamente en checkout.</CardDescription>
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
                </Tr>
              </THead>
              <TBody>
                {products.map((product) => (
                  <Tr key={product.id}>
                    <Td className="font-medium">{product.codigo}</Td>
                    <Td>{product.nombre}</Td>
                    <Td>${product.precio.toFixed(2)}</Td>
                    <Td>{product.tarifaIva}%</Td>
                    <Td>{product.stock.toFixed(3)}</Td>
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
  saving: boolean;
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
  saving,
  onCheckout,
  onOpenCustomerPicker,
  onOpenProductPicker,
  incrementLineQuantity,
  updateLineByProduct,
  removeLine,
}: CheckoutSectionProps) {
  const hasCustomerSelected = Boolean(checkout.identificacion.trim() && checkout.razonSocial.trim());

  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle>Checkout (Venta + SRI)</CardTitle>
        <CardDescription>Flujo rapido para registrar la venta, validar cliente y emitir factura en un solo paso.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]" onSubmit={onCheckout}>
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Documento</p>
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
                  <p className="mt-1 text-xs text-slate-500">
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

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Cliente</p>
                  <p className="text-sm text-slate-600">Puedes buscar uno existente o capturar uno nuevo.</p>
                </div>
                <Button type="button" variant="outline" onClick={onOpenCustomerPicker}>
                  Buscar cliente
                </Button>
              </div>

              {hasCustomerSelected ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Cliente activo: <span className="font-semibold">{checkout.razonSocial}</span> ({checkout.identificacion})
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3. Detalle</p>
                  <p className="text-sm text-slate-600">Selecciona productos y ajusta cantidades/descuentos.</p>
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
                        <Td colSpan={7} className="text-slate-500">
                          Aun no hay productos en el detalle. Usa el boton Seleccionar productos.
                        </Td>
                      </Tr>
                    ) : (
                      linePreview.map((line) => (
                        <Tr key={line.productId} className="hover:bg-slate-50">
                          <Td className="font-medium">{line.product.codigo}</Td>
                          <Td>{line.product.nombre}</Td>
                          <Td>${line.product.precio.toFixed(2)}</Td>
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
                          <Td className="w-36">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.descuento}
                              onChange={(e) => updateLineByProduct(line.productId, { descuento: Number(e.target.value) || 0 })}
                              className="h-9"
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
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Resumen en tiempo real</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span>${checkoutSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>IVA</span>
                  <span>${checkoutTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-emerald-200 pt-2 text-base font-semibold text-emerald-900">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span>${checkoutTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Datos de emision</p>
              <p className="mt-2">Items: {linePreview.length}</p>
              <p>Identificacion: {selectedIdentificationType?.label ?? "N/A"}</p>
              <p>Pago: {selectedPaymentMethod?.label ?? "N/A"}</p>
            </div>

            <Button disabled={saving || linePreview.length === 0} type="submit" size="lg" className="w-full">
              <ShoppingCart className="h-4 w-4" />
              Confirmar checkout
            </Button>
          </aside>
        </form>
      </CardContent>
    </Card>
  );
}

type SriSectionProps = {
  loading: boolean;
  pendingInvoices: SriInvoice[];
  pagination: PaginationMeta;
  saving: boolean;
  onRetry: (invoiceId: string) => void;
  onViewDetails: (invoiceId: string) => void;
  onPageChange: (page: number) => void;
};

export function SriSection({
  loading,
  pendingInvoices,
  pagination,
  saving,
  onRetry,
  onViewDetails,
  onPageChange,
}: SriSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Pendientes SRI</CardTitle>
            <CardDescription>Facturas con error de autorizacion para reintentar.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              Pagina {pagination.page} de {pagination.totalPages || 1}
            </span>
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
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : (
          <div className="space-y-2">
            {pendingInvoices.length === 0 ? (
              <p className="text-sm text-slate-500">No hay pendientes por ahora.</p>
            ) : (
              pendingInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Venta #{invoice.saleNumber}</p>
                    <p className="text-xs text-slate-500">Intentos: {invoice.retryCount}</p>
                    {invoice.lastError ? <p className="text-xs text-red-600">{invoice.lastError}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{invoice.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => onRetry(invoice.id)} disabled={saving}>
                      <RefreshCcw className="h-4 w-4" /> Reintentar
                    </Button>
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
