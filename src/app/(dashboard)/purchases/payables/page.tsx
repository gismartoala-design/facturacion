import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listAccountsPayable } from "@/core/purchases/accounts-payable.service";
import { getSession } from "@/lib/auth";
import { PayablesPage } from "@/modules/purchases/payables/pages/payables-page";
import type { AccountsPayable } from "@/modules/purchases/payables/types";

export const metadata: Metadata = {
  title: "Cuentas por pagar",
  description: "Control de saldos pendientes y pagos a proveedores.",
};

export default async function PayablesRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let initialPayables: AccountsPayable[] = [];
  let initialError: string | null = null;

  try {
    initialPayables = session.businessId
      ? await listAccountsPayable(session.businessId)
      : [];
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar cuentas por pagar";
  }

  return (
    <PayablesPage
      initialPayables={initialPayables}
      initialError={initialError}
    />
  );
}
