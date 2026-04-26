import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountingAccountPlan } from "@/core/accounting/account-plan.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingEntriesPage } from "@/modules/accounting/entries/components/accounting-entries-page";
import type { EntryAccountOption } from "@/modules/accounting/entries/types";
import { serializeForClient } from "@/modules/accounting/shared/serialize-for-client";

export const metadata: Metadata = {
  title: "Asientos Contables",
  description: "Registro manual de asientos contables con validacion por plan de cuentas.",
};

export default async function AccountingEntriesPageRoute() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialAccounts: EntryAccountOption[] = [];
  let initialError: string | null = null;

  try {
    const plan = await getAccountingAccountPlan(business.id);
    initialAccounts = serializeForClient(
      plan.accounts.filter((account) => account.active),
    ) as EntryAccountOption[];
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el modulo de asientos contables";
  }

  return (
    <AccountingEntriesPage
      initialAccounts={initialAccounts}
      initialError={initialError}
    />
  );
}
