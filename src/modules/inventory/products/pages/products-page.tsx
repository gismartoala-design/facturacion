"use client";

import Stack from "@mui/material/Stack";

import type { Product } from "@/shared/dashboard/types";
import { PageErrorState } from "@/shared/states/page-error-state";

import {
  CreateProductDialog,
  DeleteProductDialog,
  EditProductDialog,
} from "../components/product-dialogs";
import { ProductsSection } from "../components/products-section";
import { useProductsPage } from "../hooks/use-products-page";

type ProductsPageProps = {
  initialProducts: Product[];
  initialError?: string | null;
};

export function ProductsPage({
  initialProducts,
  initialError = null,
}: ProductsPageProps) {
  const productsPage = useProductsPage({
    initialProducts,
  });

  if (initialError) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <Stack spacing={2}>
      <ProductsSection
        products={productsPage.products}
        onOpenProductModal={productsPage.openCreateDialog}
        onEditProduct={productsPage.openEditDialog}
        onDeleteProduct={productsPage.openDeleteDialog}
      />

      <CreateProductDialog
        isOpen={productsPage.isCreateDialogOpen}
        form={productsPage.createForm}
        setForm={productsPage.setCreateForm}
        saving={productsPage.saving}
        onClose={productsPage.closeCreateDialog}
        onSubmit={productsPage.handleCreateProduct}
      />

      <EditProductDialog
        isOpen={productsPage.editingProduct !== null}
        form={productsPage.editForm}
        setForm={productsPage.setEditForm}
        saving={productsPage.saving}
        onClose={productsPage.closeEditDialog}
        onSubmit={productsPage.handleUpdateProduct}
      />

      <DeleteProductDialog
        isOpen={productsPage.deletingProduct !== null}
        productName={productsPage.deletingProduct?.nombre ?? ""}
        saving={productsPage.deleting}
        onClose={productsPage.closeDeleteDialog}
        onConfirm={() => {
          void productsPage.handleDeleteProduct();
        }}
      />
    </Stack>
  );
}
