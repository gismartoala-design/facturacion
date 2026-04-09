import type {
  AccountingAccountImportResult,
  AccountingAccountPlanOverview,
} from "@/core/accounting/types";

import type { SerializeForClient } from "../../lib/serialize-for-client";

export type AccountPlanResponse = SerializeForClient<AccountingAccountPlanOverview>;
export type AccountRow = AccountPlanResponse["accounts"][number];
export type AccountGroupKey = AccountRow["groupKey"];
export type AccountNature = AccountRow["defaultNature"];
export type AccountImportResponse = SerializeForClient<AccountingAccountImportResult>;
