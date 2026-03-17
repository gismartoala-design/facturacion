"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { CustomerPickerModal, ProductPickerModal } from "@/components/mvp-dashboard-modals";
import { CheckoutSection } from "@/components/mvp-dashboard-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type Customer,
  type LineItem,
  type LinePreviewItem,
  type Product,
  type QuoteDetail,
  type QuoteStatus,
  type Quote,
} from "@/components/mvp-dashboard-types";

type CheckoutResponse = {
  saleNumber: string;
  invoice: {
    sriInvoiceId: string;
    status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  } | null;
};

type QuoteFilter = "ALL" | QuoteStatus;

function buildInitialCheckoutForm(): CheckoutForm {
  return {
    issuerId: "5fc1d44c-9a58-4383-b475-2c3adb49afc9",
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

type MessageTone = "success" | "error" | "info";

type CheckoutMessage = {
  text: string;
  tone: MessageTone;
};

function quoteBadgeVariant(status: QuoteStatus): "default" | "success" | "warning" | "danger" {
  if (status === "OPEN") return "warning";
  if (status === "CONVERTED") return "success";
  return "danger";
}

function CheckoutMessagePopover({
  message,
  onClose,
}: {
  message: CheckoutMessage | null;
  onClose: () => void;
}) {
  if (!message) return null;

  const toneStyles: Record<MessageTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };

  const ToneIcon = message.tone === "success"
    ? CheckCircle2
    : message.tone === "error"
      ? AlertTriangle
      : Info;

  return (
    <div className="fixed right-4 top-4 z-[60] w-full max-w-sm">
      <div className={`rounded-xl border p-3 shadow-lg ${toneStyles[message.tone]}`} role="alert" aria-live="polite">
        <div className="flex items-start gap-2">
          <ToneIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1 text-sm font-medium">{message.text}</p>
          <button type="button" aria-label="Cerrar mensaje" onClick={onClose} className="rounded p-0.5 hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const searchParams = useSearchParams();
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
  const [message, setMessage] = useState<CheckoutMessage | null>(null);
  const [authorizedSriInvoiceId, setAuthorizedSriInvoiceId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesFilter, setQuotesFilter] = useState<QuoteFilter>("ALL");
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesSaving, setQuotesSaving] = useState(false);
  const [isQuotesModalOpen, setIsQuotesModalOpen] = useState(false);
  const [isQuoteDetailOpen, setIsQuoteDetailOpen] = useState(false);
  const [quoteDetailLoading, setQuoteDetailLoading] = useState(false);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<QuoteDetail | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const [checkout, setCheckout] = useState<CheckoutForm>(buildInitialCheckoutForm);

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
      Boolean(authorizedSriInvoiceId) ||
      checkout.tipoIdentificacion !== "04" ||
      checkout.formaPago !== "01" ||
      checkout.identificacion.trim() !== "" ||
      checkout.razonSocial.trim() !== "" ||
      checkout.direccion.trim() !== "" ||
      checkout.email.trim() !== "" ||
      checkout.telefono.trim() !== "",
    [lineItems.length, authorizedSriInvoiceId, checkout],
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
      setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar checkout", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCheckoutData();

    const editId = searchParams.get("edit");
    if (editId) {
      void (async () => {
        try {
          const detail = await fetchJson<QuoteDetail>(`/api/v1/quotes/${editId}`);
          onEditQuote(detail);
        } catch (error) {
          setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar cotizacion para editar", tone: "error" });
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setCheckout(buildInitialCheckoutForm());
    setLineItems([]);
    setSelectedProductIds([]);
    setCustomerSearch("");
    setProductSearch("");
    setIsCustomerPickerOpen(false);
    setIsProductPickerOpen(false);
    setAuthorizedSriInvoiceId(null);
    setEditingQuoteId(null);
    setMessage({ text: "Formulario reiniciado correctamente.", tone: "info" });
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
    setAuthorizedSriInvoiceId(null);

    try {
      const result = await fetchJson<CheckoutResponse>("/api/v1/sales/checkout", {
        method: "POST",
        body: JSON.stringify(buildCheckoutPayload()),
      });

      if (result.invoice?.status === "AUTHORIZED") {
        setAuthorizedSriInvoiceId(result.invoice.sriInvoiceId);
        setMessage({ text: `Venta #${result.saleNumber} registrada y factura autorizada correctamente`, tone: "success" });
      } else {
        setMessage({ text: `Venta #${result.saleNumber} registrada. La factura aun no se encuentra autorizada.`, tone: "info" });
      }

      setLineItems([]);
      setSelectedProductIds([]);
      setProductSearch("");
      await loadCheckoutData();
    } catch (error) {
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
      setMessage({ text: `Cotizacion #${quote.quoteNumber} ${editingQuoteId ? "actualizada" : "guardada"} correctamente`, tone: "success" });
      if (editingQuoteId) {
        setEditingQuoteId(null);
        setLineItems([]);
        setCheckout(buildInitialCheckoutForm());
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo guardar la cotizacion", tone: "error" });
    } finally {
      setSavingQuote(false);
    }
  }

  function onEditQuote(quote: QuoteDetail) {
    setEditingQuoteId(quote.id);
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
    setLineItems(quote.items.map(item => ({
      productId: item.productId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento,
    })));
    setIsQuotesModalOpen(false);
    setIsQuoteDetailOpen(false);
    setMessage({ text: `Editando cotizacion #${quote.quoteNumber}`, tone: "info" });
  }

  function onCancelEdit() {
    setEditingQuoteId(null);
    onResetCheckout();
  }

  async function loadQuotes(filter: QuoteFilter = quotesFilter) {
    setQuotesLoading(true);
    try {
      const query = filter === "ALL" ? "" : `?status=${filter}`;
      const result = await fetchJson<Quote[]>(`/api/v1/quotes${query}`);
      setQuotes(result);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar cotizaciones", tone: "error" });
    } finally {
      setQuotesLoading(false);
    }
  }

  function onOpenQuotesModal() {
    setIsQuotesModalOpen(true);
    void loadQuotes(quotesFilter);
  }

  async function onViewQuoteDetail(quoteId: string) {
    setIsQuoteDetailOpen(true);
    setQuoteDetailLoading(true);
    setSelectedQuoteDetail(null);
    try {
      const detail = await fetchJson<QuoteDetail>(`/api/v1/quotes/${quoteId}`);
      setSelectedQuoteDetail(detail);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo cargar detalle de cotizacion", tone: "error" });
      setIsQuoteDetailOpen(false);
    } finally {
      setQuoteDetailLoading(false);
    }
  }

  async function onConvertQuote(quoteId: string) {
    if (!window.confirm("Se convertira la cotizacion a venta/factura. ¿Deseas continuar?")) return;

    setQuotesSaving(true);
    setMessage(null);
    try {
      await fetchJson(`/api/v1/quotes/${quoteId}/convert`, { method: "POST" });
      setMessage({ text: "Cotizacion convertida a venta correctamente", tone: "success" });
      setIsQuoteDetailOpen(false);
      await loadQuotes(quotesFilter);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo convertir la cotizacion", tone: "error" });
    } finally {
      setQuotesSaving(false);
    }
  }

  async function onCancelQuote(quoteId: string) {
    if (!window.confirm("Se anulara la cotizacion. ¿Deseas continuar?")) return;

    setQuotesSaving(true);
    setMessage(null);
    try {
      await fetchJson(`/api/v1/quotes/${quoteId}/cancel`, { method: "POST" });
      setMessage({ text: "Cotizacion anulada correctamente", tone: "info" });
      setIsQuoteDetailOpen(false);
      await loadQuotes(quotesFilter);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "No se pudo anular la cotizacion", tone: "error" });
    } finally {
      setQuotesSaving(false);
    }
  }

  const printableQuoteInvoiceId =
    selectedQuoteDetail?.convertedInvoice?.externalInvoiceId ??
    selectedQuoteDetail?.convertedInvoice?.sriInvoiceId ??
    null;
  const canPrintQuotePdf = selectedQuoteDetail?.status === "OPEN";
  const canPrintConvertedQuote =
    selectedQuoteDetail?.status === "CONVERTED" &&
    selectedQuoteDetail?.convertedInvoice?.status === "AUTHORIZED" &&
    Boolean(printableQuoteInvoiceId);

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            Registrando venta y procesando factura...
          </div>
        </div>
      ) : null}
      <CheckoutMessagePopover message={message} onClose={() => setMessage(null)} />
      <CheckoutSection
        checkout={checkout}
        setCheckout={setCheckout}
        linePreview={linePreview}
        checkoutSubtotal={checkoutSubtotal}
        checkoutTax={checkoutTax}
        checkoutTotal={checkoutTotal}
        selectedIdentificationType={selectedIdentificationType}
        selectedPaymentMethod={selectedPaymentMethod}
        canPrintDocuments={Boolean(authorizedSriInvoiceId)}
        canResetCheckout={canResetCheckout}
        saving={saving}
        savingQuote={savingQuote}
        editingQuoteId={editingQuoteId}
        onPrintRide={() => {
          if (!authorizedSriInvoiceId) return;
          window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/ride`, "_blank", "noopener,noreferrer");
        }}
        onPrintXml={() => {
          if (!authorizedSriInvoiceId) return;
          window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/xml`, "_blank", "noopener,noreferrer");
        }}
        onSaveQuote={() => { void onSaveQuote(); }}
        onCancelEdit={onCancelEdit}
        onOpenQuotesModal={onOpenQuotesModal}
        onResetCheckout={onResetCheckout}
        onCheckout={onCheckout}
        onOpenCustomerPicker={openCustomerPicker}
        onOpenProductPicker={openProductPicker}
        incrementLineQuantity={incrementLineQuantity}
        updateLineByProduct={updateLineByProduct}
        removeLine={removeLine}
      />

      {isQuotesModalOpen ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/35 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Cotizaciones / Proformas</h3>
                <p className="text-sm text-slate-500">Consulta, convierte y anula desde la opcion de venta.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setIsQuotesModalOpen(false)}>
                Cerrar
              </Button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={quotesFilter}
                  onChange={(e) => {
                    const next = e.target.value as QuoteFilter;
                    setQuotesFilter(next);
                    void loadQuotes(next);
                  }}
                  disabled={quotesLoading || quotesSaving}
                >
                  <option value="ALL">Todas</option>
                  <option value="OPEN">Abiertas</option>
                  <option value="CONVERTED">Convertidas</option>
                  <option value="CANCELLED">Anuladas</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { void loadQuotes(quotesFilter); }}
                  disabled={quotesLoading || quotesSaving}
                >
                  Actualizar
                </Button>
              </div>

              {quotesLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando cotizaciones...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>No.</Th>
                        <Th>Cliente</Th>
                        <Th>Fecha</Th>
                        <Th>Total</Th>
                        <Th>Estado</Th>
                        <Th>Acciones</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {quotes.length === 0 ? (
                        <Tr>
                          <Td colSpan={6} className="text-center text-slate-500">No hay cotizaciones para este filtro.</Td>
                        </Tr>
                      ) : (
                        quotes.map((quote) => (
                          <Tr key={quote.id}>
                            <Td className="font-medium">#{quote.quoteNumber}</Td>
                            <Td>{quote.customerName}</Td>
                            <Td>{quote.fechaEmision}</Td>
                            <Td>${quote.total.toFixed(2)}</Td>
                            <Td><Badge variant={quoteBadgeVariant(quote.status)}>{quote.status}</Badge></Td>
                            <Td>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => { void onViewQuoteDetail(quote.id); }}
                                  disabled={quotesSaving}
                                >
                                  Ver detalle
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { void onConvertQuote(quote.id); }}
                                  disabled={quotesSaving || quote.status !== "OPEN"}
                                >
                                  Convertir
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => { void onCancelQuote(quote.id); }}
                                  disabled={quotesSaving || quote.status !== "OPEN"}
                                >
                                  Anular
                                </Button>
                              </div>
                            </Td>
                          </Tr>
                        ))
                      )}
                    </TBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isQuoteDetailOpen ? (
        <div className="fixed inset-0 z-[66] flex items-center justify-center bg-slate-950/35 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Detalle Cotizacion</h3>
                {selectedQuoteDetail ? <p className="text-sm text-slate-500">Cotizacion #{selectedQuoteDetail.quoteNumber}</p> : null}
              </div>
              <Button type="button" variant="outline" onClick={() => setIsQuoteDetailOpen(false)}>Cerrar</Button>
            </div>
            <div className="overflow-y-auto p-6">
              {quoteDetailLoading || !selectedQuoteDetail ? (
                <div className="flex min-h-[220px] items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando detalle...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                      <p><span className="text-slate-500">Cliente:</span> {selectedQuoteDetail.customer.razonSocial}</p>
                      <p><span className="text-slate-500">Identificacion:</span> {selectedQuoteDetail.customer.identificacion}</p>
                      <p><span className="text-slate-500">Fecha:</span> {selectedQuoteDetail.fechaEmision}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-white p-4 text-sm">
                      <p>
                        <span className="text-slate-500">Estado:</span>{" "}
                        <Badge variant={quoteBadgeVariant(selectedQuoteDetail.status)}>{selectedQuoteDetail.status}</Badge>
                      </p>
                      <p className="mt-2"><span className="text-slate-500">Forma pago:</span> {selectedQuoteDetail.formaPago}</p>
                      <p><span className="text-slate-500">Moneda:</span> {selectedQuoteDetail.moneda}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <THead>
                        <Tr>
                          <Th>Codigo</Th>
                          <Th>Producto</Th>
                          <Th>Cantidad</Th>
                          <Th>Precio</Th>
                          <Th>Total</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {selectedQuoteDetail.items.map((item) => (
                          <Tr key={item.id}>
                            <Td className="font-medium">{item.productCode}</Td>
                            <Td>{item.productName}</Td>
                            <Td>{item.cantidad.toFixed(3)}</Td>
                            <Td>${item.precioUnitario.toFixed(2)}</Td>
                            <Td>${item.total.toFixed(2)}</Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-sm">
                    <div className="flex w-full max-w-xs justify-between"><span className="text-slate-500">Subtotal:</span><span>${selectedQuoteDetail.subtotal.toFixed(2)}</span></div>
                    <div className="flex w-full max-w-xs justify-between"><span className="text-slate-500">IVA:</span><span>${selectedQuoteDetail.taxTotal.toFixed(2)}</span></div>
                    <div className="flex w-full max-w-xs justify-between font-semibold text-emerald-700"><span>Total:</span><span>${selectedQuoteDetail.total.toFixed(2)}</span></div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">
                    <h4 className="mb-2 font-medium text-slate-800">Impresion de documentos</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="default"
                        disabled={selectedQuoteDetail.status !== "OPEN" || quotesSaving}
                        onClick={() => {
                          if (!selectedQuoteDetail) return;
                          onEditQuote(selectedQuoteDetail);
                        }}
                      >
                        Editar cotizacion
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canPrintQuotePdf}
                        onClick={() => {
                          if (!selectedQuoteDetail) return;
                          window.open(`/api/v1/quotes/${selectedQuoteDetail.id}/pdf`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Descargar PDF cotizacion
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canPrintConvertedQuote}
                        onClick={() => {
                          if (!printableQuoteInvoiceId) return;
                          window.open(`/api/v1/sri-invoices/${printableQuoteInvoiceId}/ride`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Descargar Ride
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canPrintConvertedQuote}
                        onClick={() => {
                          if (!printableQuoteInvoiceId) return;
                          window.open(`/api/v1/sri-invoices/${printableQuoteInvoiceId}/xml`, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Descargar XML
                      </Button>
                    </div>
                    {!canPrintQuotePdf ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Disponible solo en cotizaciones OPEN.
                      </p>
                    ) : null}
                    {!canPrintConvertedQuote ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Solo disponible en cotizaciones convertidas con factura autorizada.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
