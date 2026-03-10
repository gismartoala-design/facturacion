import { Loader2 } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import type {
  Customer,
  NewProductForm,
  Product,
  SriInvoiceDetail,
  StockAdjustmentForm,
} from "@/components/mvp-dashboard-types";

type ProductModalProps = {
  isOpen: boolean;
  newProduct: NewProductForm;
  setNewProduct: Dispatch<SetStateAction<NewProductForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ProductModal({ isOpen, newProduct, setNewProduct, saving, onClose, onSubmit }: ProductModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Nuevo Producto</h3>
          <p className="mt-1 text-sm text-slate-600">Completa la informacion base para inventario y ventas.</p>
        </div>
        <form className="grid gap-3 p-5" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="modal-nombre">Nombre</Label>
            <Input
              id="modal-nombre"
              value={newProduct.nombre}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modal-sku">SKU (opcional)</Label>
              <Input
                id="modal-sku"
                value={newProduct.sku}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="modal-precio">Precio</Label>
              <Input
                id="modal-precio"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.precio}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, precio: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="modal-iva">IVA %</Label>
              <Input
                id="modal-iva"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.tarifaIva}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, tarifaIva: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="modal-stock-inicial">Stock inicial</Label>
              <Input
                id="modal-stock-inicial"
                type="number"
                min="0"
                step="0.001"
                value={newProduct.stockInicial}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, stockInicial: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="modal-min-stock">Stock minimo</Label>
              <Input
                id="modal-min-stock"
                type="number"
                min="0"
                step="0.001"
                value={newProduct.minStock}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, minStock: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type StockAdjustmentModalProps = {
  isOpen: boolean;
  products: Product[];
  adjustment: StockAdjustmentForm;
  setAdjustment: Dispatch<SetStateAction<StockAdjustmentForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function StockAdjustmentModal({
  isOpen,
  products,
  adjustment,
  setAdjustment,
  saving,
  onClose,
  onSubmit,
}: StockAdjustmentModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Ajuste de Stock</h3>
          <p className="mt-1 text-sm text-slate-600">Registra entrada, salida o ajuste puntual de inventario.</p>
        </div>
        <form className="grid gap-3 p-5" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="modal-stock-product">Producto</Label>
            <select
              id="modal-stock-product"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              value={adjustment.productId}
              onChange={(e) => setAdjustment((prev) => ({ ...prev, productId: e.target.value }))}
              required
            >
              <option value="">Selecciona producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.codigo} - {product.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="modal-stock-movement">Tipo</Label>
              <select
                id="modal-stock-movement"
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                value={adjustment.movementType}
                onChange={(e) =>
                  setAdjustment((prev) => ({ ...prev, movementType: e.target.value as StockAdjustmentForm["movementType"] }))
                }
              >
                <option value="IN">Entrada</option>
                <option value="OUT">Salida</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </div>
            <div>
              <Label htmlFor="modal-stock-qty">Cantidad</Label>
              <Input
                id="modal-stock-qty"
                type="number"
                min="0"
                step="0.001"
                value={adjustment.quantity}
                onChange={(e) => setAdjustment((prev) => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                </>
              ) : (
                "Guardar Movimiento"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CustomerPickerModalProps = {
  isOpen: boolean;
  customerSearch: string;
  setCustomerSearch: Dispatch<SetStateAction<string>>;
  customerLoading: boolean;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onClose: () => void;
};

export function CustomerPickerModal({
  isOpen,
  customerSearch,
  setCustomerSearch,
  customerLoading,
  customers,
  onSelectCustomer,
  onClose,
}: CustomerPickerModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Buscar cliente</h3>
          <p className="mt-1 text-sm text-slate-600">
            Selecciona un cliente que ya compró antes o que fue registrado en ventas anteriores.
          </p>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <Label htmlFor="customer-search">Buscar por identificacion, nombre, email o telefono</Label>
            <Input
              id="customer-search"
              placeholder="Ej: 0950..., GISMAR, cliente@correo.com"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-slate-200">
            <Table>
              <THead>
                <Tr>
                  <Th>Tipo</Th>
                  <Th>Identificacion</Th>
                  <Th>Razon social</Th>
                  <Th>Email</Th>
                  <Th>Telefono</Th>
                  <Th>Compras</Th>
                  <Th>Accion</Th>
                </Tr>
              </THead>
              <TBody>
                {customerLoading ? (
                  <Tr>
                    <Td colSpan={7} className="text-slate-500">
                      Cargando clientes...
                    </Td>
                  </Tr>
                ) : customers.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} className="text-slate-500">
                      No se encontraron clientes con ese criterio.
                    </Td>
                  </Tr>
                ) : (
                  customers.map((customer) => (
                    <Tr key={customer.id}>
                      <Td>{customer.tipoIdentificacion}</Td>
                      <Td className="font-medium">{customer.identificacion}</Td>
                      <Td>{customer.razonSocial}</Td>
                      <Td>{customer.email || "-"}</Td>
                      <Td>{customer.telefono || "-"}</Td>
                      <Td>{customer.purchaseCount}</Td>
                      <Td>
                        <Button type="button" size="sm" onClick={() => onSelectCustomer(customer)}>
                          Seleccionar
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

type ProductPickerModalProps = {
  isOpen: boolean;
  productSearch: string;
  setProductSearch: Dispatch<SetStateAction<string>>;
  filteredProducts: Product[];
  selectedProductIds: string[];
  toggleProductSelection: (productId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProductPickerModal({
  isOpen,
  productSearch,
  setProductSearch,
  filteredProducts,
  selectedProductIds,
  toggleProductSelection,
  onCancel,
  onConfirm,
}: ProductPickerModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Seleccionar productos</h3>
          <p className="mt-1 text-sm text-slate-600">Busca, marca los productos y agregalos al detalle de la venta.</p>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <Label htmlFor="picker-search">Buscar producto</Label>
            <Input
              id="picker-search"
              placeholder="Busca por codigo o nombre"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-slate-200">
            <Table>
              <THead>
                <Tr>
                  <Th>Sel.</Th>
                  <Th>Codigo</Th>
                  <Th>Producto</Th>
                  <Th>Precio</Th>
                  <Th>Stock</Th>
                </Tr>
              </THead>
              <TBody>
                {filteredProducts.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} className="text-slate-500">
                      No hay coincidencias con tu busqueda.
                    </Td>
                  </Tr>
                ) : (
                  filteredProducts.map((product) => {
                    const checked = selectedProductIds.includes(product.id);
                    return (
                      <Tr key={product.id}>
                        <Td>
                          <input type="checkbox" checked={checked} onChange={() => toggleProductSelection(product.id)} />
                        </Td>
                        <Td className="font-medium">{product.codigo}</Td>
                        <Td>{product.nombre}</Td>
                        <Td>${product.precio.toFixed(2)}</Td>
                        <Td>{product.stock.toFixed(3)}</Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </Table>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 p-5">
          <p className="text-sm text-slate-600">Seleccionados: {selectedProductIds.length}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={onConfirm}>
              Agregar al detalle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type InvoiceDetailModalProps = {
  isOpen: boolean;
  invoice: SriInvoiceDetail | null;
  onClose: () => void;
};

export function InvoiceDetailModal({ isOpen, invoice, onClose }: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Detalle Factura SRI</h3>
            <p className="text-sm text-slate-500">Venta #{invoice.saleNumber}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-medium text-slate-800">Estado SRI</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado:</span>
                  <span className="font-semibold">{invoice.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Intentos:</span>
                  <span>{invoice.retryCount}</span>
                </div>
                {invoice.authorizationNumber && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">No. Autorizacion:</span>
                    <span className="break-all font-mono text-xs">{invoice.authorizationNumber}</span>
                  </div>
                )}
                {invoice.claveAcceso && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">Clave Acceso:</span>
                    <span className="break-all font-mono text-xs">{invoice.claveAcceso}</span>
                  </div>
                )}
                {invoice.lastError && (
                  <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                    <strong>Error:</strong> {invoice.lastError}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-slate-100 bg-white p-4">
              <h4 className="font-medium text-slate-800">Cliente</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Razon Social:</span>
                  <span className="font-semibold">{invoice.sale.customer.razonSocial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Identificacion:</span>
                  <span>{invoice.sale.customer.identificacion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span>{invoice.sale.customer.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Direccion:</span>
                  <span className="text-right">{invoice.sale.customer.direccion || "-"}</span>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6">
            <h4 className="mb-3 font-medium text-slate-800">Items de la Venta</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <THead>
                  <Tr>
                    <Th>Codigo</Th>
                    <Th>Producto</Th>
                    <Th>Cant</Th>
                    <Th>Precio Unit</Th>
                    <Th>Total</Th>
                  </Tr>
                </THead>
                <TBody>
                  {invoice.sale.items.map((item) => (
                    <Tr key={item.id}>
                      <Td className="font-medium">{item.product.codigo}</Td>
                      <Td>{item.product.nombre}</Td>
                      <Td>{Number(item.cantidad).toFixed(3)}</Td>
                      <Td>${Number(item.precioUnitario).toFixed(2)}</Td>
                      <Td className="font-semibold">${Number(item.total).toFixed(2)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </section>

          <section className="mt-6 flex flex-col items-end gap-2 text-sm">
            <div className="flex w-full max-w-xs justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">Subtotal:</span>
              <span>${Number(invoice.sale.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">IVA:</span>
              <span>${Number(invoice.sale.taxTotal).toFixed(2)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between py-1 text-base font-bold text-emerald-700">
              <span>Total:</span>
              <span>${Number(invoice.sale.total).toFixed(2)}</span>
            </div>
          </section>

          {invoice.documents && (
            <section className="mt-6 rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 font-medium text-slate-800">Archivos Generados</h4>
              <div className="flex gap-4 text-sm">
                {invoice.documents.xmlAuthorizedPath ? (
                  <a
                    href={`/api/v1/sri-invoices/${invoice.id}/xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Descargar XML
                  </a>
                ) : (
                  <span className="text-slate-400">XML no disponible</span>
                )}
                {invoice.documents.ridePdfPath ? (
                  <a
                    href={`/api/v1/sri-invoices/${invoice.id}/ride`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Descargar RIDE (PDF)
                  </a>
                ) : (
                  <span className="text-slate-400">RIDE no disponible</span>
                )}
              </div>
            </section>
          )}
        </div>
        
        <div className="border-t border-slate-100 p-4 text-right">
           <Button onClick={onClose}>Cerrar Detalle</Button>
        </div>
      </div>
    </div>
  );
}
