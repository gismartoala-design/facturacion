"use client";

import { format } from "date-fns";
import {
  Boxes,
  ClipboardList,
  Loader2,
  PackageSearch,
  RefreshCcw,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tarifaIva: number;
  stock: number;
  minStock: number;
};

type StockItem = {
  productId: string;
  productName: string;
  codigo: string;
  quantity: number;
  minQuantity: number;
  lowStock: boolean;
};

type Customer = {
  id: string;
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  purchaseCount: number;
  lastPurchaseAt?: string | null;
};

type SriInvoice = {
  id: string;
  saleNumber: string;
  status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  retryCount: number;
  lastError?: string | null;
};

type LineItem = {
  productId: string;
  cantidad: number;
  descuento: number;
};

type SectionKey = "overview" | "products" | "inventory" | "checkout" | "sri";

const IDENTIFICATION_TYPES = [
  { code: "04", label: "RUC" },
  { code: "05", label: "Cedula" },
  { code: "06", label: "Pasaporte" },
  { code: "07", label: "Consumidor final" },
  { code: "08", label: "Identificacion del exterior" },
];

const PAYMENT_METHODS = [
  { code: "01", label: "Sin utilizacion del sistema financiero" },
  { code: "16", label: "Tarjeta de debito" },
  { code: "19", label: "Tarjeta de credito" },
  { code: "20", label: "Otros con utilizacion del sistema financiero" },
  { code: "15", label: "Compensacion de deudas" },
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: { message: string };
  };

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error?.message || "Error de API");
  }

  return payload.data;
}

export function MvpDashboard() {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [newProduct, setNewProduct] = useState({
    nombre: "",
    sku: "",
    precio: "",
    tarifaIva: "15",
    stockInicial: "0",
    minStock: "0",
  });

  const [adjustment, setAdjustment] = useState({
    productId: "",
    movementType: "IN",
    quantity: "0",
  });

  const [checkout, setCheckout] = useState({
    issuerId: "5fc1d44c-9a58-4383-b475-2c3adb49afc9",
    fechaEmision: format(new Date(), "dd/MM/yyyy"),
    tipoIdentificacion: "04",
    identificacion: "",
    razonSocial: "",
    direccion: "",
    email: "",
    telefono: "",
    formaPago: "01",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const linePreview = useMemo(() => {
    return lineItems
      .map((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) {
          return null;
        }

        const subtotal = line.cantidad * product.precio - line.descuento;
        const iva = (subtotal * product.tarifaIva) / 100;
        return {
          ...line,
          product,
          subtotal,
          iva,
          total: subtotal + iva,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      cantidad: number;
      descuento: number;
      product: Product;
      subtotal: number;
      iva: number;
      total: number;
    }>;
  }, [lineItems, products]);

  const checkoutTotal = useMemo(() => {
    return linePreview.reduce((acc, line) => acc + line.total, 0);
  }, [linePreview]);
  const checkoutSubtotal = useMemo(() => {
    return linePreview.reduce((acc, line) => acc + line.subtotal, 0);
  }, [linePreview]);
  const checkoutTax = useMemo(() => {
    return linePreview.reduce((acc, line) => acc + line.iva, 0);
  }, [linePreview]);

  const lowStockCount = useMemo(() => stock.filter((item) => item.lowStock).length, [stock]);
  const selectedIdentificationType = useMemo(
    () => IDENTIFICATION_TYPES.find((type) => type.code === checkout.tipoIdentificacion),
    [checkout.tipoIdentificacion],
  );
  const selectedPaymentMethod = useMemo(
    () => PAYMENT_METHODS.find((method) => method.code === checkout.formaPago),
    [checkout.formaPago],
  );
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.codigo.toLowerCase().includes(term) ||
        product.nombre.toLowerCase().includes(term) ||
        product.id.toLowerCase().includes(term),
    );
  }, [productSearch, products]);

  const sectionConfig: Array<{ key: SectionKey; label: string; hint: string; icon: typeof Boxes }> = [
    { key: "overview", label: "Resumen", hint: "Vista operativa", icon: Boxes },
    { key: "products", label: "Productos", hint: "Catalogo", icon: ClipboardList },
    { key: "inventory", label: "Inventario", hint: "Stock y ajustes", icon: PackageSearch },
    { key: "checkout", label: "Checkout", hint: "Venta + SRI", icon: ShoppingCart },
    { key: "sri", label: "Facturacion SRI", hint: "Reintentos", icon: WalletCards },
  ];

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, customersRes, stockRes, pendingRes] = await Promise.all([
        fetchJson<Product[]>("/api/v1/products"),
        fetchJson<Customer[]>("/api/v1/customers"),
        fetchJson<StockItem[]>("/api/v1/stock"),
        fetchJson<SriInvoice[]>("/api/v1/sri-invoices?status=PENDING_SRI"),
      ]);
      setProducts(productsRes);
      setCustomers(customersRes);
      setStock(stockRes);
      setPendingInvoices(pendingRes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function loadCustomers(search = "") {
    setCustomerLoading(true);
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const result = await fetchJson<Customer[]>(`/api/v1/customers${query}`);
      setCustomers(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar clientes");
    } finally {
      setCustomerLoading(false);
    }
  }

  useEffect(() => {
    if (!isCustomerPickerOpen) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadCustomers(customerSearch);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [customerSearch, isCustomerPickerOpen]);

  async function onCreateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          nombre: newProduct.nombre,
          sku: newProduct.sku || undefined,
          precio: Number(newProduct.precio),
          tarifaIva: Number(newProduct.tarifaIva),
          stockInicial: Number(newProduct.stockInicial),
          minStock: Number(newProduct.minStock),
        }),
      });
      setNewProduct({ nombre: "", sku: "", precio: "", tarifaIva: "15", stockInicial: "0", minStock: "0" });
      setIsProductModalOpen(false);
      setMessage("Producto creado correctamente");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear producto");
    } finally {
      setSaving(false);
    }
  }

  async function onAdjustStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson("/api/v1/stock/adjustments", {
        method: "POST",
        body: JSON.stringify({
          productId: adjustment.productId,
          movementType: adjustment.movementType,
          quantity: Number(adjustment.quantity),
        }),
      });
      setIsStockModalOpen(false);
      setMessage("Stock actualizado");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ajustar stock");
    } finally {
      setSaving(false);
    }
  }

  async function onCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson("/api/v1/sales/checkout", {
        method: "POST",
        body: JSON.stringify({
          issuerId: checkout.issuerId,
          fechaEmision: checkout.fechaEmision,
          moneda: "USD",
          customer: {
            tipoIdentificacion: checkout.tipoIdentificacion,
            identificacion: checkout.identificacion,
            razonSocial: checkout.razonSocial,
            direccion: checkout.direccion,
            email: checkout.email,
            telefono: checkout.telefono,
          },
          items: linePreview.map((line) => ({
            productId: line.productId,
            cantidad: line.cantidad,
            descuento: line.descuento,
            precioUnitario: line.product.precio,
            tarifaIva: line.product.tarifaIva,
          })),
          payments: [
            {
              formaPago: checkout.formaPago,
              total: Number(checkoutTotal.toFixed(2)),
              plazo: 0,
              unidadTiempo: "DIAS",
            },
          ],
          infoAdicional: {},
        }),
      });
      setMessage("Venta registrada y proceso SRI ejecutado");
      setLineItems([]);
      setSelectedProductIds([]);
      setProductSearch("");
      setActiveSection("sri");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  async function onRetry(invoiceId: string) {
    setSaving(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/sri-invoices/${invoiceId}/retry`, { method: "POST" });
      setMessage("Reintento ejecutado");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reintentar");
    } finally {
      setSaving(false);
    }
  }

  function updateLineByProduct(productId: string, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, ...patch } : item)));
  }

  function incrementLineQuantity(productId: string, delta: number) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        const next = Number((item.cantidad + delta).toFixed(3));
        return { ...item, cantidad: next < 0.001 ? 0.001 : next };
      }),
    );
  }

  function removeLine(productId: string) {
    setLineItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  function addSelectedProductsToDetail() {
    if (selectedProductIds.length === 0) {
      setIsProductPickerOpen(false);
      return;
    }

    setLineItems((prev) => {
      const existingIds = new Set(prev.map((item) => item.productId));
      const nextItems = [...prev];

      for (const productId of selectedProductIds) {
        if (!existingIds.has(productId)) {
          nextItems.push({ productId, cantidad: 1, descuento: 0 });
        }
      }

      return nextItems;
    });

    setSelectedProductIds([]);
    setProductSearch("");
    setIsProductPickerOpen(false);
  }

  function selectCustomer(customer: Customer) {
    setCheckout((prev) => ({
      ...prev,
      tipoIdentificacion: customer.tipoIdentificacion,
      identificacion: customer.identificacion,
      razonSocial: customer.razonSocial,
      direccion: customer.direccion ?? "",
      email: customer.email ?? "",
      telefono: customer.telefono ?? "",
    }));
    setIsCustomerPickerOpen(false);
    setCustomerSearch("");
    setMessage(`Cliente seleccionado: ${customer.razonSocial}`);
  }

  function renderOverview() {
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

  function renderProducts() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Gestion de Productos</CardTitle>
                <CardDescription>Incluye secuencial automatico y datos para checkout.</CardDescription>
              </div>
              <Button type="button" onClick={() => setIsProductModalOpen(true)}>
                Nuevo producto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Usa el boton <span className="font-semibold text-slate-800">Nuevo producto</span> para abrir el formulario
              en modal.
            </p>
          </CardContent>
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

  function renderInventory() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Ajuste de Stock</CardTitle>
                <CardDescription>Entradas, salidas y ajustes manuales con trazabilidad.</CardDescription>
              </div>
              <Button type="button" variant="secondary" onClick={() => setIsStockModalOpen(true)}>
                Ajustar stock
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Usa el boton <span className="font-semibold text-slate-800">Ajustar stock</span> para abrir el formulario
              en modal.
            </p>
          </CardContent>
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
                      <Td>
                        {row.lowStock ? <Badge variant="warning">Stock bajo</Badge> : <Badge variant="success">OK</Badge>}
                      </Td>
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

  function renderCheckout() {
    const hasCustomerSelected = Boolean(checkout.identificacion.trim() && checkout.razonSocial.trim());

    return (
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle>Checkout (Venta + SRI)</CardTitle>
          <CardDescription>
            Flujo rapido para registrar la venta, validar cliente y emitir factura en un solo paso.
          </CardDescription>
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
                    <p className="mt-1 text-xs text-slate-500">
                      Codigo enviado: {selectedPaymentMethod?.code ?? checkout.formaPago}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Cliente</p>
                    <p className="text-sm text-slate-600">Puedes buscar uno existente o capturar uno nuevo.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCustomerSearch("");
                      setIsCustomerPickerOpen(true);
                      void loadCustomers("");
                    }}
                  >
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
                    <Input
                      id="email"
                      value={checkout.email}
                      onChange={(e) => setCheckout((prev) => ({ ...prev, email: e.target.value }))}
                    />
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProductIds([]);
                      setProductSearch("");
                      setIsProductPickerOpen(true);
                    }}
                  >
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => incrementLineQuantity(line.productId, -1)}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={line.cantidad}
                                  onChange={(e) =>
                                    updateLineByProduct(line.productId, { cantidad: Number(e.target.value) || 0.001 })
                                  }
                                  className="h-9 w-20 text-center"
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => incrementLineQuantity(line.productId, 1)}
                                >
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
                                onChange={(e) =>
                                  updateLineByProduct(line.productId, { descuento: Number(e.target.value) || 0 })
                                }
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

  function renderSri() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pendientes SRI</CardTitle>
          <CardDescription>Facturas con error de autorizacion para reintentar.</CardDescription>
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

  function renderActiveSection() {
    if (activeSection === "overview") return renderOverview();
    if (activeSection === "products") return renderProducts();
    if (activeSection === "inventory") return renderInventory();
    if (activeSection === "checkout") return renderCheckout();
    return renderSri();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfeff,_#f8fafc_45%,_#f1f5f9)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">ARGSOFT MVP</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Inventario, Ventas y Facturacion SRI</h1>
          <p className="mt-2 text-sm text-slate-600">
            Opciones separadas por modulo para operar Productos, Inventario, Checkout y Facturacion SRI.
          </p>
          {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-8 lg:h-fit">
            {sectionConfig.map((section) => {
              const Icon = section.icon;
              const active = section.key === activeSection;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <p className="text-sm font-semibold">{section.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{section.hint}</p>
                </button>
              );
            })}
          </aside>

          <section className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {sectionConfig.map((section) => (
                <Button
                  key={`mobile-${section.key}`}
                  variant={activeSection === section.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(section.key)}
                  className="whitespace-nowrap"
                >
                  {section.label}
                </Button>
              ))}
            </div>

            {renderActiveSection()}
          </section>
        </div>
      </div>

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo Producto</h3>
              <p className="mt-1 text-sm text-slate-600">Completa la informacion base para inventario y ventas.</p>
            </div>
            <form className="grid gap-3 p-5" onSubmit={onCreateProduct}>
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
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Guardar producto
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isStockModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Ajuste de Stock</h3>
              <p className="mt-1 text-sm text-slate-600">Registra entrada, salida o ajuste puntual de inventario.</p>
            </div>
            <form className="grid gap-3 p-5" onSubmit={onAdjustStock}>
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
                    onChange={(e) => setAdjustment((prev) => ({ ...prev, movementType: e.target.value }))}
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
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button disabled={saving} type="submit" variant="secondary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Aplicar ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCustomerPickerOpen ? (
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
                            <Button type="button" size="sm" onClick={() => selectCustomer(customer)}>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCustomerPickerOpen(false);
                  setCustomerSearch("");
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isProductPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Seleccionar productos</h3>
              <p className="mt-1 text-sm text-slate-600">
                Busca, marca los productos y agregalos al detalle de la venta.
              </p>
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
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProductSelection(product.id)}
                              />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedProductIds([]);
                    setProductSearch("");
                    setIsProductPickerOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={addSelectedProductsToDetail}>
                  Agregar al detalle
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
