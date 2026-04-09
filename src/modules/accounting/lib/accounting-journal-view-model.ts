import type { AccountingEntriesOverview } from "@/core/accounting/types";

import type { SerializeForClient } from "./serialize-for-client";

export type AccountingJournalResponse = SerializeForClient<AccountingEntriesOverview>;
export type AccountingJournalRow = AccountingJournalResponse["rows"][number];
export type AccountingEntryLine = AccountingJournalRow["lines"][number];

export type AccountingJournalGridRow = AccountingJournalRow & {
  postedLabel: string;
  sourceLabel: string;
  sourceSummary: string;
};
