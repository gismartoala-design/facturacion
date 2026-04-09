import { AccountingAccountNature, AccountingEntryStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ensureAccountingAccountsSeeded } from "./account-plan.service";
import {
  balanceSheetFiltersSchema,
  incomeStatementFiltersSchema,
  accountTrialBalanceFiltersSchema,
  type BalanceSheetFilters,
  type IncomeStatementFilters,
  type AccountTrialBalanceFilters,
} from "./schemas";
import type {
  AccountingBalanceSheetOverview,
  AccountingBalanceSheetRow,
  AccountingIncomeStatementOverview,
  AccountingIncomeStatementRow,
  AccountingTrialBalanceOverview,
  AccountingTrialBalanceRow,
} from "./types";

const ACCOUNT_GROUP_LABELS: Record<string, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  INCOME: "Ingresos",
  EXPENSE: "Gastos",
};

function toDateBoundary(value: string | undefined, endOfDay: boolean) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha invalida: ${value}`);
  }

  return date;
}

function buildBalance(params: {
  defaultNature: AccountingAccountNature;
  debit: number;
  credit: number;
}) {
  return params.defaultNature === AccountingAccountNature.DEBIT
    ? params.debit - params.credit
    : params.credit - params.debit;
}

function hasMeaningfulAmount(value: number) {
  return Math.abs(value) > 0.0001;
}

export async function getTrialBalanceByBusiness(
  businessId: string,
  rawFilters: unknown = {},
): Promise<AccountingTrialBalanceOverview> {
  const filters: AccountTrialBalanceFilters =
    accountTrialBalanceFiltersSchema.parse(rawFilters);
  const from = toDateBoundary(filters.from, false);
  const to = toDateBoundary(filters.to, true);

  await ensureAccountingAccountsSeeded(businessId);

  const [accounts, openingEntries, periodEntries] = await Promise.all([
    prisma.accountingAccount.findMany({
      where: {
        businessId,
        ...(filters.includeInactive ? {} : { active: true }),
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
      orderBy: [{ code: "asc" }],
    }),
    from
      ? prisma.accountingEntry.findMany({
          where: {
            businessId,
            status: AccountingEntryStatus.POSTED,
            postedAt: { lt: from },
          },
          select: {
            lines: {
              select: {
                accountCode: true,
                debit: true,
                credit: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.accountingEntry.findMany({
      where: {
        businessId,
        status: AccountingEntryStatus.POSTED,
        ...(from || to
          ? {
              postedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      select: {
        lines: {
          select: {
            accountCode: true,
            debit: true,
            credit: true,
          },
        },
      },
    }),
  ]);

  const metrics = new Map<
    string,
    {
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
    }
  >();

  for (const account of accounts) {
    metrics.set(account.code, {
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
    });
  }

  for (const entry of openingEntries) {
    for (const line of entry.lines) {
      const current = metrics.get(line.accountCode);
      if (!current) continue;
      current.openingDebit += Number(line.debit);
      current.openingCredit += Number(line.credit);
    }
  }

  for (const entry of periodEntries) {
    for (const line of entry.lines) {
      const current = metrics.get(line.accountCode);
      if (!current) continue;
      current.periodDebit += Number(line.debit);
      current.periodCredit += Number(line.credit);
    }
  }

  const rows = accounts
    .map<AccountingTrialBalanceRow>((account) => {
      const accountMetrics = metrics.get(account.code) ?? {
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
      };

      const openingBalance = buildBalance({
        defaultNature: account.defaultNature,
        debit: accountMetrics.openingDebit,
        credit: accountMetrics.openingCredit,
      });
      const closingBalance = buildBalance({
        defaultNature: account.defaultNature,
        debit: accountMetrics.openingDebit + accountMetrics.periodDebit,
        credit: accountMetrics.openingCredit + accountMetrics.periodCredit,
      });

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey,
        groupLabel: ACCOUNT_GROUP_LABELS[account.groupKey] ?? account.groupKey,
        defaultNature: account.defaultNature,
        parentCode: account.parent?.code ?? null,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        active: account.active,
        openingBalance,
        debitTotal: accountMetrics.periodDebit,
        creditTotal: accountMetrics.periodCredit,
        closingBalance,
      };
    })
    .filter((row) => {
      if (filters.onlyPostable && !row.acceptsPostings) {
        return false;
      }

      if (filters.includeZeroBalances) {
        return true;
      }

      return (
        hasMeaningfulAmount(row.openingBalance) ||
        hasMeaningfulAmount(row.debitTotal) ||
        hasMeaningfulAmount(row.creditTotal) ||
        hasMeaningfulAmount(row.closingBalance)
      );
    });

  const summary = rows.reduce(
    (acc, row) => {
      acc.accountCount += 1;
      acc.openingBalanceTotal += row.openingBalance;
      acc.debitTotal += row.debitTotal;
      acc.creditTotal += row.creditTotal;
      acc.closingBalanceTotal += row.closingBalance;
      return acc;
    },
    {
      accountCount: 0,
      openingBalanceTotal: 0,
      debitTotal: 0,
      creditTotal: 0,
      closingBalanceTotal: 0,
    },
  );

  return {
    filters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      onlyPostable: filters.onlyPostable,
      includeZeroBalances: filters.includeZeroBalances,
      includeInactive: filters.includeInactive,
    },
    summary,
    rows,
  };
}

export async function getBalanceSheetByBusiness(
  businessId: string,
  rawFilters: unknown = {},
): Promise<AccountingBalanceSheetOverview> {
  const filters: BalanceSheetFilters = balanceSheetFiltersSchema.parse(rawFilters);
  const to = toDateBoundary(filters.to, true);

  await ensureAccountingAccountsSeeded(businessId);

  const [accounts, entries] = await Promise.all([
    prisma.accountingAccount.findMany({
      where: {
        businessId,
        groupKey: { in: ["ASSET", "LIABILITY", "EQUITY"] },
        ...(filters.includeInactive ? {} : { active: true }),
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
      orderBy: [{ code: "asc" }],
    }),
    prisma.accountingEntry.findMany({
      where: {
        businessId,
        status: AccountingEntryStatus.POSTED,
        ...(to ? { postedAt: { lte: to } } : {}),
      },
      select: {
        lines: {
          select: {
            accountCode: true,
            debit: true,
            credit: true,
          },
        },
      },
    }),
  ]);

  const stats = new Map<
    string,
    {
      ownDebit: number;
      ownCredit: number;
      rollupDebit: number;
      rollupCredit: number;
    }
  >();

  for (const account of accounts) {
    stats.set(account.code, {
      ownDebit: 0,
      ownCredit: 0,
      rollupDebit: 0,
      rollupCredit: 0,
    });
  }

  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = stats.get(line.accountCode);
      if (!current) continue;

      current.ownDebit += Number(line.debit);
      current.ownCredit += Number(line.credit);
      current.rollupDebit += Number(line.debit);
      current.rollupCredit += Number(line.credit);
    }
  }

  const orderedDescending = [...accounts].sort(
    (a, b) => b.level - a.level || b.code.localeCompare(a.code),
  );

  for (const account of orderedDescending) {
    if (!account.parent?.code) {
      continue;
    }

    const current = stats.get(account.code);
    const parent = stats.get(account.parent.code);

    if (!current || !parent) {
      continue;
    }

    parent.rollupDebit += current.rollupDebit;
    parent.rollupCredit += current.rollupCredit;
  }

  const rows = accounts
    .map<AccountingBalanceSheetRow>((account) => {
      const accountStats = stats.get(account.code) ?? {
        ownDebit: 0,
        ownCredit: 0,
        rollupDebit: 0,
        rollupCredit: 0,
      };

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey,
        groupLabel: ACCOUNT_GROUP_LABELS[account.groupKey] ?? account.groupKey,
        defaultNature: account.defaultNature,
        parentCode: account.parent?.code ?? null,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        active: account.active,
        ownBalance: buildBalance({
          defaultNature: account.defaultNature,
          debit: accountStats.ownDebit,
          credit: accountStats.ownCredit,
        }),
        balance: buildBalance({
          defaultNature: account.defaultNature,
          debit: accountStats.rollupDebit,
          credit: accountStats.rollupCredit,
        }),
      };
    })
    .filter((row) => filters.includeZeroBalances || hasMeaningfulAmount(row.balance));

  const sections = (["ASSET", "LIABILITY", "EQUITY"] as const).map((groupKey) => {
    const groupRows = rows.filter((row) => row.groupKey === groupKey);
    const total = groupRows
      .filter((row) => row.level === 1)
      .reduce((acc, row) => acc + row.balance, 0);

    return {
      groupKey,
      groupLabel: ACCOUNT_GROUP_LABELS[groupKey] ?? groupKey,
      total,
      rows: groupRows,
    };
  });

  const assetsTotal =
    sections.find((section) => section.groupKey === "ASSET")?.total ?? 0;
  const liabilitiesTotal =
    sections.find((section) => section.groupKey === "LIABILITY")?.total ?? 0;
  const equityTotal =
    sections.find((section) => section.groupKey === "EQUITY")?.total ?? 0;

  return {
    filters: {
      to: filters.to ?? null,
      includeZeroBalances: filters.includeZeroBalances,
      includeInactive: filters.includeInactive,
    },
    summary: {
      assetsTotal,
      liabilitiesTotal,
      equityTotal,
      equationDifference: assetsTotal - liabilitiesTotal - equityTotal,
    },
    sections,
  };
}

export async function getIncomeStatementByBusiness(
  businessId: string,
  rawFilters: unknown = {},
): Promise<AccountingIncomeStatementOverview> {
  const filters: IncomeStatementFilters =
    incomeStatementFiltersSchema.parse(rawFilters);
  const from = toDateBoundary(filters.from, false);
  const to = toDateBoundary(filters.to, true);

  await ensureAccountingAccountsSeeded(businessId);

  const [accounts, entries] = await Promise.all([
    prisma.accountingAccount.findMany({
      where: {
        businessId,
        groupKey: { in: ["INCOME", "EXPENSE"] },
        ...(filters.includeInactive ? {} : { active: true }),
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
      orderBy: [{ code: "asc" }],
    }),
    prisma.accountingEntry.findMany({
      where: {
        businessId,
        status: AccountingEntryStatus.POSTED,
        ...(from || to
          ? {
              postedAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      select: {
        lines: {
          select: {
            accountCode: true,
            debit: true,
            credit: true,
          },
        },
      },
    }),
  ]);

  const stats = new Map<
    string,
    {
      ownDebit: number;
      ownCredit: number;
      rollupDebit: number;
      rollupCredit: number;
    }
  >();

  for (const account of accounts) {
    stats.set(account.code, {
      ownDebit: 0,
      ownCredit: 0,
      rollupDebit: 0,
      rollupCredit: 0,
    });
  }

  for (const entry of entries) {
    for (const line of entry.lines) {
      const current = stats.get(line.accountCode);
      if (!current) continue;

      current.ownDebit += Number(line.debit);
      current.ownCredit += Number(line.credit);
      current.rollupDebit += Number(line.debit);
      current.rollupCredit += Number(line.credit);
    }
  }

  const orderedDescending = [...accounts].sort(
    (a, b) => b.level - a.level || b.code.localeCompare(a.code),
  );

  for (const account of orderedDescending) {
    if (!account.parent?.code) {
      continue;
    }

    const current = stats.get(account.code);
    const parent = stats.get(account.parent.code);

    if (!current || !parent) {
      continue;
    }

    parent.rollupDebit += current.rollupDebit;
    parent.rollupCredit += current.rollupCredit;
  }

  const rows = accounts
    .map<AccountingIncomeStatementRow>((account) => {
      const accountStats = stats.get(account.code) ?? {
        ownDebit: 0,
        ownCredit: 0,
        rollupDebit: 0,
        rollupCredit: 0,
      };

      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey as AccountingIncomeStatementRow["groupKey"],
        groupLabel: ACCOUNT_GROUP_LABELS[account.groupKey] ?? account.groupKey,
        defaultNature: account.defaultNature,
        parentCode: account.parent?.code ?? null,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        active: account.active,
        ownBalance: buildBalance({
          defaultNature: account.defaultNature,
          debit: accountStats.ownDebit,
          credit: accountStats.ownCredit,
        }),
        balance: buildBalance({
          defaultNature: account.defaultNature,
          debit: accountStats.rollupDebit,
          credit: accountStats.rollupCredit,
        }),
      };
    })
    .filter((row) => filters.includeZeroBalances || hasMeaningfulAmount(row.balance));

  const sectionConfigs = [
    {
      key: "OPERATING_INCOME" as const,
      label: "Ingresos operacionales",
      match: (row: AccountingIncomeStatementRow) => row.code === "41" || row.code.startsWith("41"),
    },
    {
      key: "OTHER_INCOME" as const,
      label: "Otros ingresos",
      match: (row: AccountingIncomeStatementRow) => row.code === "42" || row.code.startsWith("42"),
    },
    {
      key: "COST_OF_SALES" as const,
      label: "Costo de ventas",
      match: (row: AccountingIncomeStatementRow) => row.code === "52" || row.code.startsWith("52"),
    },
    {
      key: "OPERATING_EXPENSES" as const,
      label: "Gastos operativos",
      match: (row: AccountingIncomeStatementRow) => row.code === "51" || row.code.startsWith("51"),
    },
  ];

  const sections = sectionConfigs.map((section) => {
    const sectionRows = rows.filter(section.match);
    const total = sectionRows
      .filter((row) => row.level === 2 || (section.key === "COST_OF_SALES" && row.level === 2))
      .reduce((acc, row) => acc + row.balance, 0);

    return {
      key: section.key,
      label: section.label,
      total,
      rows: sectionRows,
    };
  });

  const operatingIncomeTotal =
    sections.find((section) => section.key === "OPERATING_INCOME")?.total ?? 0;
  const otherIncomeTotal =
    sections.find((section) => section.key === "OTHER_INCOME")?.total ?? 0;
  const costOfSalesTotal =
    sections.find((section) => section.key === "COST_OF_SALES")?.total ?? 0;
  const operatingExpensesTotal =
    sections.find((section) => section.key === "OPERATING_EXPENSES")?.total ?? 0;

  const grossProfit = operatingIncomeTotal - costOfSalesTotal;
  const operatingResult = grossProfit - operatingExpensesTotal;
  const netResult = operatingResult + otherIncomeTotal;

  return {
    filters: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      includeZeroBalances: filters.includeZeroBalances,
      includeInactive: filters.includeInactive,
    },
    summary: {
      operatingIncomeTotal,
      otherIncomeTotal,
      costOfSalesTotal,
      operatingExpensesTotal,
      grossProfit,
      operatingResult,
      netResult,
    },
    sections,
  };
}
