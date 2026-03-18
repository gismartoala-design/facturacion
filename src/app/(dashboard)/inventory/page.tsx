"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { StockAdjustmentModal } from "@/components/mvp-dashboard-modals";
import { type Product, type StockAdjustmentForm, type StockItem } from "@/components/mvp-dashboard-types";
import { InventorySection } from "@/features/inventory/components/inventory-section";

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [adjustment, setAdjustment] = useState<StockAdjustmentForm>({
    productId: "",
    movementType: "IN",
    quantity: "0",
  });

  async function loadData() {
    setLoading(true);

    try {
      const [stockRes, productsRes] = await Promise.all([
        fetchJson<StockItem[]>("/api/v1/stock"),
        fetchJson<Product[]>("/api/v1/products"),
      ]);

      setStock(stockRes);
      setProducts(productsRes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar inventario");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando inventario...
      </div>
    );
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <InventorySection stock={stock} onOpenStockModal={() => setIsStockModalOpen(true)} />
      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        products={products}
        adjustment={adjustment}
        setAdjustment={setAdjustment}
        saving={saving}
        onClose={() => setIsStockModalOpen(false)}
        onSubmit={onAdjustStock}
      />
    </>
  );
}
