import process from "node:process";

import {
  AccountingEntryStatus,
  AccountingSourceType,
  Prisma,
  PrismaClient,
  SaleStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const ACCOUNT_CODES = {
  accountsReceivable: "110101",
  revenue: "410101",
  vatPayable: "210201",
} as const;

type SaleEntryLine = {
  accountCode: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  memo: string;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function printUsage() {
  console.log(`
Uso:
  npm run accounting:backfill:sale-entries -- --business-slug default
  npm run accounting:backfill:sale-entries -- --business-id <uuid>
  npm run accounting:backfill:sale-entries -- --all
  npm run accounting:backfill:sale-entries -- --business-slug default --dry-run

Opciones:
  --business-id <uuid>      Backfill en un negocio especifico
  --business-slug <slug>    Busca el negocio por slug
  --all                     Backfill en todos los negocios
  --dry-run                 Muestra lo que haria sin guardar cambios
  --help                    Muestra esta ayuda
`.trim());
}

async function resolveBusinesses() {
  const businessId = getArgValue("--business-id");
  const businessSlug = getArgValue("--business-slug");
  const includeAll = hasFlag("--all");

  const selectorsUsed = [businessId, businessSlug, includeAll ? "--all" : null].filter(Boolean).length;

  if (selectorsUsed !== 1) {
    throw new Error("Debes indicar exactamente una opcion: --business-id, --business-slug o --all");
  }

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, slug: true, name: true },
    });
    if (!business) throw new Error(`No existe un negocio con id ${businessId}`);
    return [business];
  }

  if (businessSlug) {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!business) throw new Error(`No existe un negocio con slug ${businessSlug}`);
    return [business];
  }

  const businesses = await prisma.business.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });

  if (businesses.length === 0) throw new Error("No hay negocios registrados");
  return businesses;
}

async function assertRequiredAccounts(businessId: string) {
  const requiredCodes = [
    ACCOUNT_CODES.accountsReceivable,
    ACCOUNT_CODES.revenue,
    ACCOUNT_CODES.vatPayable,
  ];
  const accounts = await prisma.accountingAccount.findMany({
    where: {
      businessId,
      code: { in: requiredCodes },
    },
    select: {
      code: true,
      acceptsPostings: true,
      active: true,
    },
  });
  const byCode = new Map(accounts.map((account) => [account.code, account]));

  for (const code of requiredCodes) {
    const account = byCode.get(code);
    if (!account) {
      throw new Error(`La cuenta contable requerida ${code} no existe`);
    }
    if (!account.active) {
      throw new Error(`La cuenta contable requerida ${code} esta inactiva`);
    }
    if (!account.acceptsPostings) {
      throw new Error(`La cuenta contable requerida ${code} no acepta movimientos`);
    }
  }
}

async function nextEntryNumberInTransaction(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  const result = await tx.accountingEntry.aggregate({
    where: {
      businessId,
      entryNumber: { not: null },
    },
    _max: {
      entryNumber: true,
    },
  });

  return (result._max.entryNumber ?? 0) + 1;
}

async function findCompletedSalesForBusiness(businessId: string) {
  return prisma.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      OR: [
        {
          createdBy: {
            businessId,
          },
        },
        {
          cashSession: {
            businessId,
          },
        },
        {
          restaurantOrder: {
            businessId,
          },
        },
        {
          document: {
            documentSeries: {
              issuer: {
                businessId,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      saleNumber: true,
      subtotal: true,
      taxTotal: true,
      total: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { saleNumber: "asc" }],
  });
}

function buildSaleEntryLines(sale: {
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
}) {
  const lines: SaleEntryLine[] = [
    {
      accountCode: ACCOUNT_CODES.accountsReceivable,
      debit: sale.total,
      credit: new Prisma.Decimal(0),
      memo: "Devengo de venta",
    },
    {
      accountCode: ACCOUNT_CODES.revenue,
      debit: new Prisma.Decimal(0),
      credit: sale.subtotal,
      memo: "Ingreso por ventas",
    },
  ];

  if (sale.taxTotal.gt(0)) {
    lines.push({
      accountCode: ACCOUNT_CODES.vatPayable,
      debit: new Prisma.Decimal(0),
      credit: sale.taxTotal,
      memo: "IVA por pagar",
    });
  }

  return lines;
}

async function backfillForBusiness(params: {
  businessId: string;
  dryRun: boolean;
}) {
  await assertRequiredAccounts(params.businessId);

  const sales = await findCompletedSalesForBusiness(params.businessId);
  const existingEntries = await prisma.accountingEntry.findMany({
    where: {
      businessId: params.businessId,
      sourceType: AccountingSourceType.SALE,
      sourceId: { in: sales.map((sale) => sale.id) },
    },
    select: {
      sourceId: true,
    },
  });
  const salesWithEntries = new Set(existingEntries.map((entry) => entry.sourceId));
  const missingSales = sales.filter((sale) => !salesWithEntries.has(sale.id));

  if (params.dryRun) {
    return {
      created: missingSales.length,
      skipped: sales.length - missingSales.length,
      saleNumbers: missingSales.map((sale) => sale.saleNumber.toString()),
    };
  }

  const createdSaleNumbers: string[] = [];

  await prisma.$transaction(async (tx) => {
    let nextEntryNumber = await nextEntryNumberInTransaction(tx, params.businessId);

    for (const sale of missingSales) {
      await tx.accountingEntry.create({
        data: {
          businessId: params.businessId,
          entryNumber: nextEntryNumber,
          sourceType: AccountingSourceType.SALE,
          sourceId: sale.id,
          status: AccountingEntryStatus.POSTED,
          postedAt: sale.createdAt,
          createdAt: sale.createdAt,
          lines: {
            create: buildSaleEntryLines(sale),
          },
        },
      });

      createdSaleNumbers.push(sale.saleNumber.toString());
      nextEntryNumber++;
    }
  });

  return {
    created: createdSaleNumbers.length,
    skipped: sales.length - missingSales.length,
    saleNumbers: createdSaleNumbers,
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
    console.log(`\nProcesando negocio: ${business.name} (${business.slug})`);
    const result = await backfillForBusiness({
      businessId: business.id,
      dryRun,
    });
    results.push({
      businessId: business.id,
      businessSlug: business.slug,
      businessName: business.name,
      ...result,
    });
    console.log(`  Creados: ${result.created}`);
    console.log(`  Omitidos: ${result.skipped}`);
  }

  console.log("\n" + JSON.stringify({ dryRun, businesses: results }, null, 2));
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo completar el backfill de asientos de venta",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
