import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getAccountingAccountPlan } from "@/core/accounting/account-plan.service";
import { getSession } from "@/lib/auth";
import { AccountPlanPage } from "@/modules/accounting/account-plan/pages/account-plan-page";
import type { AccountPlanResponse } from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";
import { serializeForClient } from "@/modules/accounting/lib/serialize-for-client";

export const metadata: Metadata = {
  title: "Plan de Cuentas",
  description: "Registro y mantenimiento del plan de cuentas contables.",
};

export default async function AccountingAccountPlanPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialData: AccountPlanResponse | null = null;
  let initialError: string | null = null;

  try {
    initialData = serializeForClient(await getAccountingAccountPlan(business.id));
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el plan de cuentas";
  }

  return <AccountPlanPage initialData={initialData} initialError={initialError} />;
}
