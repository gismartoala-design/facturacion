import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listKardexEntries } from "@/core/inventory/kardex.service";
import { getSession } from "@/lib/auth";
import { KardexPage } from "@/modules/inventory/kardex/pages/kardex-page";
import type { KardexEntry } from "@/modules/inventory/kardex/types";

export const metadata: Metadata = {
  title: "Kardex",
  description: "Historial operativo de movimientos de inventario.",
};

export default async function InventoryKardexRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialEntries: KardexEntry[] = [];
  let initialError: string | null = null;

  try {
    initialEntries = await listKardexEntries();
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el kardex de inventario";
  }

  return (
    <KardexPage initialEntries={initialEntries} initialError={initialError} />
  );
}
