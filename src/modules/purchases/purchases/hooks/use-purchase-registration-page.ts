"use client";

import { useMemo, useState, type FormEvent } from "react";

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
} from "../types";
import type { Supplier } from "../../suppliers/types";

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

type UsePurchaseRegistrationPageOptions = {
  initialSuppliers: Supplier[];
  initialProducts: Product[];
  initialPurchases: Purchase[];
  initialError?: string | null;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyLine(): PurchaseLineForm {
  return {
    productId: "",
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
    items: [createEmptyLine()],
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
  initialError = null,
}: UsePurchaseRegistrationPageOptions) {
  const [suppliers] = useState(initialSuppliers);
  const [products] = useState(initialProducts);
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState<PurchaseForm>(createEmptyPurchaseForm);
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(
    initialError ? { message: initialError, severity: "error" } : null,
  );

  const activeProducts = useMemo(
    () => products.filter((product) => product.activo),
    [products],
  );
  const productById = useMemo(
    () => new Map(activeProducts.map((product) => [product.id, product])),
    [activeProducts],
  );

  const totals = useMemo(() => {
    return form.items.reduce(
      (current, item) => {
        const gross = roundMoney(toNumber(item.quantity) * toNumber(item.unitCost));
        const discount = roundMoney(toNumber(item.discount));
        const subtotal = Math.max(0, roundMoney(gross - discount));
        const taxTotal = roundMoney(subtotal * (toNumber(item.taxRate) / 100));
        const total = roundMoney(subtotal + taxTotal);

        return {
          subtotal: roundMoney(current.subtotal + subtotal),
          discountTotal: roundMoney(current.discountTotal + discount),
          taxTotal: roundMoney(current.taxTotal + taxTotal),
          total: roundMoney(current.total + total),
        };
      },
      { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 },
    );
  }, [form.items]);

  function updateLine(index: number, patch: Partial<PurchaseLineForm>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function selectProduct(index: number, productId: string) {
    const product = productById.get(productId);

    updateLine(index, {
      productId,
      taxRate: product ? String(product.tarifaIva) : "15",
    });
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyLine()],
    }));
  }

  function removeLine(index: number) {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function reloadPurchases() {
    const nextPurchases = await fetchPurchases();
    setPurchases(nextPurchases);
  }

  function openVoidDialog(purchase: Purchase) {
    setVoidingPurchase(purchase);
    setVoidReason("");
    setFeedback(null);
  }

  function closeVoidDialog() {
    if (voiding) return;
    setVoidingPurchase(null);
    setVoidReason("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await createPurchase(form);
      setForm(createEmptyPurchaseForm());
      setFeedback({
        message: "Compra registrada y stock actualizado",
        severity: "success",
      });
      await reloadPurchases();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo registrar compra",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleVoidPurchase() {
    if (!voidingPurchase) return;

    setVoiding(true);
    setFeedback(null);

    try {
      const updatedPurchase = await voidPurchase(voidingPurchase.id, voidReason);
      setPurchases((prev) =>
        prev.map((purchase) =>
          purchase.id === updatedPurchase.id ? updatedPurchase : purchase,
        ),
      );
      setVoidingPurchase(null);
      setVoidReason("");
      setFeedback({
        message: "Compra anulada y stock revertido correctamente",
        severity: "success",
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "No se pudo anular compra",
        severity: "error",
      });
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
    saving,
    voiding,
    voidingPurchase,
    voidReason,
    setVoidReason,
    feedback,
    totals,
    selectProduct,
    updateLine,
    addLine,
    removeLine,
    openVoidDialog,
    closeVoidDialog,
    handleSubmit,
    handleVoidPurchase,
  };
}
