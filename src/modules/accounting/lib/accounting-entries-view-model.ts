import type { AccountingAccountPlanOverview } from "@/core/accounting/types";

import type { SerializeForClient } from "./serialize-for-client";

export type AccountPlanResponse = SerializeForClient<AccountingAccountPlanOverview>;

export type EntryAccountOption = Pick<
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
  | "description"
  | "system"
  | "active"
>;
