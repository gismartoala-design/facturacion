import process from "node:process";

import { PrismaClient } from "@prisma/client";

import { ACCOUNTING_CHART } from "../src/core/accounting/chart-of-accounts";

const prisma = new PrismaClient();

function printUsage() {
  console.log(`
Uso:
  npm run accounting:seed:base -- --business-slug default
  npm run accounting:seed:base -- --business-id <uuid>
  npm run accounting:seed:base -- --all

Opciones:
  --business-id <uuid>      Registra cuentas base en un negocio especifico
  --business-slug <slug>    Busca el negocio por slug
  --all                     Registra cuentas base en todos los negocios
  --dry-run                 Muestra lo que haria sin guardar cambios
  --help                    Muestra esta ayuda
`.trim());
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

async function resolveBusinesses() {
  const businessId = getArgValue("--business-id");
  const businessSlug = getArgValue("--business-slug");
  const includeAll = hasFlag("--all");

  const selectorsUsed = [businessId ? 1 : 0, businessSlug ? 1 : 0, includeAll ? 1 : 0].reduce(
    (acc, value) => acc + value,
    0,
  );

  if (selectorsUsed !== 1) {
    throw new Error("Debes indicar exactamente una opcion: --business-id, --business-slug o --all");
  }

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, slug: true, name: true },
    });

    if (!business) {
      throw new Error(`No existe un negocio con id ${businessId}`);
    }

    return [business];
  }

  if (businessSlug) {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!business) {
      throw new Error(`No existe un negocio con slug ${businessSlug}`);
    }

    return [business];
  }

  const businesses = await prisma.business.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });

  if (businesses.length === 0) {
    throw new Error("No hay negocios registrados");
  }

  return businesses;
}

async function seedBaseAccountsForBusiness(params: {
  businessId: string;
  dryRun: boolean;
}) {
  const chart = [...ACCOUNTING_CHART].sort(
    (a, b) => a.level - b.level || a.code.localeCompare(b.code),
  );

  const existingAccounts = await prisma.accountingAccount.findMany({
    where: { businessId: params.businessId },
    select: {
      id: true,
      code: true,
      parentId: true,
    },
    orderBy: { code: "asc" },
  });

  const codeToId = new Map(existingAccounts.map((account) => [account.code, account.id]));
  let createdCount = 0;
  const createdCodes: string[] = [];

  for (const account of chart) {
    if (codeToId.has(account.code)) {
      continue;
    }

    const parentId = account.parentCode ? (codeToId.get(account.parentCode) ?? null) : null;

    if (account.parentCode && !parentId) {
      throw new Error(
        `No se pudo resolver la cuenta padre ${account.parentCode} para la cuenta ${account.code}`,
      );
    }

    if (params.dryRun) {
      createdCount += 1;
      createdCodes.push(account.code);
      codeToId.set(account.code, `dry-run:${account.code}`);
      continue;
    }

    const created = await prisma.accountingAccount.create({
      data: {
        businessId: params.businessId,
        code: account.code,
        name: account.name,
        groupKey: account.groupKey,
        defaultNature: account.defaultNature,
        parentId,
        level: account.level,
        acceptsPostings: account.acceptsPostings,
        system: true,
        active: true,
        description: account.description,
      },
      select: {
        id: true,
        code: true,
      },
    });

    createdCount += 1;
    createdCodes.push(created.code);
    codeToId.set(created.code, created.id);
  }

  return {
    createdCount,
    createdCodes,
    existingCount: existingAccounts.length,
    finalCount: existingAccounts.length + createdCount,
  };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const businesses = await resolveBusinesses();
  const results = [];

  for (const business of businesses) {
    const result = await seedBaseAccountsForBusiness({
      businessId: business.id,
      dryRun,
    });

    results.push({
      businessId: business.id,
      businessSlug: business.slug,
      businessName: business.name,
      ...result,
    });
  }

  console.log(JSON.stringify({ dryRun, businesses: results }, null, 2));
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo registrar el plan contable base",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
