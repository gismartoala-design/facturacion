"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchJson } from "@/components/mvp-dashboard-api";
import { DeleteProductModal, EditProductModal, ProductModal } from "@/components/mvp-dashboard-modals";
import { type EditProductForm, type NewProductForm, type Product } from "@/components/mvp-dashboard-types";
import { ProductsSection } from "@/modules/products/components/products-section";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    nombre: "",
    sku: "",
    tipoProducto: "BIEN",
    precio: "",
    tarifaIva: "15",
    stockInicial: "0",
    minStock: "0",
  });

  // Edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm>({
    nombre: "",
    sku: "",
    tipoProducto: "BIEN",
    precio: "",
    tarifaIva: "15",
    minStock: "0",
  });

  // Delete state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          tipoProducto: newProduct.tipoProducto,
          precio: Number(newProduct.precio),
          tarifaIva: Number(newProduct.tarifaIva),
          stockInicial: newProduct.tipoProducto === "BIEN" ? Number(newProduct.stockInicial) : 0,
          minStock: newProduct.tipoProducto === "BIEN" ? Number(newProduct.minStock) : 0,
        }),
      });

      setNewProduct({
        nombre: "",
        sku: "",
        tipoProducto: "BIEN",
        precio: "",
        tarifaIva: "15",
        stockInicial: "0",
        minStock: "0",
      });
      setIsProductModalOpen(false);
      setMessage("Producto creado correctamente");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear producto");
    } finally {
      setSaving(false);
    }
  }

  function onOpenEditProduct(product: Product) {
    setEditingProduct(product);
    setEditForm({
      nombre: product.nombre,
      sku: product.sku ?? "",
      tipoProducto: product.tipoProducto,
      precio: String(product.precio),
      tarifaIva: String(product.tarifaIva),
      minStock: String(product.minStock),
    });
    setMessage("");
  }

  async function onSubmitEditProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/products/${editingProduct.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre: editForm.nombre,
          sku: editForm.sku || undefined,
          tipoProducto: editForm.tipoProducto,
          precio: Number(editForm.precio),
          tarifaIva: Number(editForm.tarifaIva),
          minStock: editForm.tipoProducto === "BIEN" ? Number(editForm.minStock) : 0,
        }),
      });

      setEditingProduct(null);
      setMessage("Producto actualizado correctamente");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar producto");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDeleteProduct() {
    if (!deletingProduct) return;
    setDeleting(true);
    setMessage("");

    try {
      await fetchJson(`/api/v1/products/${deletingProduct.id}`, { method: "DELETE" });
      setDeletingProduct(null);
      setMessage("Producto desactivado correctamente");
      await loadProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar producto");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      <ProductsSection
        products={products}
        onOpenProductModal={() => setIsProductModalOpen(true)}
        onEditProduct={onOpenEditProduct}
        onDeleteProduct={(p) => { setDeletingProduct(p); setMessage(""); }}
      />
      <ProductModal
        isOpen={isProductModalOpen}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        saving={saving}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={onCreateProduct}
      />
      <EditProductModal
        isOpen={editingProduct !== null}
        editForm={editForm}
        setEditForm={setEditForm}
        saving={saving}
        onClose={() => setEditingProduct(null)}
        onSubmit={onSubmitEditProduct}
      />
      <DeleteProductModal
        isOpen={deletingProduct !== null}
        productName={deletingProduct?.nombre ?? ""}
        saving={deleting}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => { void onConfirmDeleteProduct(); }}
      />
    </>
  );
}
