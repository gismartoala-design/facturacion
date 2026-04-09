import type {
  AccountingIncomeStatementOverview,
  AccountingIncomeStatementSection,
} from "@/core/accounting/types";

import type { SerializeForClient } from "./serialize-for-client";

export type AccountingIncomeStatementResponse =
  SerializeForClient<AccountingIncomeStatementOverview>;

export type IncomeStatementSection =
  SerializeForClient<AccountingIncomeStatementSection>;

export type IncomeStatementRow = IncomeStatementSection["rows"][number];
