"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { OverviewSection } from "@/components/mvp-dashboard-sections";
import { type PaginatedResult, type Product, type SriInvoice, type StockItem } from "@/components/mvp-dashboard-types";

export default function OverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const lowStockCount = useMemo(() => stock.filter((item) => item.lowStock).length, [stock]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      try {
        const [productsRes, stockRes, pendingRes] = await Promise.all([
          fetchJson<Product[]>("/api/v1/products"),
          fetchJson<StockItem[]>("/api/v1/stock"),
          fetchJson<PaginatedResult<SriInvoice>>("/api/v1/sri-invoices?status=PENDING_SRI&limit=100"),
        ]);

        setProducts(productsRes);
        setStock(stockRes);
        setPendingInvoices(pendingRes.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando resumen...
      </div>
    );
  }

  return (
    <>
      <OverviewSection
        products={products}
        lowStockCount={lowStockCount}
        pendingInvoices={pendingInvoices}
        checkoutTotal={0}
        stock={stock}
      />
    </>
  );
}
