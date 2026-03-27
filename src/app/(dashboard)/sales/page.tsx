"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { CustomerPickerModal, ProductPickerModal } from "@/shared/dashboard/modals";
import {
  SalesMessagePopover,
  type SalesMessage,
} from "@/modules/sales/components/sales-message-popover";
import { OpenQuotesDialog } from "@/modules/sales/components/open-quotes-dialog";
import { SalesCheckoutSection } from "@/modules/sales/components/sales-checkout-section";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type Customer,
  type LineItem,
  type LinePreviewItem,
  type Product,
  type QuoteDetail,
  type Quote,
} from "@/shared/dashboard/types";
import { matchesScaleBarcodePrefix } from "@/lib/utils";

type CheckoutResponse = {
  saleId: string;
  saleNumber: string;
  document: {
    saleDocumentId: string;
    type: "NONE" | "INVOICE";
    status: "NOT_REQUIRED" | "PENDING" | "ISSUED" | "ERROR" | "VOIDED";
    fullNumber: string | null;
    establishmentCode: string | null;
    emissionPointCode: string | null;
    sequenceNumber: number | null;
    issuedAt: string | null;
  };
  invoice: {
    sriInvoiceId: string;
    status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  } | null;
};

type BusinessCheckoutConfig = {
  taxProfile: {
    issuerId: string | null;
  } | null;
};

function buildInitialCheckoutForm(defaultIssuerId = ""): CheckoutForm {
  return {
    issuerId: defaultIssuerId,
    fechaEmision: format(new Date(), "dd/MM/yyyy"),
    tipoIdentificacion: "04",
    identificacion: "",
    razonSocial: "",
    direccion: "",
    email: "",
    telefono: "",
    formaPago: "01",
  };
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "quote" ? "quote" : "sale";
  const quoteToEditId = searchParams.get("edit");
  const quoteToLoadId = searchParams.get("quote");
  const isQuoteMode = mode === "quote";
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
  const [savingQuote, setSavingQuote] = useState(false);
  const [message, setMessage] = useState<SalesMessage | null>(null);
  const [printableSaleId, setPrintableSaleId] = useState<string | null>(null);
  const [authorizedSriInvoiceId, setAuthorizedSriInvoiceId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [isQuotesModalOpen, setIsQuotesModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [defaultIssuerId, setDefaultIssuerId] = useState("");

  const [checkout, setCheckout] = useState<CheckoutForm>(() => buildInitialCheckoutForm());

  const linePreview = useMemo<LinePreviewItem[]>(() => {
    return lineItems
      .map((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) {
          return null;
        }

        const subtotal = line.cantidad * line.precioUnitario - line.descuento;
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
  const canResetCheckout = useMemo(
    () =>
      lineItems.length > 0 ||
      Boolean(printableSaleId) ||
      Boolean(authorizedSriInvoiceId) ||
      checkout.tipoIdentificacion !== "04" ||
      checkout.formaPago !== "01" ||
      checkout.identificacion.trim() !== "" ||
      checkout.razonSocial.trim() !== "" ||
      checkout.direccion.trim() !== "" ||
      checkout.email.trim() !== "" ||
      checkout.telefono.trim() !== "",
    [lineItems.length, printableSaleId, authorizedSriInvoiceId, checkout],
  );

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.codigo.toLowerCase().includes(term) ||
        (product.codigoBarras ?? "").toLowerCase().includes(term) ||
        matchesScaleBarcodePrefix(
          term,
          product.codigoBarras ?? product.codigo ?? product.sku,
        ) ||
        (product.sku ?? "").toLowerCase().includes(term) ||
        product.nombre.toLowerCase().includes(term) ||
        product.id.toLowerCase().includes(term),
    );
  }, [productSearch, products]);

  async function loadCheckoutData() {
    setLoading(true);

    try {
      const [productsRes, customersRes, businessRes] = await Promise.all([
        fetchJson<Product[]>("/api/v1/products"),
        fetchJson<Customer[]>("/api/v1/customers"),
        fetchJson<BusinessCheckoutConfig>("/api/v1/business"),
      ]);

      const issuerId = businessRes.taxProfile?.issuerId ?? "";
      setProducts(productsRes);
      setCustomers(customersRes);
      setDefaultIssuerId(issuerId);
      setCheckout((current) => ({
        ...current,
        issuerId: current.issuerId || issuerId,
      }));
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar checkout", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckoutData();
    if (isQuoteMode && quoteToEditId) {
      void loadQuoteById(quoteToEditId, true);
    } else if (!isQuoteMode && quoteToLoadId) {
      void loadQuoteById(quoteToLoadId, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyQuoteToForm(quote: QuoteDetail, editing: boolean) {
    setEditingQuoteId(editing ? quote.id : null);
    setAuthorizedSriInvoiceId(null);
    setCheckout({
      issuerId: quote.issuerId,
      fechaEmision: quote.fechaEmision,
      tipoIdentificacion: quote.customer.tipoIdentificacion,
      identificacion: quote.customer.identificacion,
      razonSocial: quote.customer.razonSocial,
      direccion: quote.customer.direccion ?? "",
      email: quote.customer.email ?? "",
      telefono: quote.customer.telefono ?? "",
      formaPago: quote.formaPago,
    });
    setLineItems(
      quote.items.map((item) => ({
        productId: item.productId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
      })),
    );
    setIsQuotesModalOpen(false);
    setMessage({
      text: editing
        ? `Editando cotizacion #${quote.quoteNumber}`
        : `Cotizacion #${quote.quoteNumber} cargada para facturar`,
      tone: "info",
    });
  }

  async function loadQuoteById(quoteId: string, editing: boolean) {
    try {
      const detail = await fetchJson<QuoteDetail>(`/api/v1/quotes/${quoteId}`);
      if (!editing && detail.status !== "OPEN") {
        setMessage({
          text: "Solo se pueden cargar cotizaciones abiertas para facturar.",
          tone: "error",
        });
        return;
      }
      applyQuoteToForm(detail, editing);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : editing
              ? "No se pudo cargar cotizacion para editar"
              : "No se pudo cargar cotizacion para facturar",
        tone: "error",
      });
    }
  }

  async function loadCustomers(search = "") {
    setCustomerLoading(true);

    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const result = await fetchJson<Customer[]>(`/api/v1/customers${query}`);
      setCustomers(result);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar clientes", tone: "error" });
    } finally {
      setCustomerLoading(false);
    }
  }

  useEffect(() => {
    if (!message) return;
    const timeoutId = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timeoutId);
  }, [message]);

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
        if (existingIds.has(productId)) {
          continue;
        }

        const product = products.find((item) => item.id === productId);
        if (!product) {
          continue;
        }

        nextItems.push({ productId, precioUnitario: product.precio, cantidad: 1, descuento: 0 });
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
    setMessage({ text: `Cliente seleccionado: ${customer.razonSocial}`, tone: "success" });
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

  function onResetCheckout() {
    setCheckout(buildInitialCheckoutForm(defaultIssuerId));
    setLineItems([]);
    setSelectedProductIds([]);
    setCustomerSearch("");
    setProductSearch("");
    setIsCustomerPickerOpen(false);
    setIsProductPickerOpen(false);
    setPrintableSaleId(null);
    setAuthorizedSriInvoiceId(null);
    setEditingQuoteId(null);
    setMessage({
      text: isQuoteMode
        ? "Formulario de cotizacion reiniciado correctamente."
        : "Formulario reiniciado correctamente.",
      tone: "info",
    });
  }

  function validateIdentification(tipoIdentificacion: string, identificacion: string): string | null {
    const normalized = identificacion.trim();

    if (tipoIdentificacion === "05" && !/^\d{10}$/.test(normalized)) {
      return "La cedula debe tener exactamente 10 digitos numericos.";
    }

    if (tipoIdentificacion === "04" && !/^\d{13}$/.test(normalized)) {
      return "El RUC debe tener exactamente 13 digitos numericos.";
    }

    return null;
  }

  async function onCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const identificationValidationError = validateIdentification(checkout.tipoIdentificacion, checkout.identificacion);
    if (identificationValidationError) {
      setMessage({ text: identificationValidationError, tone: "error" });
      return;
    }

    setSaving(true);
    setPrintableSaleId(null);
    setAuthorizedSriInvoiceId(null);

    try {
      const result = await fetchJson<CheckoutResponse>("/api/v1/sales/checkout", {
        method: "POST",
        body: JSON.stringify(buildCheckoutPayload()),
      });
      setPrintableSaleId(result.saleId);

      if (result.invoice?.status === "AUTHORIZED") {
        setAuthorizedSriInvoiceId(result.invoice.sriInvoiceId);
        setMessage({
          text: result.document.fullNumber
            ? `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber} autorizada correctamente`
            : `Venta #${result.saleNumber} registrada y factura autorizada correctamente`,
          tone: "success",
        });
      } else {
        setMessage({
          text: result.document.fullNumber
            ? `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber} emitida localmente y pendiente de autorizacion.`
            : `Venta #${result.saleNumber} registrada. La factura aun no se encuentra autorizada.`,
          tone: "info",
        });
      }

      setLineItems([]);
      setSelectedProductIds([]);
      setProductSearch("");
      await loadCheckoutData();
    } catch (error) {
      setPrintableSaleId(null);
      setAuthorizedSriInvoiceId(null);
      setMessage({ text: error instanceof Error ? error.message : "No se pudo registrar la venta", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function buildCheckoutPayload() {
    return {
      issuerId: checkout.issuerId,
      fechaEmision: checkout.fechaEmision,
      moneda: "USD",
      customer: {
        tipoIdentificacion: checkout.tipoIdentificacion,
        identificacion: checkout.identificacion.trim(),
        razonSocial: checkout.razonSocial,
        direccion: checkout.direccion,
        email: checkout.email,
        telefono: checkout.telefono,
      },
      items: linePreview.map((line) => ({
        productId: line.productId,
        productCode: line.product.codigo,
        cantidad: line.cantidad,
        descuento: line.descuento,
        precioUnitario: line.precioUnitario,
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
    };
  }

  async function onSaveQuote() {
    setMessage(null);

    const identificationValidationError = validateIdentification(checkout.tipoIdentificacion, checkout.identificacion);
    if (identificationValidationError) {
      setMessage({ text: identificationValidationError, tone: "error" });
      return;
    }

    if (linePreview.length === 0) {
      setMessage({ text: "Agrega al menos un producto para guardar la cotizacion.", tone: "error" });
      return;
    }

    setSavingQuote(true);
    try {
      const url = editingQuoteId ? `/api/v1/quotes/${editingQuoteId}` : "/api/v1/quotes";
      const method = editingQuoteId ? "PATCH" : "POST";
      
      const quote = await fetchJson<Quote>(url, {
        method,
        body: JSON.stringify(buildCheckoutPayload()),
      });
      setEditingQuoteId(quote.id);
      setMessage({
        text: `Cotizacion #${quote.quoteNumber} ${editingQuoteId ? "actualizada" : "guardada"} correctamente`,
        tone: "success",
      });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo guardar la cotizacion", tone: "error" });
    } finally {
      setSavingQuote(false);
    }
  }

  function onCancelEdit() {
    setEditingQuoteId(null);
    onResetCheckout();
  }

  async function loadOpenQuotes() {
    setQuotesLoading(true);
    try {
      const result = await fetchJson<Quote[]>(`/api/v1/quotes?status=OPEN`);
      setQuotes(result);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "No se pudo cargar cotizaciones abiertas",
        tone: "error",
      });
    } finally {
      setQuotesLoading(false);
    }
  }

  function onOpenQuotesModal() {
    setIsQuotesModalOpen(true);
    void loadOpenQuotes();
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
      {saving ? (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            {isQuoteMode
              ? "Guardando cotizacion..."
              : "Registrando venta y preparando documento..."}
          </div>
        </div>
      ) : null}
      <SalesMessagePopover message={message} onClose={() => setMessage(null)} />
      <SalesCheckoutSection
        mode={mode}
        checkout={checkout}
        setCheckout={setCheckout}
        linePreview={linePreview}
        checkoutSubtotal={checkoutSubtotal}
        checkoutTax={checkoutTax}
        checkoutTotal={checkoutTotal}
        selectedIdentificationType={selectedIdentificationType}
        selectedPaymentMethod={selectedPaymentMethod}
        canPrintPdf={Boolean(printableSaleId)}
        canPrintXml={Boolean(authorizedSriInvoiceId)}
        canPrintQuote={isQuoteMode && Boolean(editingQuoteId)}
        canResetCheckout={canResetCheckout}
        saving={saving}
        savingQuote={savingQuote}
        editingQuoteId={editingQuoteId}
        onPrintPdf={() => {
          if (!printableSaleId) return;
          window.open(`/api/v1/sales/${printableSaleId}/print`, "_blank", "noopener,noreferrer");
        }}
        onPrintXml={() => {
          if (!authorizedSriInvoiceId) return;
          window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/xml`, "_blank", "noopener,noreferrer");
        }}
        onPrintQuote={() => {
          if (!editingQuoteId) return;
          window.open(`/api/v1/quotes/${editingQuoteId}/pdf`, "_blank", "noopener,noreferrer");
        }}
        onCancelEdit={onCancelEdit}
        onOpenQuotesModal={onOpenQuotesModal}
        onResetCheckout={onResetCheckout}
        onSubmit={(e) => {
          if (isQuoteMode) {
            e.preventDefault();
            void onSaveQuote();
            return;
          }
          void onCheckout(e);
        }}
        onOpenCustomerPicker={openCustomerPicker}
        onOpenProductPicker={openProductPicker}
        incrementLineQuantity={incrementLineQuantity}
        updateLineByProduct={updateLineByProduct}
        removeLine={removeLine}
      />

      <OpenQuotesDialog
        isOpen={isQuotesModalOpen}
        loading={quotesLoading}
        saving={saving}
        quotes={quotes}
        onClose={() => setIsQuotesModalOpen(false)}
        onLoadQuote={(quoteId) => {
          void loadQuoteById(quoteId, false);
        }}
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
