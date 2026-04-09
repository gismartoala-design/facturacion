import type {
  AccountingAccountGroupKey,
  AccountingAccountNature,
  AccountingEntryStatus,
  AccountingSourceType,
} from "@prisma/client";

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
  entryNumber: number | null;
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

export type AccountingLedgerRow = {
  lineId: string;
  entryId: string;
  postedAt: Date;
  createdAt: Date;
  sourceType: AccountingSourceType;
  sourceId: string;
  source: AccountingEntrySourceSummary;
  debit: number;
  credit: number;
  memo: string | null;
  runningBalance: number;
};

export type AccountingLedgerAccountSummary = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  groupKey: AccountingAccountGroupKey;
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  parentCode: string | null;
  level: number;
  acceptsPostings: boolean;
  active: boolean;
};

export type AccountingLedgerOverview = {
  filters: {
    accountCode: string;
    from: string | null;
    to: string | null;
    limit: number;
  };
  account: AccountingLedgerAccountSummary;
  summary: {
    openingBalance: number;
    debitTotal: number;
    creditTotal: number;
    closingBalance: number;
    movementCount: number;
  };
  rows: AccountingLedgerRow[];
};

export type AccountingTrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  groupKey: AccountingAccountGroupKey;
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  parentCode: string | null;
  level: number;
  acceptsPostings: boolean;
  active: boolean;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
};

export type AccountingTrialBalanceOverview = {
  filters: {
    from: string | null;
    to: string | null;
    onlyPostable: boolean;
    includeZeroBalances: boolean;
    includeInactive: boolean;
  };
  summary: {
    accountCount: number;
    openingBalanceTotal: number;
    debitTotal: number;
    creditTotal: number;
    closingBalanceTotal: number;
  };
  rows: AccountingTrialBalanceRow[];
};

export type AccountingBalanceSheetRow = {
  accountId: string;
  code: string;
  name: string;
  groupKey: AccountingAccountGroupKey;
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  parentCode: string | null;
  level: number;
  acceptsPostings: boolean;
  active: boolean;
  ownBalance: number;
  balance: number;
};

export type AccountingBalanceSheetSection = {
  groupKey: "ASSET" | "LIABILITY" | "EQUITY";
  groupLabel: string;
  total: number;
  rows: AccountingBalanceSheetRow[];
};

export type AccountingBalanceSheetOverview = {
  filters: {
    to: string | null;
    includeZeroBalances: boolean;
    includeInactive: boolean;
  };
  summary: {
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
    equationDifference: number;
  };
  sections: AccountingBalanceSheetSection[];
};

export type AccountingIncomeStatementRow = {
  accountId: string;
  code: string;
  name: string;
  groupKey: "INCOME" | "EXPENSE";
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  parentCode: string | null;
  level: number;
  acceptsPostings: boolean;
  active: boolean;
  ownBalance: number;
  balance: number;
};

export type AccountingIncomeStatementSection = {
  key:
    | "OPERATING_INCOME"
    | "OTHER_INCOME"
    | "COST_OF_SALES"
    | "OPERATING_EXPENSES";
  label: string;
  total: number;
  rows: AccountingIncomeStatementRow[];
};

export type AccountingIncomeStatementOverview = {
  filters: {
    from: string | null;
    to: string | null;
    includeZeroBalances: boolean;
    includeInactive: boolean;
  };
  summary: {
    operatingIncomeTotal: number;
    otherIncomeTotal: number;
    costOfSalesTotal: number;
    operatingExpensesTotal: number;
    grossProfit: number;
    operatingResult: number;
    netResult: number;
  };
  sections: AccountingIncomeStatementSection[];
};

export type AccountingAccountPlanRow = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  groupKey: AccountingAccountGroupKey;
  groupLabel: string;
  defaultNature: AccountingAccountNature;
  parentId: string | null;
  parentCode: string | null;
  level: number;
  acceptsPostings: boolean;
  system: boolean;
  active: boolean;
  description: string | null;
  usageCount: number;
  ownDebitTotal: number;
  ownCreditTotal: number;
  rollupDebitTotal: number;
  rollupCreditTotal: number;
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

export type AccountingAccountImportResult = {
  summary: {
    received: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  createdCodes: string[];
  updatedCodes: string[];
  skipped: Array<{
    code: string;
    reason: string;
  }>;
  errors: Array<{
    code: string;
    reason: string;
  }>;
};
