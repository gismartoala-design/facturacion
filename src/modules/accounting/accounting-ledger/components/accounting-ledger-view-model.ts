import type { AccountingLedgerOverview } from "@/core/accounting/types";

import type { AccountPlanResponse } from "./account-plan-view-model";
import type { SerializeForClient } from "../../lib/serialize-for-client";

export type LedgerAccountOption = Pick<
  AccountPlanResponse["accounts"][number],
  | "id"
  | "code"
  | "name"
  | "groupKey"
  | "groupLabel"
  | "parentCode"
  | "level"
  | "acceptsPostings"
  | "defaultNature"
  | "active"
>;

export type AccountingLedgerResponse = SerializeForClient<AccountingLedgerOverview>;

export type AccountingLedgerGridRow = AccountingLedgerResponse["rows"][number] & {
  postedLabel: string;
  sourceLabel: string;
};
