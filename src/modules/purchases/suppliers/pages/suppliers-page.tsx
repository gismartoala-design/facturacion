"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

import {
  CreateSupplierDialog,
  DeleteSupplierDialog,
  EditSupplierDialog,
} from "../components/supplier-dialogs";
import { SuppliersSection } from "../components/suppliers-section";
import { useSuppliersPage } from "../hooks/use-suppliers-page";
import type { Supplier } from "../types";

type SuppliersPageProps = {
  initialSuppliers: Supplier[];
  initialError?: string | null;
};

export function SuppliersPage({
  initialSuppliers,
  initialError = null,
}: SuppliersPageProps) {
  const suppliersPage = useSuppliersPage({
    initialSuppliers,
    initialError,
  });

  return (
    <Stack spacing={2}>
      {suppliersPage.feedback ? (
        <Alert severity={suppliersPage.feedback.severity}>
          {suppliersPage.feedback.message}
        </Alert>
      ) : null}

      <SuppliersSection
        suppliers={suppliersPage.suppliers}
        onOpenSupplierModal={suppliersPage.openCreateDialog}
        onEditSupplier={suppliersPage.openEditDialog}
        onDeleteSupplier={suppliersPage.openDeleteDialog}
      />

      <CreateSupplierDialog
        isOpen={suppliersPage.isCreateDialogOpen}
        form={suppliersPage.createForm}
        setForm={suppliersPage.setCreateForm}
        saving={suppliersPage.saving}
        onClose={suppliersPage.closeCreateDialog}
        onSubmit={suppliersPage.handleCreateSupplier}
      />

      <EditSupplierDialog
        isOpen={suppliersPage.editingSupplier !== null}
        form={suppliersPage.editForm}
        setForm={suppliersPage.setEditForm}
        saving={suppliersPage.saving}
        onClose={suppliersPage.closeEditDialog}
        onSubmit={suppliersPage.handleUpdateSupplier}
      />

      <DeleteSupplierDialog
        isOpen={suppliersPage.deletingSupplier !== null}
        supplierName={suppliersPage.deletingSupplier?.razonSocial ?? ""}
        saving={suppliersPage.deleting}
        onClose={suppliersPage.closeDeleteDialog}
        onConfirm={() => {
          void suppliersPage.handleDeleteSupplier();
        }}
      />
    </Stack>
  );
}
