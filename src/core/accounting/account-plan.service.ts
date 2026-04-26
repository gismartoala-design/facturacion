import {
  AccountingAccountGroupKey,
  AccountingAccountNature,
  AccountingEntryStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createAccountingAccountSchema,
  importAccountingAccountsSchema,
  updateAccountingAccountSchema,
  type CreateAccountingAccountInput,
  type ImportAccountingAccountsInput,
  type UpdateAccountingAccountInput,
} from "./schemas";
import type {
  AccountingAccountImportResult,
  AccountingAccountPlanGroupSummary,
  AccountingAccountPlanOverview,
  AccountingAccountPlanRow,
} from "./types";
import { ACCOUNTING_CHART } from "./chart-of-accounts";

type DbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

const GROUP_LABELS: Record<AccountingAccountGroupKey, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  INCOME: "Ingresos",
  EXPENSE: "Gastos",
};

function computeLevel(parentLevel?: number | null) {
  return parentLevel ? parentLevel + 1 : 1;
}

function buildAccountBalance(params: {
  defaultNature: AccountingAccountNature;
  debit: number;
  credit: number;
}) {
  return params.defaultNature === AccountingAccountNature.DEBIT
    ? params.debit - params.credit
    : params.credit - params.debit;
}

function normalizeNullableText(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

function normalizeParentCode(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

async function ensureUniqueCode(
  tx: DbClient,
  businessId: string,
  code: string,
  excludeId?: string,
) {
  const existing = await tx.accountingAccount.findFirst({
    where: {
      businessId,
      code,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(`Ya existe una cuenta contable con el codigo ${code}`);
  }
}

async function resolveParentAccount(
  tx: DbClient,
  businessId: string,
  parentId?: string | null,
) {
  if (!parentId) {
    return null;
  }

  const parent = await tx.accountingAccount.findFirst({
    where: {
      id: parentId,
      businessId,
    },
  });

  if (!parent) {
    throw new Error("La cuenta padre indicada no existe para este negocio");
  }

  return parent;
}

async function collectDescendantIds(
  tx: DbClient,
  businessId: string,
  rootId: string,
) {
  const descendants = new Set<string>();
  let frontier = [rootId];

  while (frontier.length > 0) {
    const children = await tx.accountingAccount.findMany({
      where: {
        businessId,
        parentId: { in: frontier },
      },
      select: {
        id: true,
      },
    });

    frontier = children
      .map((child) => child.id)
      .filter((childId) => !descendants.has(childId));

    for (const childId of frontier) {
      descendants.add(childId);
    }
  }

  return descendants;
}

async function assertParentAssignmentAllowed(
  tx: DbClient,
  businessId: string,
  accountId: string,
  parentId?: string | null,
) {
  if (!parentId) {
    return;
  }

  if (parentId === accountId) {
    throw new Error("Una cuenta no puede ser padre de si misma");
  }

  const descendantIds = await collectDescendantIds(tx, businessId, accountId);
  if (descendantIds.has(parentId)) {
    throw new Error(
      "No se puede asignar como padre una cuenta descendiente de la cuenta actual",
    );
  }
}

async function syncDescendantLevels(
  tx: DbClient,
  businessId: string,
  rootId: string,
) {
  const root = await tx.accountingAccount.findFirst({
    where: {
      id: rootId,
      businessId,
    },
    select: {
      id: true,
      level: true,
    },
  });

  if (!root) {
    return;
  }

  let frontier = [root];

  while (frontier.length > 0) {
    const nextLevelParents = frontier.map((item) => item.id);
    const children = await tx.accountingAccount.findMany({
      where: {
        businessId,
        parentId: { in: nextLevelParents },
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (children.length === 0) {
      return;
    }

    const parentLevelMap = new Map(frontier.map((item) => [item.id, item.level]));
    const nextFrontier: Array<{ id: string; level: number }> = [];

    for (const child of children) {
      const parentLevel = child.parentId ? parentLevelMap.get(child.parentId) : null;
      const level = computeLevel(parentLevel);

      await tx.accountingAccount.update({
        where: { id: child.id },
        data: { level },
      });

      nextFrontier.push({
        id: child.id,
        level,
      });
    }

    frontier = nextFrontier;
  }
}

function toPlanRow(
  raw: {
    id: string;
    businessId: string;
    code: string;
    name: string;
    groupKey: AccountingAccountGroupKey;
    defaultNature: AccountingAccountNature;
    parentId: string | null;
    parent?: { code: string } | null;
    level: number;
    acceptsPostings: boolean;
    system: boolean;
    active: boolean;
    description: string | null;
  },
  stats?: {
    usageCount: number;
    ownDebitTotal: number;
    ownCreditTotal: number;
    rollupDebitTotal: number;
    rollupCreditTotal: number;
    lastPostedAt: Date | null;
  },
): AccountingAccountPlanRow {
  const ownDebitTotal = stats?.ownDebitTotal ?? 0;
  const ownCreditTotal = stats?.ownCreditTotal ?? 0;
  const rollupDebitTotal = stats?.rollupDebitTotal ?? 0;
  const rollupCreditTotal = stats?.rollupCreditTotal ?? 0;

  return {
    id: raw.id,
    businessId: raw.businessId,
    code: raw.code,
    name: raw.name,
    groupKey: raw.groupKey,
    groupLabel: GROUP_LABELS[raw.groupKey],
    defaultNature: raw.defaultNature,
    parentId: raw.parentId,
    parentCode: raw.parent?.code ?? null,
    level: raw.level,
    acceptsPostings: raw.acceptsPostings,
    system: raw.system,
    active: raw.active,
    description: raw.description,
    usageCount: stats?.usageCount ?? 0,
    ownDebitTotal,
    ownCreditTotal,
    rollupDebitTotal,
    rollupCreditTotal,
    balance: buildAccountBalance({
      defaultNature: raw.defaultNature,
      debit: rollupDebitTotal,
      credit: rollupCreditTotal,
    }),
    lastPostedAt: stats?.lastPostedAt ?? null,
  };
}

export async function ensureAccountingAccountsSeededInTransaction(
  tx: DbClient,
  businessId: string,
) {
  const existingAccount = await tx.accountingAccount.findFirst({
    where: { businessId },
    select: { id: true },
  });

  if (existingAccount) {
    return;
  }

  const sortedChart = [...ACCOUNTING_CHART].sort(
    (a, b) => a.level - b.level || a.code.localeCompare(b.code),
  );
  const codeToId = new Map<string, string>();
  const levels = [...new Set(sortedChart.map((account) => account.level))].sort(
    (a, b) => a - b,
  );

  for (const level of levels) {
    const accountsAtLevel = sortedChart.filter((account) => account.level === level);
    const rows = accountsAtLevel.map((account) => {
      const parentId = account.parentCode ? (codeToId.get(account.parentCode) ?? null) : null;

      if (account.parentCode && !parentId) {
        throw new Error(
          `No se pudo resolver la cuenta padre ${account.parentCode} para la cuenta ${account.code}`,
        );
      }

      return {
        businessId,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey as AccountingAccountGroupKey,
        defaultNature: account.defaultNature as AccountingAccountNature,
        parentId,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        system: account.system,
        active: true,
        description: account.description,
      };
    });

    await tx.accountingAccount.createMany({
      data: rows,
      skipDuplicates: true,
    });

    const persistedRows = await tx.accountingAccount.findMany({
      where: {
        businessId,
        code: {
          in: accountsAtLevel.map((account) => account.code),
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    for (const account of persistedRows) {
      codeToId.set(account.code, account.id);
    }
  }
}

export async function ensureAccountingAccountsSeeded(businessId: string) {
  await prisma.$transaction((tx) =>
    ensureAccountingAccountsSeededInTransaction(tx, businessId),
  );
}

export async function getAccountingAccountByCodeInTransaction(
  tx: DbClient,
  businessId: string,
  code: string,
) {
  await ensureAccountingAccountsSeededInTransaction(tx, businessId);

  return tx.accountingAccount.findFirst({
    where: {
      businessId,
      code,
      active: true,
    },
  });
}

export async function getAccountingAccountNameMapByCodesInTransaction(
  tx: DbClient,
  businessId: string,
  codes: string[],
) {
  await ensureAccountingAccountsSeededInTransaction(tx, businessId);

  if (codes.length === 0) {
    return new Map<string, string>();
  }

  const accounts = await tx.accountingAccount.findMany({
    where: {
      businessId,
      code: { in: [...new Set(codes)] },
    },
    select: {
      code: true,
      name: true,
    },
  });

  return new Map(accounts.map((account) => [account.code, account.name]));
}

export async function listAccountingAccountsByBusiness(
  businessId: string,
  options?: {
    includeInactive?: boolean;
  },
) {
  await ensureAccountingAccountsSeeded(businessId);

  return prisma.accountingAccount.findMany({
    where: {
      businessId,
      ...(options?.includeInactive ? {} : { active: true }),
    },
    include: {
      parent: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [{ code: "asc" }],
  });
}

export async function getAccountingAccountPlan(
  businessId: string,
): Promise<AccountingAccountPlanOverview> {
  await ensureAccountingAccountsSeeded(businessId);

  const [accounts, postedEntries] = await Promise.all([
    prisma.accountingAccount.findMany({
      where: { businessId },
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
      },
      select: {
        postedAt: true,
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

  const directStats = new Map<
    string,
    {
      usageCount: number;
      ownDebitTotal: number;
      ownCreditTotal: number;
      rollupDebitTotal: number;
      rollupCreditTotal: number;
      lastPostedAt: Date | null;
    }
  >();

  for (const account of accounts) {
    directStats.set(account.code, {
      usageCount: 0,
      ownDebitTotal: 0,
      ownCreditTotal: 0,
      rollupDebitTotal: 0,
      rollupCreditTotal: 0,
      lastPostedAt: null,
    });
  }

  for (const entry of postedEntries) {
    for (const line of entry.lines) {
      const current = directStats.get(line.accountCode);
      if (!current) {
        continue;
      }

      current.usageCount += 1;
      current.ownDebitTotal += Number(line.debit);
      current.ownCreditTotal += Number(line.credit);
      current.rollupDebitTotal += Number(line.debit);
      current.rollupCreditTotal += Number(line.credit);
      current.lastPostedAt =
        !current.lastPostedAt ||
        (entry.postedAt && entry.postedAt > current.lastPostedAt)
          ? entry.postedAt
          : current.lastPostedAt;
    }
  }

  const accountsByCode = new Map(accounts.map((account) => [account.code, account]));
  const orderedDescending = [...accounts].sort(
    (a, b) => b.level - a.level || b.code.localeCompare(a.code),
  );

  for (const account of orderedDescending) {
    if (!account.parent?.code) {
      continue;
    }

    const current = directStats.get(account.code);
    const parent = directStats.get(account.parent.code);
    const parentAccount = accountsByCode.get(account.parent.code);

    if (!current || !parent || !parentAccount) {
      continue;
    }

    parent.rollupDebitTotal += current.rollupDebitTotal;
    parent.rollupCreditTotal += current.rollupCreditTotal;
    parent.lastPostedAt =
      !parent.lastPostedAt ||
      (current.lastPostedAt && current.lastPostedAt > parent.lastPostedAt)
        ? current.lastPostedAt
        : parent.lastPostedAt;
  }

  const rows = accounts.map((account) =>
    toPlanRow(account, directStats.get(account.code)),
  );

  const summary = rows.reduce(
    (acc, account) => {
      acc.configuredAccounts += 1;
      if (account.acceptsPostings) {
        acc.postableAccounts += 1;
      }
      if (account.active) {
        acc.activeAccounts += 1;
      }
      acc.debitTotal += account.ownDebitTotal;
      acc.creditTotal += account.ownCreditTotal;
      return acc;
    },
    {
      configuredAccounts: 0,
      postableAccounts: 0,
      activeAccounts: 0,
      debitTotal: 0,
      creditTotal: 0,
    },
  );

  const groups = rows.reduce<Map<string, AccountingAccountPlanGroupSummary>>(
    (acc, account) => {
      const current = acc.get(account.groupKey) ?? {
        groupKey: account.groupKey,
        groupLabel: account.groupLabel,
        defaultNature: account.defaultNature,
        configuredAccounts: 0,
        activeAccounts: 0,
        debitTotal: 0,
        creditTotal: 0,
      };

      current.configuredAccounts += 1;
      if (account.active) {
        current.activeAccounts += 1;
      }
      current.debitTotal += account.ownDebitTotal;
      current.creditTotal += account.ownCreditTotal;
      acc.set(account.groupKey, current);
      return acc;
    },
    new Map(),
  );

  return {
    summary,
    groups: [...groups.values()],
    accounts: rows,
  };
}

export async function importAccountingAccounts(
  businessId: string,
  rawInput: unknown,
): Promise<AccountingAccountImportResult> {
  const input: ImportAccountingAccountsInput =
    importAccountingAccountsSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    await ensureAccountingAccountsSeededInTransaction(tx, businessId);

    const existingAccounts = await tx.accountingAccount.findMany({
      where: { businessId },
      select: {
        id: true,
        businessId: true,
        code: true,
        groupKey: true,
        defaultNature: true,
        parentId: true,
        level: true,
        acceptsPostings: true,
        system: true,
        active: true,
      },
    });

    const codeToAccount = new Map(existingAccounts.map((account) => [account.code, account]));
    const createdCodes: string[] = [];
    const updatedCodes: string[] = [];
    const skipped: AccountingAccountImportResult["skipped"] = [];
    const errors: AccountingAccountImportResult["errors"] = [];
    const uniqueRows: ImportAccountingAccountsInput["rows"] = [];
    const seenCodes = new Set<string>();

    for (const row of input.rows) {
      const code = row.code.trim();
      if (seenCodes.has(code)) {
        errors.push({
          code,
          reason: "El archivo contiene mas de una fila con el mismo codigo",
        });
        continue;
      }

      seenCodes.add(code);
      uniqueRows.push({
        ...row,
        code,
        name: row.name.trim(),
        parentCode: normalizeParentCode(row.parentCode),
        description: normalizeNullableText(row.description),
      });
    }

    const importCodes = new Set(uniqueRows.map((row) => row.code));
    const processedCodes = new Set<string>();
    let pending = uniqueRows;

    while (pending.length > 0) {
      let progressed = false;
      const nextPending: typeof pending = [];

      for (const row of pending) {
        const parentCode = normalizeParentCode(row.parentCode);

        if (parentCode && parentCode === row.code) {
          errors.push({
            code: row.code,
            reason: "La cuenta no puede ser padre de si misma",
          });
          processedCodes.add(row.code);
          progressed = true;
          continue;
        }

        if (parentCode && importCodes.has(parentCode) && !processedCodes.has(parentCode)) {
          nextPending.push(row);
          continue;
        }

        const parent = parentCode ? codeToAccount.get(parentCode) ?? null : null;

        if (parentCode && !parent) {
          nextPending.push(row);
          continue;
        }

        try {
          if (parent && parent.groupKey !== row.groupKey) {
            throw new Error(
              "La cuenta hija debe pertenecer al mismo grupo que su cuenta padre",
            );
          }

          if (parent?.acceptsPostings) {
            throw new Error("La cuenta padre debe ser una cuenta de agrupacion");
          }

          const existing = codeToAccount.get(row.code) ?? null;

          if (existing) {
            if (existing.system) {
              skipped.push({
                code: row.code,
                reason: "La cuenta base del sistema se mantiene protegida",
              });
              processedCodes.add(row.code);
              progressed = true;
              continue;
            }

            if (!input.overwriteExisting) {
              skipped.push({
                code: row.code,
                reason: "La cuenta ya existe y la importacion no permite actualizarla",
              });
              processedCodes.add(row.code);
              progressed = true;
              continue;
            }

            await assertParentAssignmentAllowed(
              tx,
              businessId,
              existing.id,
              parent?.id ?? null,
            );

            const childCount = await tx.accountingAccount.count({
              where: {
                businessId,
                parentId: existing.id,
              },
            });

            if (childCount > 0 && row.acceptsPostings) {
              throw new Error(
                "Una cuenta con subcuentas no puede aceptar movimientos directos",
              );
            }

            if (childCount > 0 && existing.groupKey !== row.groupKey) {
              throw new Error(
                "No se puede cambiar el grupo de una cuenta que ya tiene subcuentas",
              );
            }

            const updated = await tx.accountingAccount.update({
              where: { id: existing.id },
              data: {
                name: row.name,
                groupKey: row.groupKey as AccountingAccountGroupKey,
                defaultNature: row.defaultNature as AccountingAccountNature,
                parentId: parent?.id ?? null,
                level: computeLevel(parent?.level),
                acceptsPostings: row.acceptsPostings,
                active: row.active,
                description: normalizeNullableText(row.description),
              },
            });

            await syncDescendantLevels(tx, businessId, updated.id);
            codeToAccount.set(updated.code, updated);
            updatedCodes.push(updated.code);
            processedCodes.add(row.code);
            progressed = true;
            continue;
          }

          const created = await tx.accountingAccount.create({
            data: {
              businessId,
              code: row.code,
              name: row.name,
              groupKey: row.groupKey as AccountingAccountGroupKey,
              defaultNature: row.defaultNature as AccountingAccountNature,
              parentId: parent?.id ?? null,
              level: computeLevel(parent?.level),
              acceptsPostings: row.acceptsPostings,
              active: row.active,
              system: false,
              description: normalizeNullableText(row.description),
            },
          });

          codeToAccount.set(created.code, created);
          createdCodes.push(created.code);
          processedCodes.add(row.code);
          progressed = true;
        } catch (error) {
          errors.push({
            code: row.code,
            reason:
              error instanceof Error
                ? error.message
                : "No se pudo importar la cuenta contable",
          });
          processedCodes.add(row.code);
          progressed = true;
        }
      }

      if (!progressed) {
        for (const row of nextPending) {
          errors.push({
            code: row.code,
            reason:
              row.parentCode
                ? `No se pudo resolver la cuenta padre ${row.parentCode}`
                : "La fila no se pudo procesar",
          });
        }
        break;
      }

      pending = nextPending;
    }

    return {
      summary: {
        received: input.rows.length,
        created: createdCodes.length,
        updated: updatedCodes.length,
        skipped: skipped.length,
        failed: errors.length,
      },
      createdCodes,
      updatedCodes,
      skipped,
      errors,
    };
  });
}

export async function createAccountingAccount(
  businessId: string,
  rawInput: unknown,
) {
  const input: CreateAccountingAccountInput =
    createAccountingAccountSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    await ensureAccountingAccountsSeededInTransaction(tx, businessId);
    await ensureUniqueCode(tx, businessId, input.code);

    const parent = await resolveParentAccount(tx, businessId, input.parentId);

    if (parent && parent.groupKey !== input.groupKey) {
      throw new Error(
        "La cuenta hija debe pertenecer al mismo grupo que su cuenta padre",
      );
    }

    if (parent?.acceptsPostings) {
      throw new Error("La cuenta padre debe ser una cuenta de agrupacion");
    }

    const created = await tx.accountingAccount.create({
      data: {
        businessId,
        code: input.code,
        name: input.name,
        groupKey: input.groupKey as AccountingAccountGroupKey,
        defaultNature: input.defaultNature as AccountingAccountNature,
        parentId: parent?.id ?? null,
        level: computeLevel(parent?.level),
        acceptsPostings: input.acceptsPostings,
        active: input.active,
        system: false,
        description: normalizeNullableText(input.description),
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
    });

    return toPlanRow(created);
  });
}

export async function updateAccountingAccount(
  businessId: string,
  rawInput: unknown,
) {
  const input: UpdateAccountingAccountInput =
    updateAccountingAccountSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    await ensureAccountingAccountsSeededInTransaction(tx, businessId);

    const existing = await tx.accountingAccount.findFirst({
      where: {
        id: input.id,
        businessId,
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("La cuenta contable no existe");
    }

    if (existing.system) {
      throw new Error("Las cuentas base del sistema no se pueden modificar");
    }

    const childCount = await tx.accountingAccount.count({
      where: {
        businessId,
        parentId: existing.id,
      },
    });

    const usageCount = await tx.accountingEntryLine.count({
      where: {
        accountCode: existing.code,
        entry: {
          businessId,
        },
      },
    });

    if (existing.code !== input.code && usageCount > 0) {
      throw new Error(
        "No se puede cambiar el codigo de una cuenta que ya tiene movimientos",
      );
    }

    await ensureUniqueCode(tx, businessId, input.code, existing.id);

    const parent = await resolveParentAccount(tx, businessId, input.parentId);
    await assertParentAssignmentAllowed(tx, businessId, existing.id, parent?.id ?? null);

    if (parent && parent.groupKey !== input.groupKey) {
      throw new Error("La cuenta hija debe pertenecer al mismo grupo que su cuenta padre");
    }

    if (parent?.acceptsPostings) {
      throw new Error("La cuenta padre debe ser una cuenta de agrupacion");
    }

    if (childCount > 0 && input.acceptsPostings) {
      throw new Error("Una cuenta con subcuentas no puede aceptar movimientos directos");
    }

    if (childCount > 0 && existing.groupKey !== input.groupKey) {
      throw new Error("No se puede cambiar el grupo de una cuenta que ya tiene subcuentas");
    }

    const updated = await tx.accountingAccount.update({
      where: { id: existing.id },
      data: {
        code: input.code,
        name: input.name,
        groupKey: input.groupKey as AccountingAccountGroupKey,
        defaultNature: input.defaultNature as AccountingAccountNature,
        parentId: parent?.id ?? null,
        level: computeLevel(parent?.level),
        acceptsPostings: input.acceptsPostings,
        active: input.active,
        description: normalizeNullableText(input.description),
      },
      include: {
        parent: {
          select: {
            code: true,
          },
        },
      },
    });

    await syncDescendantLevels(tx, businessId, updated.id);

    return toPlanRow(updated);
  });
}
