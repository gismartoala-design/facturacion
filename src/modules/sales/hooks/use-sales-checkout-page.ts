"use client";

import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  extractScaleBarcodeWeight,
  findBestScaleBarcodeMatch,
  matchesScaleBarcodePrefix,
  resolveScaleBarcodeReference,
} from "@/lib/utils";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type Customer,
  type LineItem,
  type LinePreviewItem,
  type Product,
  type Quote,
  type QuoteDetail,
} from "@/shared/dashboard/types";
import { fetchJson } from "@/shared/dashboard/api";
import type { SalesMessage } from "@/modules/sales/components/sales-message-popover";

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
  receivable: {
    id: string;
    pendingAmount: number;
    dueAt: string | null;
    status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  } | null;
};

type BusinessCheckoutConfig = {
  taxProfile: {
    issuerId: string | null;
  } | null;
  posRuntime?: {
    operationalRules?: {
      trackInventoryOnSale?: boolean;
    };
  } | null;
};

const WALK_IN_CUSTOMER = {
  tipoIdentificacion: "07",
  identificacion: "9999999999999",
  razonSocial: "Consumidor final",
  direccion: "",
  email: "",
  telefono: "",
};

function buildInitialCheckoutForm(
  defaultIssuerId = "",
  options?: { isQuoteMode?: boolean },
): CheckoutForm {
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
    paymentAmount: "",
    paymentTermDays: "30",
  };
}

function validateIdentification(
  tipoIdentificacion: string,
  identificacion: string,
): string | null {
  const normalized = identificacion.trim();

  if (tipoIdentificacion === "05" && !/^\d{10}$/.test(normalized)) {
    return "La cedula debe tener exactamente 10 digitos numericos.";
  }

  if (tipoIdentificacion === "04" && !/^\d{13}$/.test(normalized)) {
    return "El RUC debe tener exactamente 13 digitos numericos.";
  }

  return null;
}

function sanitizeDecimalInput(value: string, fractionDigits: number) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return "";
  }

  const [integerPartRaw = "", ...fractionParts] = normalized.split(".");
  const integerPart = integerPartRaw || "0";
  const fractionPart = fractionParts.join("").slice(0, fractionDigits);
  const hasDecimal = normalized.includes(".");

  if (!hasDecimal) {
    return integerPart;
  }

  return `${integerPart}.${fractionPart}`;
}

function parseDecimalInput(value: string, fallback = 0) {
  const normalized = sanitizeDecimalInput(value, 6);
  if (!normalized || normalized === ".") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDecimalInput(
  value: number,
  fractionDigits: number,
  trimTrailingZeros = false,
) {
  const fixed = value.toFixed(fractionDigits);
  if (!trimTrailingZeros) {
    return fixed;
  }

  return fixed.replace(/\.?0+$/, "");
}

export function useSalesCheckoutPage() {
  const searchParams = useSearchParams();
  const mode: "sale" | "quote" =
    searchParams.get("mode") === "quote" ? "quote" : "sale";
  const quoteToEditId = searchParams.get("edit");
  const quoteToLoadId = searchParams.get("quote");
  const isQuoteMode = mode === "quote";
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
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
  const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("1");
  const [manualProduct, setManualProduct] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState<CheckoutForm>(() =>
    buildInitialCheckoutForm("", { isQuoteMode }),
  );

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

  const checkoutTotal = useMemo(
    () => linePreview.reduce((acc, line) => acc + line.total, 0),
    [linePreview],
  );
  const checkoutSubtotal = useMemo(
    () => linePreview.reduce((acc, line) => acc + line.subtotal, 0),
    [linePreview],
  );
  const checkoutTax = useMemo(
    () => linePreview.reduce((acc, line) => acc + line.iva, 0),
    [linePreview],
  );

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
    [authorizedSriInvoiceId, checkout, isQuoteMode, lineItems.length, printableSaleId],
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
      const [productsRes, businessRes] = await Promise.all([
        fetchJson<Product[]>("/api/v1/products"),
        fetchJson<BusinessCheckoutConfig>("/api/v1/business"),
      ]);

      const issuerId = businessRes.taxProfile?.issuerId ?? "";
      setProducts(productsRes);
      setCustomers([]);
      setDefaultIssuerId(issuerId);
      setInventoryTrackingEnabled(
        Boolean(businessRes.posRuntime?.operationalRules?.trackInventoryOnSale),
      );
      setCheckout((current) => ({
        ...current,
        issuerId: current.issuerId || issuerId,
      }));
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo cargar checkout",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

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
      paymentAmount: "",
      paymentTermDays: "30",
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
    const normalized = search.trim();
    if (normalized.length < 2) {
      setCustomers([]);
      setCustomerLoading(false);
      return [];
    }

    setCustomerLoading(true);

    try {
      const query = `?search=${encodeURIComponent(normalized)}`;
      const result = await fetchJson<Customer[]>(`/api/v1/customers${query}`);
      setCustomers(result);
      return result;
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo cargar clientes",
        tone: "error",
      });
      return [];
    } finally {
      setCustomerLoading(false);
    }
  }

  function updateLineByProduct(productId: string, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, ...patch } : item,
      ),
    );
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

  function resolveProductByCode(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;

    return (
      products.find((product) => product.codigo.toLowerCase() === normalized) ??
      products.find(
        (product) => (product.codigoBarras ?? "").toLowerCase() === normalized,
      ) ??
      findBestScaleBarcodeMatch(products, normalized) ??
      products.find(
        (product) => (product.sku ?? "").toLowerCase() === normalized,
      ) ??
      products.find((product) => product.nombre.toLowerCase() === normalized) ??
      products.find(
        (product) =>
          product.codigo.toLowerCase().includes(normalized) ||
          (product.codigoBarras ?? "").toLowerCase().includes(normalized) ||
          (product.sku ?? "").toLowerCase().includes(normalized) ||
          product.nombre.toLowerCase().includes(normalized),
      ) ??
      null
    );
  }

  function addProduct(product: Product, quantity = 1) {
    if (
      inventoryTrackingEnabled &&
      product.tipoProducto === "BIEN" &&
      product.stock <= 0
    ) {
      setMessage({
        tone: "error",
        text: `${product.nombre} no tiene stock disponible`,
      });
      return false;
    }

    setLineItems((prev) => {
      const current = prev.find((item) => item.productId === product.id);
      if (current) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                cantidad: Number((item.cantidad + quantity).toFixed(3)),
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          cantidad: quantity,
          precioUnitario: product.precio,
          descuento: 0,
        },
      ];
    });

    return true;
  }

  function handleAddByCode() {
    const product = resolveProductByCode(barcodeQuery);
    const scaleBarcodeReference = product
      ? resolveScaleBarcodeReference(product, barcodeQuery)
      : null;
    const embeddedWeight = product
      ? extractScaleBarcodeWeight(barcodeQuery, scaleBarcodeReference)
      : null;
    const quantity =
      embeddedWeight ?? parseDecimalInput(entryQuantity || "1", 1);

    if (!product) {
      setMessage({
        tone: "error",
        text: "No se encontro producto con ese codigo o descripcion",
      });
      return;
    }

    if (quantity <= 0) {
      setMessage({ tone: "error", text: "La cantidad debe ser mayor a cero" });
      return;
    }

    const added = addProduct(product, quantity);
    if (!added) {
      return;
    }

    if (embeddedWeight) {
      setMessage({
        tone: "success",
        text: `${product.nombre} agregado con peso ${formatDecimalInput(
          embeddedWeight,
          3,
          true,
        )}`,
      });
    }

    setBarcodeQuery("");
    setEntryQuantity("1");
  }

  function handleAddManualProduct() {
    const quantity = parseDecimalInput(entryQuantity || "1", 1);

    if (!manualProduct) {
      setMessage({ tone: "error", text: "Selecciona un producto manualmente" });
      return;
    }

    if (quantity <= 0) {
      setMessage({ tone: "error", text: "La cantidad debe ser mayor a cero" });
      return;
    }

    const added = addProduct(manualProduct, quantity);
    if (!added) {
      return;
    }

    setManualProduct(null);
    setEntryQuantity("1");
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
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

        nextItems.push({
          productId,
          precioUnitario: product.precio,
          cantidad: 1,
          descuento: 0,
        });
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
    setCustomerSearch("");
    setCustomers([]);
    setMessage({
      text: `Cliente seleccionado: ${customer.razonSocial}`,
      tone: "success",
    });
  }

  async function searchCustomerByIdentification() {
    const query = checkout.identificacion.trim().toLowerCase();

    if (!query) {
      setMessage({
        tone: "info",
        text: "Ingresa una identificacion para buscar un cliente existente",
      });
      return;
    }

    const localExactMatch =
      customers.find((item) => item.identificacion.toLowerCase() === query) ??
      customers.find((item) =>
        item.identificacion.toLowerCase().includes(query),
      );

    if (localExactMatch) {
      selectCustomer(localExactMatch);
      setMessage({
        tone: "success",
        text: `Cliente ${localExactMatch.razonSocial} cargado`,
      });
      return;
    }

    const result = await loadCustomers(query);
    const existingCustomer =
      result.find((item) => item.identificacion.toLowerCase() === query) ??
      result.find((item) =>
        item.identificacion.toLowerCase().includes(query),
      );

    if (!existingCustomer) {
      setMessage({
        tone: "info",
        text: "No se encontro cliente con esa identificacion. Puedes completar los datos manualmente.",
      });
      return;
    }

    selectCustomer(existingCustomer);
    setMessage({
      tone: "success",
      text: `Cliente ${existingCustomer.razonSocial} cargado`,
    });
  }

  function applyWalkInCustomer() {
    setCheckout((prev) => ({
      ...prev,
      ...WALK_IN_CUSTOMER,
    }));
    setMessage({
      tone: "info",
      text: "Cliente rapido aplicado como consumidor final",
    });
  }

  function openProductPicker() {
    setSelectedProductIds([]);
    setProductSearch("");
    setIsProductPickerOpen(true);
  }

  function cancelProductPicker() {
    setSelectedProductIds([]);
    setProductSearch("");
    setIsProductPickerOpen(false);
  }

  function onResetCheckout() {
    setCheckout(buildInitialCheckoutForm(defaultIssuerId, { isQuoteMode }));
    setLineItems([]);
    setSelectedProductIds([]);
    setCustomerSearch("");
    setCustomers([]);
    setProductSearch("");
    setBarcodeQuery("");
    setEntryQuantity("1");
    setManualProduct(null);
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

  function buildDirectSalePayments() {
    const normalizedTotal = Number(checkoutTotal.toFixed(2));

    return [
      {
        formaPago: checkout.formaPago,
        total: normalizedTotal,
        plazo: 0,
        unidadTiempo: "DIAS",
      },
    ];
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
      payments: isQuoteMode
        ? [
            {
              formaPago: checkout.formaPago,
              total: Number(checkoutTotal.toFixed(2)),
              plazo: 0,
              unidadTiempo: "DIAS",
            },
          ]
        : buildDirectSalePayments(),
      infoAdicional: {},
    };
  }

  async function onCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const identificationValidationError = validateIdentification(
      checkout.tipoIdentificacion,
      checkout.identificacion,
    );
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
            ? result.receivable
              ? `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber} autorizada y saldo pendiente ${result.receivable.pendingAmount.toFixed(2)} generado en cartera.`
              : `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber} autorizada correctamente`
            : result.receivable
              ? `Venta #${result.saleNumber} registrada, factura autorizada y saldo pendiente ${result.receivable.pendingAmount.toFixed(2)} generado en cartera.`
              : `Venta #${result.saleNumber} registrada y factura autorizada correctamente`,
          tone: "success",
        });
      } else {
        setMessage({
          text: result.document.fullNumber
            ? result.receivable
              ? `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber} y saldo pendiente ${result.receivable.pendingAmount.toFixed(2)} generado en cartera.`
              : `Venta #${result.saleNumber} registrada. Factura ${result.document.fullNumber}.`
            : result.receivable
              ? `Venta #${result.saleNumber} registrada. La factura aun no se encuentra autorizada y se genero un saldo pendiente de ${result.receivable.pendingAmount.toFixed(2)}.`
              : `Venta #${result.saleNumber} registrada. La factura aun no se encuentra autorizada.`,
          tone: "info",
        });
      }

      setLineItems([]);
      setSelectedProductIds([]);
      setProductSearch("");
      setBarcodeQuery("");
      setEntryQuantity("1");
      setManualProduct(null);
      await loadCheckoutData();
    } catch (error) {
      setPrintableSaleId(null);
      setAuthorizedSriInvoiceId(null);
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo registrar la venta",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onSaveQuote() {
    setMessage(null);

    const identificationValidationError = validateIdentification(
      checkout.tipoIdentificacion,
      checkout.identificacion,
    );
    if (identificationValidationError) {
      setMessage({ text: identificationValidationError, tone: "error" });
      return;
    }

    if (linePreview.length === 0) {
      setMessage({
        text: "Agrega al menos un producto para guardar la cotizacion.",
        tone: "error",
      });
      return;
    }

    setSavingQuote(true);
    try {
      const url = editingQuoteId
        ? `/api/v1/quotes/${editingQuoteId}`
        : "/api/v1/quotes";
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
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo guardar la cotizacion",
        tone: "error",
      });
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
      const result = await fetchJson<Quote[]>("/api/v1/quotes?status=OPEN");
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

  function handlePrintPdf() {
    if (!printableSaleId) return;
    window.open(`/api/v1/sales/${printableSaleId}/print`, "_blank", "noopener,noreferrer");
  }

  function handlePrintXml() {
    if (!authorizedSriInvoiceId) return;
    window.open(`/api/v1/sri-invoices/${authorizedSriInvoiceId}/xml`, "_blank", "noopener,noreferrer");
  }

  function handlePrintQuote() {
    if (!editingQuoteId) return;
    window.open(`/api/v1/quotes/${editingQuoteId}/pdf`, "_blank", "noopener,noreferrer");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isQuoteMode) {
      event.preventDefault();
      void onSaveQuote();
      return;
    }

    void onCheckout(event);
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

  useEffect(() => {
    if (!message) return;
    const timeoutId = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timeoutId);
  }, [message]);

  useEffect(() => {
    const normalized = customerSearch.trim();
    if (normalized.length < 2) {
      setCustomers([]);
      setCustomerLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadCustomers(normalized);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearch]);

  return {
    mode,
    isQuoteMode,
    loading,
    saving,
    savingQuote,
    products,
    inventoryTrackingEnabled,
    message,
    setMessage,
    checkout,
    setCheckout,
    linePreview,
    checkoutSubtotal,
    checkoutTax,
    checkoutTotal,
    selectedIdentificationType,
    selectedPaymentMethod,
    printableSaleId,
    authorizedSriInvoiceId,
    editingQuoteId,
    canResetCheckout,
    handlePrintPdf,
    handlePrintXml,
    handlePrintQuote,
    onCancelEdit,
    onOpenQuotesModal,
    onResetCheckout,
    handleSubmit,
    searchCustomerByIdentification,
    applyWalkInCustomer,
    barcodeQuery,
    setBarcodeQuery,
    entryQuantity,
    setEntryQuantity,
    manualProduct,
    setManualProduct,
    handleAddByCode,
    handleAddManualProduct,
    openProductPicker,
    incrementLineQuantity,
    updateLineByProduct,
    removeLine,
    isQuotesModalOpen,
    quotesLoading,
    quotes,
    setIsQuotesModalOpen,
    loadQuoteById,
    customerSearch,
    setCustomerSearch,
    customerLoading,
    customers,
    selectCustomer,
    isProductPickerOpen,
    productSearch,
    setProductSearch,
    filteredProducts,
    selectedProductIds,
    toggleProductSelection,
    cancelProductPicker,
    addSelectedProductsToDetail,
  };
}
