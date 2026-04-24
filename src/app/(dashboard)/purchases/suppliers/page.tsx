import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listSuppliers } from "@/core/purchases/supplier.service";
import { getSession } from "@/lib/auth";
import { SuppliersPage } from "@/modules/purchases/suppliers/pages/suppliers-page";
import type { Supplier } from "@/modules/purchases/suppliers/types";

export const metadata: Metadata = {
  title: "Proveedores",
  description: "Cartera base de proveedores para compras y abastecimiento.",
};

export default async function SuppliersRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialSuppliers: Supplier[] = [];
  let initialError: string | null = null;

  try {
    initialSuppliers = session.businessId
      ? await listSuppliers(session.businessId)
      : [];
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudieron cargar proveedores";
  }

  return (
    <SuppliersPage
      initialSuppliers={initialSuppliers}
      initialError={initialError}
    />
  );
}
