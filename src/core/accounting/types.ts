import type { AccountingEntryStatus, AccountingSourceType } from "@prisma/client";

export type AccountingEntryLineSummary = {
  id: string;
  entryId: string;
  accountCode: string;
  debit: number;
  credit: number;
  memo: string | null;
  createdAt: Date;
};

export type AccountingEntrySummary = {
  id: string;
  businessId: string;
  sourceType: AccountingSourceType;
  sourceId: string;
  status: AccountingEntryStatus;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: AccountingEntryLineSummary[];
};
