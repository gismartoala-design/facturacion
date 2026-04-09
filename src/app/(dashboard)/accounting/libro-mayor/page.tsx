import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountingAccountPlan } from "@/core/accounting/account-plan.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingLedgerPage } from "@/modules/accounting/accounting-ledger/pages/accounting-ledger-page";
import type { LedgerAccountOption } from "@/modules/accounting/accounting-ledger/components/accounting-ledger-view-model";
import { serializeForClient } from "@/modules/accounting/lib/serialize-for-client";

export const metadata: Metadata = {
  title: "Libro Mayor",
  description: "Consulta de movimientos, saldos y acumulados por cuenta contable.",
};

export default async function AccountingLedgerRoutePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialAccounts: LedgerAccountOption[] = [];
  let initialError: string | null = null;

  try {
    const plan = await getAccountingAccountPlan(business.id);
    initialAccounts = serializeForClient(
      plan.accounts.filter((account) => account.active),
    ) as LedgerAccountOption[];
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el plan de cuentas";
  }

  return (
    <AccountingLedgerPage
      initialAccounts={initialAccounts}
      initialError={initialError}
    />
  );
}
