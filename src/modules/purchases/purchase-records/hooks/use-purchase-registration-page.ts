"use client";

import { useMemo, useState, type FormEvent } from "react";

import { usePurchasesNotifier } from "@/shared/notifications/notifier-presets";
import type { Product } from "@/shared/dashboard/types";

import {
  createPurchase,
  fetchPurchases,
  voidPurchase,
} from "../services/purchases-client";
import type {
  Purchase,
  PurchaseForm,
  PurchaseLineForm,
  DraftLineForm,
} from "../types";
import type { Supplier } from "../../suppliers/types";

type UsePurchaseRegistrationPageOptions = {
  initialSuppliers: Supplier[];
  initialProducts: Product[];
  initialPurchases: Purchase[];
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyDraft(): DraftLineForm {
  return {
    productId: "",
    codeSearch: "",
    quantity: "1",
    unitCost: "0",
    discount: "0",
    taxRate: "15",
  };
}

function createEmptyPurchaseForm(): PurchaseForm {
  return {
    supplierId: "",
    documentType: "FACTURA",
    documentNumber: "",
    authorizationNumber: "",
    issuedAt: todayInputValue(),
    notes: "",
    items: [],
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function usePurchaseRegistrationPage({
  initialSuppliers,
  initialProducts,
  initialPurchases,
}: UsePurchaseRegistrationPageOptions) {
  const notifier = usePurchasesNotifier();
  const [suppliers] = useState(initialSuppliers);
  const [products] = useState(initialProducts);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState<PurchaseForm>(createEmptyPurchaseForm);
  const [draft, setDraft] = useState<DraftLineForm>(createEmptyDraft);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [supplierIdSearch, setSupplierIdSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const activeProducts = useMemo(
    () => products.filter((product) => product.activo),
    [products],
  );
  const productById = useMemo(
    () => new Map(activeProducts.map((product) => [product.id, product])),
    [activeProducts],
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === form.supplierId) ?? null,
    [form.supplierId, suppliers],
  );

  const selectedDraftProduct = useMemo(
    () => (draft.productId ? (productById.get(draft.productId) ?? null) : null),
    [draft.productId, productById],
  );

  const lineRows = useMemo(
    () =>
      form.items.map((item, index) => {
        const product = productById.get(item.productId);
        const qty = toNumber(item.quantity);
        const cost = toNumber(item.unitCost);
        const disc = toNumber(item.discount);
        const tax = toNumber(item.taxRate);
        const subtotal = Math.max(0, roundMoney(qty * cost - disc));
        const total = roundMoney(subtotal + roundMoney(subtotal * (tax / 100)));

        return {
          id: index,
          productCode: product?.codigo ?? "",
          productName: product?.nombre ?? "",
          quantity: qty,
          unitCost: cost,
          discount: disc,
          taxRate: tax,
          total,
        };
      }),
    [form.items, productById],
  );

  const totals = useMemo(
    () =>
      form.items.reduce(
        (acc, item) => {
          const qty = toNumber(item.quantity);
          const cost = toNumber(item.unitCost);
          const disc = toNumber(item.discount);
          const tax = toNumber(item.taxRate);
          const subtotal = Math.max(0, roundMoney(qty * cost - disc));
          const taxAmt = roundMoney(subtotal * (tax / 100));

          return {
            subtotal: roundMoney(acc.subtotal + subtotal),
            discountTotal: roundMoney(acc.discountTotal + disc),
            taxTotal: roundMoney(acc.taxTotal + taxAmt),
            total: roundMoney(acc.total + subtotal + taxAmt),
          };
        },
        { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 },
      ),
    [form.items],
  );

  function handleSupplierSelect(supplier: Supplier | null) {
    setForm((prev) => ({ ...prev, supplierId: supplier?.id ?? "" }));
    setSupplierIdSearch(supplier?.identificacion ?? "");
  }

  function handleSupplierIdSearch(value: string) {
    setSupplierIdSearch(value);
    const match = suppliers.find((s) => s.identificacion === value.trim());
    if (match) {
      setForm((prev) => ({ ...prev, supplierId: match.id }));
    }
  }

  function updateDraft(patch: Partial<DraftLineForm>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDraftError(null);
  }

  function selectDraftProduct(product: Product | null) {
    setDraft((prev) => ({
      ...prev,
      productId: product?.id ?? "",
      codeSearch: product?.codigo ?? "",
      unitCost: product ? String(product.precio ?? 0) : "0",
      taxRate: product ? String(product.tarifaIva) : "15",
    }));
    setDraftError(null);
  }

  function searchDraftByCode() {
    const query = draft.codeSearch.trim().toLowerCase();
    if (!query) return;

    const found =
      activeProducts.find((p) => p.codigo.toLowerCase() === query) ??
      activeProducts.find(
        (p) => p.codigoBarras?.toLowerCase() === query,
      ) ??
      activeProducts.find((p) => p.codigo.toLowerCase().includes(query));

    if (!found) {
      setDraftError("Producto no encontrado con ese codigo");
      return;
    }

    selectDraftProduct(found);
  }

  function commitDraftLine() {
    if (!draft.productId) {
      setDraftError("Selecciona un producto para agregar");
      return;
    }
    if (toNumber(draft.quantity) <= 0) {
      setDraftError("La cantidad debe ser mayor a cero");
      return;
    }

    const line: PurchaseLineForm = {
      productId: draft.productId,
      quantity: draft.quantity,
      unitCost: draft.unitCost,
      discount: draft.discount,
      taxRate: draft.taxRate,
    };

    setForm((prev) => ({ ...prev, items: [...prev.items, line] }));
    setDraft(createEmptyDraft());
    setDraftError(null);
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function reloadPurchases() {
    const nextPurchases = await fetchPurchases();
    setPurchases(nextPurchases);
  }

  function openVoidDialog(purchase: Purchase) {
    setVoidingPurchase(purchase);
    setVoidReason("");
  }

  function closeVoidDialog() {
    if (voiding) return;
    setVoidingPurchase(null);
    setVoidReason("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.items.length === 0) {
      notifier.apiError(
        new Error("Agrega al menos un producto antes de registrar la compra"),
        "Sin productos",
      );
      return;
    }

    setSaving(true);
    try {
      await createPurchase(form);
      setForm(createEmptyPurchaseForm());
      setDraft(createEmptyDraft());
      setSupplierIdSearch("");
      notifier.saved("Compra registrada y stock actualizado");
      await reloadPurchases();
    } catch (error) {
      notifier.apiError(error, "No se pudo registrar compra");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoidPurchase() {
    if (!voidingPurchase) return;
    setVoiding(true);
    try {
      const updated = await voidPurchase(voidingPurchase.id, voidReason);
      setPurchases((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      setVoidingPurchase(null);
      setVoidReason("");
      notifier.deleted("Compra anulada y stock revertido correctamente");
    } catch (error) {
      notifier.apiError(error, "No se pudo anular compra");
    } finally {
      setVoiding(false);
    }
  }

  return {
    suppliers,
    products: activeProducts,
    purchases,
    form,
    setForm,
    draft,
    draftError,
    supplierIdSearch,
    selectedSupplier,
    selectedDraftProduct,
    lineRows,
    saving,
    voiding,
    voidingPurchase,
    voidReason,
    setVoidReason,
    totals,
    handleSupplierSelect,
    handleSupplierIdSearch,
    updateDraft,
    selectDraftProduct,
    searchDraftByCode,
    commitDraftLine,
    removeLine,
    openVoidDialog,
    closeVoidDialog,
    handleSubmit,
    handleVoidPurchase,
  };
}
