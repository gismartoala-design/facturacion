import type { AccountingTrialBalanceOverview } from "@/core/accounting/types";

import type { SerializeForClient } from "./serialize-for-client";

export type AccountingTrialBalanceResponse =
  SerializeForClient<AccountingTrialBalanceOverview>;

export type AccountingTrialBalanceRow =
  AccountingTrialBalanceResponse["rows"][number];
