import process from "node:process";

import {
  CashSessionStatus,
  PosCashSessionStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

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
  --dry-run        Simula la migracion sin escribir en la base
  --business-id    Limita la migracion a un negocio
  --session-id     Limita la migracion a una sesion legacy especifica
  --include-open   Incluye sesiones legacy OPEN usando la hora actual como corte
  --help           Muestra esta ayuda

Notas:
  - Por defecto solo migra sesiones legacy CLOSED.
  - Conserva el mismo ID de PosCashSession en CashSession.
  - Si una CashSession con ese ID ya existe, la sesion se omite.
`.trim());
}

function formatMoney(value: Prisma.Decimal | number) {
  const numeric = value instanceof Prisma.Decimal ? value.toNumber() : value;
  return Number(numeric.toFixed(2));
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

async function getLegacyCashSales(params: {
  session: LegacySessionRecord;
  cutoffAt: Date;
}) {
  return prisma.salePayment.findMany({
    where: {
      formaPago: "01",
      sale: {
        createdById: params.session.openedById,
        createdAt: {
          gte: params.session.openedAt,
          lte: params.cutoffAt,
        },
      },
    },
    select: {
      amount: true,
      saleId: true,
      sale: {
        select: {
          createdAt: true,
          createdById: true,
        },
      },
    },
    orderBy: {
      sale: {
        createdAt: "asc",
      },
    },
  });
}

async function migrateLegacySession(
  session: LegacySessionRecord,
  options: {
    dryRun: boolean;
    runAt: Date;
  },
) {
  const existing = await prisma.cashSession.findUnique({
    where: { id: session.id },
    select: { id: true },
  });

  if (existing) {
    return {
      status: "skipped_existing" as const,
      sessionId: session.id,
      movementCount: 0,
      cashSalesTotal: 0,
      expectedClosing: null,
      difference: null,
    };
  }

  const cutoffAt = session.closedAt ?? options.runAt;
  const cashSales = await getLegacyCashSales({
    session,
    cutoffAt,
  });

  const cashSalesTotal = cashSales.reduce(
    (acc, payment) => acc.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const expectedClosing = session.openingAmount.add(cashSalesTotal);
  const declaredClosing = session.closingAmount;
  const difference =
    session.status === PosCashSessionStatus.CLOSED && declaredClosing
      ? declaredClosing.sub(expectedClosing)
      : session.status === PosCashSessionStatus.CLOSED
        ? new Prisma.Decimal(0).sub(expectedClosing)
        : null;

  if (!options.dryRun) {
    await prisma.$transaction(async (tx) => {
      await tx.cashSession.create({
        data: {
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

      await tx.cashMovement.create({
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

      for (const payment of cashSales) {
        await tx.cashMovement.create({
          data: {
            businessId: session.businessId,
            sessionId: session.id,
            type: "SALE_CASH_IN",
            amount: payment.amount,
            saleId: payment.saleId,
            description: "Migrado desde venta POS legacy",
            createdById: payment.sale.createdById ?? session.openedById,
            createdAt: payment.sale.createdAt,
          },
        });
      }

      if (session.status === PosCashSessionStatus.CLOSED && difference) {
        await tx.cashReconciliation.create({
          data: {
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
    });
  }

  return {
    status: "migrated" as const,
    sessionId: session.id,
    movementCount: cashSales.length + 1,
    cashSalesTotal: formatMoney(cashSalesTotal),
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
  let totalMovements = 0;

  for (const session of sessions) {
    const result = await migrateLegacySession(session, {
      dryRun,
      runAt,
    });

    results.push({
      sessionId: result.sessionId,
      status: result.status,
      movementCount: result.movementCount,
      cashSalesTotal: result.cashSalesTotal,
      expectedClosing: result.expectedClosing,
      difference: result.difference,
    });

    if (result.status === "migrated") {
      migrated += 1;
      totalMovements += result.movementCount;
    } else {
      skippedExisting += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        includeOpen,
        businessId,
        sessionId,
        totalLegacySessions: sessions.length,
        migrated,
        skippedExisting,
        totalMovements,
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
