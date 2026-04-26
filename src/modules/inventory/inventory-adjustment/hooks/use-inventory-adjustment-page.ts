"use client";

import { useState, type FormEvent } from "react";

import type { Product, StockAdjustmentForm, StockItem } from "@/shared/dashboard/types";
import { useInventoryNotifier } from "@/shared/notifications/notifier-presets";

import {
  createInventoryAdjustment,
  fetchInventoryProducts,
  fetchStockItems,
} from "../services/inventory-adjustment-client";

type UseInventoryAdjustmentPageOptions = {
  initialProducts: Product[];
  initialStock: StockItem[];
};

function createEmptyAdjustment(): StockAdjustmentForm {
  return {
    productId: "",
    movementType: "IN",
    quantity: "0",
    unitCost: "",
  };
}

export function useInventoryAdjustmentPage({
  initialProducts,
  initialStock,
}: UseInventoryAdjustmentPageOptions) {
  const notifier = useInventoryNotifier();
  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [products, setProducts] = useState<Product[]>(initialProducts);
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

    try {
      await createInventoryAdjustment(adjustment);
      setIsDialogOpen(false);
      notifier.saved("Stock actualizado");
      await reloadData();
    } catch (error) {
      notifier.apiError(error, "No se pudo ajustar stock");
    } finally {
      setSaving(false);
    }
  }

  return {
    stock,
    products,
    isDialogOpen,
    adjustment,
    setAdjustment,
    saving,
    openDialog,
    closeDialog,
    handleSubmit,
  };
}
