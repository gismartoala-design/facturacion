import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTrialBalanceByBusiness } from "@/core/accounting/accounting-report.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingTrialBalancePage } from "@/modules/accounting/trial-balance/components/accounting-trial-balance-page";
import type { AccountingTrialBalanceResponse } from "@/modules/accounting/trial-balance/types";
import { serializeForClient } from "@/modules/accounting/shared/serialize-for-client";

export const metadata: Metadata = {
  title: "Balance de Comprobación",
  description: "Validacion de saldos por cuenta para revisar el equilibrio contable del periodo.",
};

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialTrialBalanceFilters() {
  const now = new Date();

  return {
    from: formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatInputDate(now),
    onlyPostable: true,
    includeZeroBalances: false,
    includeInactive: false,
  };
}

export default async function AccountingTrialBalanceRoutePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialReport: AccountingTrialBalanceResponse | null = null;
  let initialError: string | null = null;

  try {
    initialReport = serializeForClient(
      await getTrialBalanceByBusiness(business.id, createInitialTrialBalanceFilters()),
    );
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el balance de comprobacion";
  }

  return (
    <AccountingTrialBalancePage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
