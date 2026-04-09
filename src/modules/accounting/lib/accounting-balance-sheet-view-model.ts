import type {
  AccountingBalanceSheetOverview,
  AccountingBalanceSheetSection,
} from "@/core/accounting/types";

import type { SerializeForClient } from "./serialize-for-client";

export type AccountingBalanceSheetResponse =
  SerializeForClient<AccountingBalanceSheetOverview>;

export type BalanceSheetSection =
  SerializeForClient<AccountingBalanceSheetSection>;

export type BalanceSheetRow = BalanceSheetSection["rows"][number];
