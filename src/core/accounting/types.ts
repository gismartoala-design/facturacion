import type { AccountingEntryStatus, AccountingSourceType } from "@prisma/client";

import type {
  AccountingAccountCatalogItem,
  AccountingAccountGroupKey,
  AccountingAccountNature,
} from "./chart-of-accounts";

export type AccountingEntryLineSummary = {
  id: string;
  entryId: string;
  accountCode: string;
  accountName: string | null;
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
  debitTotal: number;
  creditTotal: number;
  balanceDifference: number;
  lineCount: number;
  lines: AccountingEntryLineSummary[];
};

export type AccountingEntrySourceSummary = {
  title: string;
  subtitle: string | null;
};

export type AccountingEntryListItem = AccountingEntrySummary & {
  accountCodes: string[];
  source: AccountingEntrySourceSummary;
};

export type AccountingEntriesOverview = {
  filters: {
    status: AccountingEntryStatus | null;
    sourceType: AccountingSourceType | null;
    from: string | null;
    to: string | null;
    limit: number;
  };
  summary: {
    entryCount: number;
    postedCount: number;
    draftCount: number;
    reversedCount: number;
    debitTotal: number;
    creditTotal: number;
    balanceDifference: number;
  };
  rows: AccountingEntryListItem[];
};

export type AccountingAccountPlanRow = AccountingAccountCatalogItem & {
  usageCount: number;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  lastPostedAt: Date | null;
};

export type AccountingAccountPlanGroupSummary = {
  groupKey: AccountingAccountGroupKey;
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  configuredAccounts: number;
  activeAccounts: number;
  debitTotal: number;
  creditTotal: number;
};

export type AccountingAccountPlanOverview = {
  summary: {
    configuredAccounts: number;
    postableAccounts: number;
    activeAccounts: number;
    debitTotal: number;
    creditTotal: number;
  };
  groups: AccountingAccountPlanGroupSummary[];
  accounts: AccountingAccountPlanRow[];
};
