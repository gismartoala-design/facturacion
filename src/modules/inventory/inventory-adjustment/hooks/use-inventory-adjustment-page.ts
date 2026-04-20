"use client";

import { useState, type FormEvent } from "react";

import type { Product, StockAdjustmentForm, StockItem } from "@/shared/dashboard/types";

import {
  createInventoryAdjustment,
  fetchInventoryProducts,
  fetchStockItems,
} from "../services/inventory-adjustment-client";

type FeedbackState = {
  message: string;
  severity: "success" | "error" | "info";
} | null;

type UseInventoryAdjustmentPageOptions = {
  initialProducts: Product[];
  initialStock: StockItem[];
  initialError?: string | null;
};

function createEmptyAdjustment(): StockAdjustmentForm {
  return {
    productId: "",
    movementType: "IN",
    quantity: "0",
  };
}

export function useInventoryAdjustmentPage({
  initialProducts,
  initialStock,
  initialError = null,
}: UseInventoryAdjustmentPageOptions) {
  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [feedback, setFeedback] = useState<FeedbackState>(
    initialError ? { message: initialError, severity: "error" } : null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustment, setAdjustment] = useState<StockAdjustmentForm>(
    createEmptyAdjustment,
  );

  async function reloadData() {
    const [nextStock, nextProducts] = await Promise.all([
      fetchStockItems(),
      fetchInventoryProducts(),
    ]);

    setStock(nextStock);
    setProducts(nextProducts);
  }

  function openDialog() {
    setAdjustment(createEmptyAdjustment());
    setFeedback(null);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (saving) {
      return;
    }

    setIsDialogOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await createInventoryAdjustment(adjustment);
      setIsDialogOpen(false);
      setFeedback({
        message: "Stock actualizado",
        severity: "success",
      });
      await reloadData();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo ajustar stock",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return {
    stock,
    products,
    feedback,
    isDialogOpen,
    adjustment,
    setAdjustment,
    saving,
    openDialog,
    closeDialog,
    handleSubmit,
  };
}
