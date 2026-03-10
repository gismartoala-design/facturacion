"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { ProductModal } from "@/components/mvp-dashboard-modals";
import { ProductsSection } from "@/components/mvp-dashboard-sections";
import { type NewProductForm, type Product } from "@/components/mvp-dashboard-types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    nombre: "",
    sku: "",
    precio: "",
    tarifaIva: "15",
    stockInicial: "0",
    minStock: "0",
  });

  async function loadProducts() {
    setLoading(true);

    try {
      const result = await fetchJson<Product[]>("/api/v1/products");
      setProducts(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar productos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function onCreateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          nombre: newProduct.nombre,
          sku: newProduct.sku || undefined,
          precio: Number(newProduct.precio),
          tarifaIva: Number(newProduct.tarifaIva),
          stockInicial: Number(newProduct.stockInicial),
          minStock: Number(newProduct.minStock),
        }),
      });

      setNewProduct({ nombre: "", sku: "", precio: "", tarifaIva: "15", stockInicial: "0", minStock: "0" });
      setIsProductModalOpen(false);
      setMessage("Producto creado correctamente");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear producto");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos...
      </div>
    );
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <ProductsSection products={products} onOpenProductModal={() => setIsProductModalOpen(true)} />
      <ProductModal
        isOpen={isProductModalOpen}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        saving={saving}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={onCreateProduct}
      />
    </>
  );
}
