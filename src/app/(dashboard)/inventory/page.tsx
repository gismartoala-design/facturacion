"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { type Product, type StockAdjustmentForm, type StockItem } from "@/shared/dashboard/types";
import { InventoryAdjustmentModal } from "@/modules/inventory/components/inventory-adjustment-modal";
import { InventorySection } from "@/modules/inventory/components/inventory-section";

type InventoryToast = {
  message: string;
  severity: "success" | "error" | "info";
};

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<InventoryToast | null>(null);
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
      setProducts(productsRes.filter((product) => product.tipoProducto === "BIEN"));
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar inventario",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openStockModal() {
    setAdjustment({
      productId: "",
      movementType: "IN",
      quantity: "0",
    });
    setIsStockModalOpen(true);
  }

  function closeStockModal() {
    if (saving) return;
    setIsStockModalOpen(false);
  }

  async function onAdjustStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setToast(null);

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
      setToast({
        message: "Stock actualizado",
        severity: "success",
      });
      await loadData();
    } catch (error) {
      setToast({
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

  return (
    <>
      <InventorySection stock={stock} onOpenStockModal={openStockModal} />
      <InventoryAdjustmentModal
        isOpen={isStockModalOpen}
        products={products}
        adjustment={adjustment}
        setAdjustment={setAdjustment}
        saving={saving}
        onClose={closeStockModal}
        onSubmit={onAdjustStock}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4200}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setToast(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          elevation={0}
          variant="filled"
          severity={toast?.severity ?? "info"}
          onClose={() => setToast(null)}
          sx={{
            minWidth: 280,
            borderRadius: "16px",
            boxShadow: "0 18px 38px rgba(74, 60, 88, 0.18)",
          }}
        >
          {toast?.message ?? ""}
        </Alert>
      </Snackbar>
    </>
  );
}
