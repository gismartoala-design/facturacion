import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBalanceSheetByBusiness } from "@/core/accounting/accounting-report.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingBalanceSheetPage } from "@/modules/accounting/balance-sheet/components/accounting-balance-sheet-page";
import type { AccountingBalanceSheetResponse } from "@/modules/accounting/balance-sheet/types";
import { serializeForClient } from "@/modules/accounting/shared/serialize-for-client";

export const metadata: Metadata = {
  title: "Balance General",
  description: "Posicion financiera acumulada a una fecha de corte.",
};

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialBalanceSheetFilters() {
  return {
    to: formatInputDate(new Date()),
    includeZeroBalances: false,
    includeInactive: false,
  };
}

export default async function AccountingBalanceGeneralRoutePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialReport: AccountingBalanceSheetResponse | null = null;
  let initialError: string | null = null;

  try {
    initialReport = serializeForClient(
      await getBalanceSheetByBusiness(
        business.id,
        createInitialBalanceSheetFilters(),
      ),
    );
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudo cargar el balance general";
  }

  return (
    <AccountingBalanceSheetPage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
