import process from "node:process";

import {
  AccountingEntryStatus,
  AccountingSourceType,
  CashSessionStatus,
  CollectionApplicationStatus,
  CollectionStatus,
  PosCashSessionStatus,
  Prisma,
  PrismaClient,
  SaleSource,
} from "@prisma/client";

const prisma = new PrismaClient();

const CASH_DRAWER_PAYMENT_METHODS = new Set(["01"]);
const BANK_RECONCILIATION_PAYMENT_METHODS = new Set(["16", "19", "20"]);
const CREDIT_PAYMENT_METHODS = new Set(["15"]);

const ACCOUNT_CODES = {
  accountsReceivable: "110101",
  cashDrawer: "110201",
  bankClearing: "110301",
} as const;

type LegacySessionRecord = {
  id: string;
  businessId: string;
  openedById: string;
  closedById: string | null;
  status: PosCashSessionStatus;
  openingAmount: Prisma.Decimal;
  closingAmount: Prisma.Decimal | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type LegacySessionSale = {
  id: string;
  customerId: string;
  cashSessionId: string | null;
  source: SaleSource | null;
  createdById: string | null;
  createdAt: Date;
  payments: Array<{
    id: string;
    formaPago: string;
    amount: Prisma.Decimal;
    createdAt: Date;
  }>;
  _count: {
    collectionApplications: number;
  };
};

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

function printUsage() {
  console.log(`
Uso:
  npm run cash:backfill:legacy-sessions -- --dry-run
  npm run cash:backfill:legacy-sessions -- --business-id <uuid>
  npm run cash:backfill:legacy-sessions -- --session-id <uuid>

Opciones:
  --dry-run         Simula la migracion sin escribir en la base
  --business-id     Limita la migracion a un negocio
  --session-id      Limita la migracion a una sesion legacy especifica
  --include-open    Incluye sesiones legacy OPEN usando la hora actual como corte
  --include-heuristic Incluye ventas legacy con source=null si pasan heuristicas de seguridad
  --skip-accounting Omite la creacion de asientos para collections historicas
  --help            Muestra esta ayuda

Notas:
  - Por defecto solo migra sesiones legacy CLOSED.
  - Conserva el mismo ID de PosCashSession en CashSession.
  - Ya no genera SALE_CASH_IN para sesiones nuevas migradas.
  - Enlaza ventas legacy a cashSessionId y crea Collection/CollectionApplication desde SalePayment.
  - Por seguridad, solo migra automaticamente ventas con source=POS.
  - Las ventas con source=null quedan como heuristicas y requieren --include-heuristic.
  - Si una CashSession con ese ID ya existe, la sesion se omite.
`.trim());
}

function formatMoney(value: Prisma.Decimal | number) {
  const numeric = value instanceof Prisma.Decimal ? value.toNumber() : value;
  return Number(numeric.toFixed(2));
}

function isCreditPaymentMethod(paymentMethod: string) {
  return CREDIT_PAYMENT_METHODS.has(paymentMethod);
}

function resolveCollectionCapabilities(paymentMethod: string) {
  return {
    affectsCashDrawer: CASH_DRAWER_PAYMENT_METHODS.has(paymentMethod),
    requiresBankReconciliation:
      BANK_RECONCILIATION_PAYMENT_METHODS.has(paymentMethod),
  };
}

function resolveCollectionDebitAccount(params: {
  paymentMethod: string;
  affectsCashDrawer: boolean;
}) {
  if (params.affectsCashDrawer || params.paymentMethod === "01") {
    return ACCOUNT_CODES.cashDrawer;
  }

  return ACCOUNT_CODES.bankClearing;
}

async function getLegacySessions(filters: {
  businessId: string | null;
  sessionId: string | null;
  includeOpen: boolean;
}) {
  return prisma.posCashSession.findMany({
    where: {
      ...(filters.businessId ? { businessId: filters.businessId } : {}),
      ...(filters.sessionId ? { id: filters.sessionId } : {}),
      ...(filters.includeOpen ? {} : { status: PosCashSessionStatus.CLOSED }),
    },
    orderBy: {
      openedAt: "asc",
    },
  });
}

async function getLegacySessionSales(params: {
  session: LegacySessionRecord;
  cutoffAt: Date;
}) {
  return prisma.sale.findMany({
    where: {
      createdById: params.session.openedById,
      createdAt: {
        gte: params.session.openedAt,
        lte: params.cutoffAt,
      },
    },
    select: {
      id: true,
      customerId: true,
      cashSessionId: true,
      source: true,
      createdById: true,
      createdAt: true,
      payments: {
        select: {
          id: true,
          formaPago: true,
          amount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          collectionApplications: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function classifyLegacySale(sale: LegacySessionSale) {
  if (sale.source === SaleSource.POS) {
    return "confirmed" as const;
  }

  if (sale.source === SaleSource.DIRECT_SALE || sale.source === SaleSource.QUOTE) {
    return "excluded_source" as const;
  }

  if (sale.cashSessionId) {
    return "excluded_existing_session" as const;
  }

  if (sale._count.collectionApplications > 0) {
    return "excluded_existing_collection" as const;
  }

  if (sale.source === null) {
    return "heuristic" as const;
  }

  return "excluded_other" as const;
}

function toSaleAuditSample(sale: LegacySessionSale) {
  return {
    saleId: sale.id,
    source: sale.source,
    createdAt: sale.createdAt.toISOString(),
    cashSessionId: sale.cashSessionId,
    collectionApplications: sale._count.collectionApplications,
    paymentCount: sale.payments.length,
    paymentTotal: formatMoney(
      sale.payments.reduce((acc, payment) => acc.add(payment.amount), new Prisma.Decimal(0)),
    ),
  };
}

async function ensureCollectionAccounting(params: {
  tx: Prisma.TransactionClient | PrismaClient;
  businessId: string;
  collectionId: string;
  amount: Prisma.Decimal;
  paymentMethod: string;
  affectsCashDrawer: boolean;
  createdAt: Date;
}) {
  const existing = await params.tx.accountingEntry.findFirst({
    where: {
      businessId: params.businessId,
      sourceType: AccountingSourceType.COLLECTION,
      sourceId: params.collectionId,
    },
    include: {
      lines: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    if (existing.status !== AccountingEntryStatus.POSTED) {
      await params.tx.accountingEntry.update({
        where: { id: existing.id },
        data: {
          status: AccountingEntryStatus.POSTED,
          postedAt: existing.postedAt ?? params.createdAt,
        },
      });
    }
    return existing;
  }

  return params.tx.accountingEntry.create({
    data: {
      businessId: params.businessId,
      sourceType: AccountingSourceType.COLLECTION,
      sourceId: params.collectionId,
      status: AccountingEntryStatus.POSTED,
      postedAt: params.createdAt,
      createdAt: params.createdAt,
      lines: {
        create: [
          {
            accountCode: resolveCollectionDebitAccount({
              paymentMethod: params.paymentMethod,
              affectsCashDrawer: params.affectsCashDrawer,
            }),
            debit: params.amount,
            credit: 0,
            memo: "Cobro migrado desde PosCashSession legacy",
            createdAt: params.createdAt,
          },
          {
            accountCode: ACCOUNT_CODES.accountsReceivable,
            debit: 0,
            credit: params.amount,
            memo: "Aplicacion de cobro migrado desde PosCashSession",
            createdAt: params.createdAt,
          },
        ],
      },
    },
    include: {
      lines: true,
    },
  });
}

async function migrateLegacySession(
  session: LegacySessionRecord,
  options: {
    dryRun: boolean;
    includeHeuristic: boolean;
    withAccounting: boolean;
    runAt: Date;
  },
) {
  const existing = await prisma.cashSession.findUnique({
    where: { id: session.id },
    select: { id: true },
  });

  const cutoffAt = session.closedAt ?? options.runAt;
  const rawSales = await getLegacySessionSales({
    session,
    cutoffAt,
  });
  const confirmedSales = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "confirmed",
  );
  const heuristicSales = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "heuristic",
  );
  const excludedExistingSession = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "excluded_existing_session",
  );
  const excludedExistingCollection = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "excluded_existing_collection",
  );
  const excludedBySource = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "excluded_source",
  );
  const excludedOther = rawSales.filter(
    (sale) => classifyLegacySale(sale) === "excluded_other",
  );
  const sales = options.includeHeuristic
    ? [...confirmedSales, ...heuristicSales]
    : confirmedSales;

  const immediatePayments = sales.flatMap((sale) =>
    sale.payments
      .filter((payment) => !isCreditPaymentMethod(payment.formaPago))
      .map((payment) => ({
        payment,
        sale,
        capabilities: resolveCollectionCapabilities(payment.formaPago),
      })),
  );

  const creditPaymentsSkipped = sales.reduce(
    (acc, sale) =>
      acc + sale.payments.filter((payment) => isCreditPaymentMethod(payment.formaPago)).length,
    0,
  );

  const cashCollectionsTotal = immediatePayments.reduce(
    (acc, entry) =>
      entry.capabilities.affectsCashDrawer ? acc.add(entry.payment.amount) : acc,
    new Prisma.Decimal(0),
  );
  const expectedClosing = session.openingAmount.add(cashCollectionsTotal);
  const declaredClosing = session.closingAmount;
  const difference =
    session.status === PosCashSessionStatus.CLOSED && declaredClosing
      ? declaredClosing.sub(expectedClosing)
      : session.status === PosCashSessionStatus.CLOSED
        ? new Prisma.Decimal(0).sub(expectedClosing)
        : null;

  if (!options.dryRun) {
    await prisma.cashSession.upsert({
      where: { id: session.id },
      update: {
        businessId: session.businessId,
        openedById: session.openedById,
        closedById: session.closedById,
        status:
          session.status === PosCashSessionStatus.CLOSED
            ? CashSessionStatus.CLOSED
            : CashSessionStatus.OPEN,
        openingAmount: session.openingAmount,
        declaredClosing:
          session.status === PosCashSessionStatus.CLOSED
            ? declaredClosing
            : null,
        expectedClosing:
          session.status === PosCashSessionStatus.CLOSED
            ? expectedClosing
            : null,
        difference:
          session.status === PosCashSessionStatus.CLOSED
            ? difference
            : null,
        notes: session.notes,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        updatedAt: session.updatedAt,
      },
      create: {
        id: session.id,
        businessId: session.businessId,
        openedById: session.openedById,
        closedById: session.closedById,
        status:
          session.status === PosCashSessionStatus.CLOSED
            ? CashSessionStatus.CLOSED
            : CashSessionStatus.OPEN,
        openingAmount: session.openingAmount,
        declaredClosing:
          session.status === PosCashSessionStatus.CLOSED
            ? declaredClosing
            : null,
        expectedClosing:
          session.status === PosCashSessionStatus.CLOSED
            ? expectedClosing
            : null,
        difference:
          session.status === PosCashSessionStatus.CLOSED
            ? difference
            : null,
        notes: session.notes,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });

    const openingMovement = await prisma.cashMovement.findFirst({
      where: {
        sessionId: session.id,
        type: "OPENING_FLOAT",
      },
      select: { id: true },
    });

    if (!openingMovement) {
      await prisma.cashMovement.create({
        data: {
          businessId: session.businessId,
          sessionId: session.id,
          type: "OPENING_FLOAT",
          amount: session.openingAmount,
          description: "Migrado desde PosCashSession",
          createdById: session.openedById,
          createdAt: session.openedAt,
        },
      });
    }

    for (const sale of sales) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          cashSessionId: sale.cashSessionId ?? session.id,
          source: sale.source ?? SaleSource.POS,
        },
      });
    }

    for (const entry of immediatePayments) {
      await prisma.$transaction(
        async (tx) => {
          const externalReference = `legacy-pos-payment:${entry.payment.id}`;
          const existingCollection = await tx.collection.findFirst({
            where: {
              externalReference,
            },
          });

          const collection =
            existingCollection ??
            (await tx.collection.create({
              data: {
                businessId: session.businessId,
                customerId: entry.sale.customerId,
                cashSessionId: entry.capabilities.affectsCashDrawer
                  ? session.id
                  : null,
                amount: entry.payment.amount,
                paymentMethod: entry.payment.formaPago,
                status: CollectionStatus.APPLIED,
                affectsCashDrawer: entry.capabilities.affectsCashDrawer,
                requiresBankReconciliation:
                  entry.capabilities.requiresBankReconciliation,
                externalReference,
                notes: "Backfill desde PosCashSession legacy",
                registeredById: entry.sale.createdById ?? session.openedById,
                collectedAt: entry.payment.createdAt,
                createdAt: entry.payment.createdAt,
              },
            }));

          const existingApplication = await tx.collectionApplication.findFirst({
            where: {
              collectionId: collection.id,
              saleId: entry.sale.id,
              status: CollectionApplicationStatus.APPLIED,
            },
          });

          if (!existingApplication) {
            await tx.collectionApplication.create({
              data: {
                collectionId: collection.id,
                saleId: entry.sale.id,
                appliedAmount: entry.payment.amount,
                status: CollectionApplicationStatus.APPLIED,
                notes: "Backfill desde PosCashSession legacy",
                createdById: entry.sale.createdById ?? session.openedById,
                appliedAt: entry.payment.createdAt,
                createdAt: entry.payment.createdAt,
              },
            });
          }

          if (options.withAccounting) {
            await ensureCollectionAccounting({
              tx,
              businessId: session.businessId,
              collectionId: collection.id,
              amount: entry.payment.amount,
              paymentMethod: entry.payment.formaPago,
              affectsCashDrawer: entry.capabilities.affectsCashDrawer,
              createdAt: entry.payment.createdAt,
            });
          }
        },
        {
          maxWait: 10_000,
          timeout: 30_000,
        },
      );
    }

    if (session.status === PosCashSessionStatus.CLOSED && difference) {
      await prisma.cashReconciliation.upsert({
        where: { sessionId: session.id },
        update: {
          expectedAmount: expectedClosing,
          declaredAmount: declaredClosing ?? new Prisma.Decimal(0),
          difference,
          reason: "Migrado desde PosCashSession legacy",
          approvedById: session.closedById,
          approvedAt: session.closedAt,
          createdAt: session.closedAt ?? session.updatedAt,
        },
        create: {
          sessionId: session.id,
          expectedAmount: expectedClosing,
          declaredAmount: declaredClosing ?? new Prisma.Decimal(0),
          difference,
          reason: "Migrado desde PosCashSession legacy",
          approvedById: session.closedById,
          approvedAt: session.closedAt,
          createdAt: session.closedAt ?? session.updatedAt,
        },
      });
    }
  }

  return {
    status: existing ? ("resumed_existing" as const) : ("migrated" as const),
    sessionId: session.id,
    salesLinked: sales.length,
    confirmedSales: confirmedSales.length,
    heuristicSalesAvailable: heuristicSales.length,
    collectionsCreated: immediatePayments.length,
    applicationsCreated: immediatePayments.length,
    accountingCreated: options.withAccounting ? immediatePayments.length : 0,
    cashCollectionsTotal: formatMoney(cashCollectionsTotal),
    immediatePaymentsCount: immediatePayments.length,
    creditPaymentsSkipped,
    excludedExistingSession: excludedExistingSession.length,
    excludedExistingCollection: excludedExistingCollection.length,
    excludedBySource: excludedBySource.length,
    excludedOther: excludedOther.length,
    heuristicSamples: heuristicSales.slice(0, 5).map(toSaleAuditSample),
    expectedClosing:
      session.status === PosCashSessionStatus.CLOSED
        ? formatMoney(expectedClosing)
        : null,
    difference:
      session.status === PosCashSessionStatus.CLOSED && difference
        ? formatMoney(difference)
        : null,
  };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const includeOpen = hasFlag("--include-open");
  const includeHeuristic = hasFlag("--include-heuristic");
  const withAccounting = !hasFlag("--skip-accounting");
  const businessId = getArgValue("--business-id");
  const sessionId = getArgValue("--session-id");
  const runAt = new Date();

  const sessions = await getLegacySessions({
    businessId,
    sessionId,
    includeOpen,
  });

  const results = [];
  let migrated = 0;
  let skippedExisting = 0;
  let salesLinked = 0;
  let confirmedSales = 0;
  let heuristicSalesAvailable = 0;
  let collectionsCreated = 0;
  let applicationsCreated = 0;
  let accountingCreated = 0;

  for (const session of sessions) {
    const result = await migrateLegacySession(session, {
      dryRun,
      includeHeuristic,
      withAccounting,
      runAt,
    });

    results.push(result);

    if (result.status === "migrated" || result.status === "resumed_existing") {
      migrated += 1;
      salesLinked += result.salesLinked;
      confirmedSales += result.confirmedSales;
      heuristicSalesAvailable += result.heuristicSalesAvailable;
      collectionsCreated += result.collectionsCreated;
      applicationsCreated += result.applicationsCreated;
      accountingCreated += result.accountingCreated;
    } else {
      skippedExisting += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        includeOpen,
        includeHeuristic,
        withAccounting,
        businessId,
        sessionId,
        totalLegacySessions: sessions.length,
        migrated,
        skippedExisting,
        salesLinked,
        confirmedSales,
        heuristicSalesAvailable,
        collectionsCreated,
        applicationsCreated,
        accountingCreated,
        processedAt: runAt.toISOString(),
        results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar el backfill de PosCashSession",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
