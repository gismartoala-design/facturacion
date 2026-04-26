import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getIncomeStatementByBusiness } from "@/core/accounting/accounting-report.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingIncomeStatementPage } from "@/modules/accounting/income-statement/components/accounting-income-statement-page";
import type { AccountingIncomeStatementResponse } from "@/modules/accounting/income-statement/types";
import { serializeForClient } from "@/modules/accounting/shared/serialize-for-client";

export const metadata: Metadata = {
  title: "Estado de Resultados",
  description: "Resultado del periodo a partir de ingresos, costos y gastos.",
};

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialIncomeStatementFilters() {
  const now = new Date();

  return {
    from: formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatInputDate(now),
    includeZeroBalances: false,
    includeInactive: false,
  };
}

export default async function AccountingIncomeStatementRoutePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialReport: AccountingIncomeStatementResponse | null = null;
  let initialError: string | null = null;

  try {
    initialReport = serializeForClient(
      await getIncomeStatementByBusiness(
        business.id,
        createInitialIncomeStatementFilters(),
      ),
    );
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el estado de resultados";
  }

  return (
    <AccountingIncomeStatementPage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
