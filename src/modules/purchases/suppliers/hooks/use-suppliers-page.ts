"use client";

import { useState, type FormEvent } from "react";

import { usePurchasesNotifier } from "@/shared/notifications/notifier-presets";

import {
  createSupplier,
  deactivateSupplier,
  fetchSuppliers,
  updateSupplier,
} from "../services/suppliers-client";
import type { Supplier, SupplierForm } from "../types";

type UseSuppliersPageOptions = {
  initialSuppliers: Supplier[];
};

function createEmptySupplierForm(): SupplierForm {
  return {
    tipoIdentificacion: "04",
    identificacion: "",
    razonSocial: "",
    nombreComercial: "",
    contactoPrincipal: "",
    email: "",
    telefono: "",
    direccion: "",
    diasCredito: "0",
  };
}

function mapSupplierToForm(supplier: Supplier): SupplierForm {
  return {
    tipoIdentificacion: supplier.tipoIdentificacion,
    identificacion: supplier.identificacion,
    razonSocial: supplier.razonSocial,
    nombreComercial: supplier.nombreComercial ?? "",
    contactoPrincipal: supplier.contactoPrincipal ?? "",
    email: supplier.email ?? "",
    telefono: supplier.telefono ?? "",
    direccion: supplier.direccion ?? "",
    diasCredito: String(supplier.diasCredito),
  };
}

export function useSuppliersPage({
  initialSuppliers,
}: UseSuppliersPageOptions) {
  const notifier = usePurchasesNotifier();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<SupplierForm>(
    createEmptySupplierForm,
  );
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<SupplierForm>(
    createEmptySupplierForm,
  );
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function reloadSuppliers() {
    const nextSuppliers = await fetchSuppliers();
    setSuppliers(nextSuppliers);
  }

  function openCreateDialog() {
    setCreateForm(createEmptySupplierForm());
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    if (saving) return;
    setIsCreateDialogOpen(false);
  }

  function openEditDialog(supplier: Supplier) {
    setEditingSupplier(supplier);
    setEditForm(mapSupplierToForm(supplier));
  }

  function closeEditDialog() {
    if (saving) return;
    setEditingSupplier(null);
  }

  function openDeleteDialog(supplier: Supplier) {
    setDeletingSupplier(supplier);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeletingSupplier(null);
  }

  async function handleCreateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await createSupplier(createForm);
      setCreateForm(createEmptySupplierForm());
      setIsCreateDialogOpen(false);
      notifier.saved("Proveedor creado correctamente");
      await reloadSuppliers();
    } catch (error) {
      notifier.apiError(error, "No se pudo crear proveedor");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSupplier) return;

    setSaving(true);

    try {
      await updateSupplier(editingSupplier.id, editForm);
      setEditingSupplier(null);
      notifier.saved("Proveedor actualizado correctamente");
      await reloadSuppliers();
    } catch (error) {
      notifier.apiError(error, "No se pudo actualizar proveedor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier() {
    if (!deletingSupplier) return;

    setDeleting(true);

    try {
      await deactivateSupplier(deletingSupplier.id);
      setDeletingSupplier(null);
      notifier.deleted("Proveedor desactivado correctamente");
      await reloadSuppliers();
    } catch (error) {
      notifier.apiError(error, "No se pudo desactivar proveedor");
    } finally {
      setDeleting(false);
    }
  }

  return {
    suppliers,
    isCreateDialogOpen,
    createForm,
    setCreateForm,
    editingSupplier,
    editForm,
    setEditForm,
    deletingSupplier,
    saving,
    deleting,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleCreateSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
  };
}
