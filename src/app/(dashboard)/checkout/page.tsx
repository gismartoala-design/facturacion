"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { CustomerPickerModal, ProductPickerModal } from "@/components/mvp-dashboard-modals";
import { CheckoutSection } from "@/components/mvp-dashboard-sections";
import { Button } from "@/components/ui/button";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type Customer,
  type LineItem,
  type LinePreviewItem,
  type Product,
} from "@/components/mvp-dashboard-types";

type CheckoutResponse = {
  saleNumber: string;
  invoice: {
    sriInvoiceId: string;
    status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  } | null;
};

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [authorizedSriInvoiceId, setAuthorizedSriInvoiceId] = useState<string | null>(null);

  const [checkout, setCheckout] = useState<CheckoutForm>({
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

  const linePreview = useMemo<LinePreviewItem[]>(() => {
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
      .filter((line): line is LinePreviewItem => Boolean(line));
  }, [lineItems, products]);

  const checkoutTotal = useMemo(() => linePreview.reduce((acc, line) => acc + line.total, 0), [linePreview]);
  const checkoutSubtotal = useMemo(() => linePreview.reduce((acc, line) => acc + line.subtotal, 0), [linePreview]);
  const checkoutTax = useMemo(() => linePreview.reduce((acc, line) => acc + line.iva, 0), [linePreview]);

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

  async function loadCheckoutData() {
    setLoading(true);

    try {
      const [productsRes, customersRes] = await Promise.all([
        fetchJson<Product[]>("/api/v1/products"),
        fetchJson<Customer[]>("/api/v1/customers"),
      ]);

      setProducts(productsRes);
      setCustomers(customersRes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar checkout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckoutData();
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

  function openCustomerPicker() {
    setCustomerSearch("");
    setIsCustomerPickerOpen(true);
    void loadCustomers("");
  }

  function openProductPicker() {
    setSelectedProductIds([]);
    setProductSearch("");
    setIsProductPickerOpen(true);
  }

  function closeCustomerPicker() {
    setIsCustomerPickerOpen(false);
    setCustomerSearch("");
  }

  function cancelProductPicker() {
    setSelectedProductIds([]);
    setProductSearch("");
    setIsProductPickerOpen(false);
  }

  async function onCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setAuthorizedSriInvoiceId(null);

    try {
      const result = await fetchJson<CheckoutResponse>("/api/v1/sales/checkout", {
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

      if (result.invoice?.status === "AUTHORIZED") {
        setAuthorizedSriInvoiceId(result.invoice.sriInvoiceId);
        setMessage(`Venta #${result.saleNumber} registrada y factura autorizada correctamente`);
      } else {
        setMessage(`Venta #${result.saleNumber} registrada. La factura aun no se encuentra autorizada.`);
      }

      setLineItems([]);
      setSelectedProductIds([]);
      setProductSearch("");
      await loadCheckoutData();
    } catch (error) {
      setAuthorizedSriInvoiceId(null);
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la venta");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando checkout...
      </div>
    );
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {authorizedSriInvoiceId ? (
        <div className="mb-4 mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/ride`, "_blank", "noopener,noreferrer")}
          >
            Descargar PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/xml`, "_blank", "noopener,noreferrer")}
          >
            Descargar XML
          </Button>
        </div>
      ) : null}
      <CheckoutSection
        checkout={checkout}
        setCheckout={setCheckout}
        linePreview={linePreview}
        checkoutSubtotal={checkoutSubtotal}
        checkoutTax={checkoutTax}
        checkoutTotal={checkoutTotal}
        selectedIdentificationType={selectedIdentificationType}
        selectedPaymentMethod={selectedPaymentMethod}
        saving={saving}
        onCheckout={onCheckout}
        onOpenCustomerPicker={openCustomerPicker}
        onOpenProductPicker={openProductPicker}
        incrementLineQuantity={incrementLineQuantity}
        updateLineByProduct={updateLineByProduct}
        removeLine={removeLine}
      />

      <CustomerPickerModal
        isOpen={isCustomerPickerOpen}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        customerLoading={customerLoading}
        customers={customers}
        onSelectCustomer={selectCustomer}
        onClose={closeCustomerPicker}
      />

      <ProductPickerModal
        isOpen={isProductPickerOpen}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        filteredProducts={filteredProducts}
        selectedProductIds={selectedProductIds}
        toggleProductSelection={toggleProductSelection}
        onCancel={cancelProductPicker}
        onConfirm={addSelectedProductsToDetail}
      />
    </>
  );
}
