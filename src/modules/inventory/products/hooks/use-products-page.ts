"use client";

import { useState, type FormEvent } from "react";

import type {
  EditProductForm,
  NewProductForm,
  Product,
} from "@/shared/dashboard/types";
import { useInventoryNotifier } from "@/shared/notifications/notifier-presets";

import {
  createProduct,
  deactivateProduct,
  fetchProducts,
  updateProduct,
} from "../services/products-client";

type UseProductsPageOptions = {
  initialProducts: Product[];
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
    initialUnitCost: "0",
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
}: UseProductsPageOptions) {
  const notifier = useInventoryNotifier();
  const [products, setProducts] = useState<Product[]>(initialProducts);
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
  }

  function closeEditDialog() {
    if (saving) {
      return;
    }

    setEditingProduct(null);
  }

  function openDeleteDialog(product: Product) {
    setDeletingProduct(product);
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

    try {
      await createProduct(createForm);
      setCreateForm(createEmptyNewProductForm());
      setIsCreateDialogOpen(false);
      notifier.saved("Producto creado correctamente");
      await reloadProducts();
    } catch (error) {
      notifier.apiError(error, "No se pudo crear producto");
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

    try {
      await updateProduct(editingProduct.id, editForm);
      setEditingProduct(null);
      notifier.saved("Producto actualizado correctamente");
      await reloadProducts();
    } catch (error) {
      notifier.apiError(error, "No se pudo actualizar producto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) {
      return;
    }

    setDeleting(true);

    try {
      await deactivateProduct(deletingProduct.id);
      setDeletingProduct(null);
      notifier.deleted("Producto desactivado correctamente");
      await reloadProducts();
    } catch (error) {
      notifier.apiError(error, "No se pudo desactivar producto");
    } finally {
      setDeleting(false);
    }
  }

  return {
    products,
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
