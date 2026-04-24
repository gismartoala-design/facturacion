"use client";

import { useState, type FormEvent } from "react";

import {
  createSupplier,
  deactivateSupplier,
  fetchSuppliers,
  updateSupplier,
} from "../services/suppliers-client";
import type { Supplier, SupplierForm } from "../types";

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

type UseSuppliersPageOptions = {
  initialSuppliers: Supplier[];
  initialError?: string | null;
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
  initialError = null,
}: UseSuppliersPageOptions) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [feedback, setFeedback] = useState<FeedbackState>(
    initialError ? { message: initialError, severity: "error" } : null,
  );
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
    setFeedback(null);
    setIsCreateDialogOpen(true);
  }

  function closeCreateDialog() {
    if (saving) return;
    setIsCreateDialogOpen(false);
  }

  function openEditDialog(supplier: Supplier) {
    setEditingSupplier(supplier);
    setEditForm(mapSupplierToForm(supplier));
    setFeedback(null);
  }

  function closeEditDialog() {
    if (saving) return;
    setEditingSupplier(null);
  }

  function openDeleteDialog(supplier: Supplier) {
    setDeletingSupplier(supplier);
    setFeedback(null);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeletingSupplier(null);
  }

  async function handleCreateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await createSupplier(createForm);
      setCreateForm(createEmptySupplierForm());
      setIsCreateDialogOpen(false);
      setFeedback({
        message: "Proveedor creado correctamente",
        severity: "success",
      });
      await reloadSuppliers();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear proveedor",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSupplier) return;

    setSaving(true);
    setFeedback(null);

    try {
      await updateSupplier(editingSupplier.id, editForm);
      setEditingSupplier(null);
      setFeedback({
        message: "Proveedor actualizado correctamente",
        severity: "success",
      });
      await reloadSuppliers();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar proveedor",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier() {
    if (!deletingSupplier) return;

    setDeleting(true);
    setFeedback(null);

    try {
      await deactivateSupplier(deletingSupplier.id);
      setDeletingSupplier(null);
      setFeedback({
        message: "Proveedor desactivado correctamente",
        severity: "success",
      });
      await reloadSuppliers();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo desactivar proveedor",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return {
    suppliers,
    feedback,
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
