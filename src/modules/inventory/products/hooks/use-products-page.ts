"use client";

import { useState, type FormEvent } from "react";

import type {
  EditProductForm,
  NewProductForm,
  Product,
} from "@/shared/dashboard/types";

import {
  createProduct,
  deactivateProduct,
  fetchProducts,
  updateProduct,
} from "../services/products-client";

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

type UseProductsPageOptions = {
  initialProducts: Product[];
  initialError?: string | null;
};

function createEmptyNewProductForm(): NewProductForm {
  return {
    nombre: "",
    sku: "",
    codigoBarras: "",
    tipoProducto: "BIEN",
    precio: "",
    tarifaIva: "15",
    stockInicial: "0",
    minStock: "0",
  };
}

function createEmptyEditProductForm(): EditProductForm {
  return {
    nombre: "",
    sku: "",
    codigoBarras: "",
    tipoProducto: "BIEN",
    precio: "",
    tarifaIva: "15",
    minStock: "0",
  };
}

function mapProductToEditForm(product: Product): EditProductForm {
  return {
    nombre: product.nombre,
    sku: product.sku ?? "",
    codigoBarras: product.codigoBarras ?? "",
    tipoProducto: product.tipoProducto,
    precio: String(product.precio),
    tarifaIva: String(product.tarifaIva),
    minStock: String(product.minStock),
  };
}

export function useProductsPage({
  initialProducts,
  initialError = null,
}: UseProductsPageOptions) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [feedback, setFeedback] = useState<FeedbackState>(
    initialError ? { message: initialError, severity: "error" } : null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<NewProductForm>(
    createEmptyNewProductForm,
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditProductForm>(
    createEmptyEditProductForm,
  );
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function reloadProducts() {
    const nextProducts = await fetchProducts();
    setProducts(nextProducts);
  }

  function openCreateDialog() {
    setCreateForm(createEmptyNewProductForm());
    setFeedback(null);
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    if (saving) {
      return;
    }

    setIsCreateDialogOpen(false);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setEditForm(mapProductToEditForm(product));
    setFeedback(null);
  }

  function closeEditDialog() {
    if (saving) {
      return;
    }

    setEditingProduct(null);
  }

  function openDeleteDialog(product: Product) {
    setDeletingProduct(product);
    setFeedback(null);
  }

  function closeDeleteDialog() {
    if (deleting) {
      return;
    }

    setDeletingProduct(null);
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await createProduct(createForm);
      setCreateForm(createEmptyNewProductForm());
      setIsCreateDialogOpen(false);
      setFeedback({
        message: "Producto creado correctamente",
        severity: "success",
      });
      await reloadProducts();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear producto",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await updateProduct(editingProduct.id, editForm);
      setEditingProduct(null);
      setFeedback({
        message: "Producto actualizado correctamente",
        severity: "success",
      });
      await reloadProducts();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar producto",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) {
      return;
    }

    setDeleting(true);
    setFeedback(null);

    try {
      await deactivateProduct(deletingProduct.id);
      setDeletingProduct(null);
      setFeedback({
        message: "Producto desactivado correctamente",
        severity: "success",
      });
      await reloadProducts();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo desactivar producto",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return {
    products,
    feedback,
    isCreateDialogOpen,
    createForm,
    setCreateForm,
    editingProduct,
    editForm,
    setEditForm,
    deletingProduct,
    saving,
    deleting,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
  };
}
