import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listAccountingEntriesByBusiness } from "@/core/accounting/accounting-entry.service";
import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getSession } from "@/lib/auth";
import { AccountingJournalPage } from "@/modules/accounting/components/accounting-journal-page";
import type { AccountingJournalResponse } from "@/modules/accounting/lib/accounting-journal-view-model";
import { serializeForClient } from "@/modules/accounting/lib/serialize-for-client";

export const metadata: Metadata = {
  title: "Libro Diario",
  description: "Consulta cronologica de asientos posteados con detalle y origen.",
};

function formatInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialJournalFilters() {
  const now = new Date();

  return {
    status: "POSTED" as const,
    from: formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatInputDate(now),
    limit: 100,
  };
}

export default async function AccountingJournalRoutePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const business = session.businessId
    ? await getBusinessContextById(session.businessId)
    : await ensureDefaultBusiness();

  let initialReport: AccountingJournalResponse | null = null;
  let initialError: string | null = null;

  try {
    initialReport = serializeForClient(
      await listAccountingEntriesByBusiness(business.id, createInitialJournalFilters()),
    );
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "No se pudo cargar el libro diario";
  }

  return (
    <AccountingJournalPage
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
