import process from "node:process";

import {
  AccountingEntryStatus,
  AccountingSourceType,
  CollectionApplicationStatus,
  CollectionStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const ACCOUNT_CODES = {
  accountsReceivable: "110101",
  cashDrawer: "110201",
} as const;

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
  npm run cash:backfill:sale-cash-in -- --dry-run
  npm run cash:backfill:sale-cash-in -- --business-id <uuid>
  npm run cash:backfill:sale-cash-in -- --movement-id <uuid>

Opciones:
  --dry-run        Simula la migracion sin escribir en la base
  --business-id    Limita la migracion a un negocio
  --session-id     Limita la migracion a una sesion de caja
  --movement-id    Limita la migracion a un movimiento legacy especifico
  --skip-accounting Omite el backfill de asientos contables de collection
  --help           Muestra esta ayuda

Notas:
  - No elimina SALE_CASH_IN; solo crea Collection y CollectionApplication faltantes.
  - Detecta operaciones ya cubiertas por Collection nativa para evitar duplicados.
  - Usa externalReference=legacy-sale-cash-in:<movementId> para idempotencia.
`.trim());
}

function formatMoney(value: number) {
  return Number(value.toFixed(2));
}

type LegacyCashMovement = Awaited<ReturnType<typeof listLegacyCashMovements>>[number];

async function listLegacyCashMovements(filters: {
  businessId: string | null;
  sessionId: string | null;
  movementId: string | null;
}) {
  return prisma.cashMovement.findMany({
    where: {
      type: "SALE_CASH_IN",
      ...(filters.businessId ? { businessId: filters.businessId } : {}),
      ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
      ...(filters.movementId ? { id: filters.movementId } : {}),
    },
    include: {
      sale: {
        select: {
          id: true,
          customerId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function findCoveredCollection(movement: LegacyCashMovement) {
  const legacyExternalReference = `legacy-sale-cash-in:${movement.id}`;

  const byExternalReference = await prisma.collection.findFirst({
    where: {
      externalReference: legacyExternalReference,
    },
  });

  if (byExternalReference) {
    return byExternalReference;
  }

  if (!movement.saleId) {
    return null;
  }

  return prisma.collection.findFirst({
    where: {
      businessId: movement.businessId,
      cashSessionId: movement.sessionId,
      paymentMethod: "01",
      amount: movement.amount,
      status: CollectionStatus.APPLIED,
      affectsCashDrawer: true,
      applications: {
        some: {
          saleId: movement.saleId,
          status: CollectionApplicationStatus.APPLIED,
        },
      },
    },
  });
}

async function ensureApplicationForSale(params: {
  tx: Prisma.TransactionClient | PrismaClient;
  collectionId: string;
  saleId: string;
  amount: number;
  createdById: string;
  createdAt: Date;
}) {
  const existing = await params.tx.collectionApplication.findFirst({
    where: {
      collectionId: params.collectionId,
      saleId: params.saleId,
      status: CollectionApplicationStatus.APPLIED,
    },
  });

  if (existing) {
    return existing;
  }

  return params.tx.collectionApplication.create({
    data: {
      collectionId: params.collectionId,
      saleId: params.saleId,
      appliedAmount: params.amount,
      status: CollectionApplicationStatus.APPLIED,
      createdById: params.createdById,
      appliedAt: params.createdAt,
      createdAt: params.createdAt,
    },
  });
}

async function ensureCollectionAccounting(params: {
  tx: Prisma.TransactionClient | PrismaClient;
  businessId: string;
  collectionId: string;
  amount: number;
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
            accountCode: ACCOUNT_CODES.cashDrawer,
            debit: params.amount,
            credit: 0,
            memo: "Cobro migrado desde SALE_CASH_IN",
            createdAt: params.createdAt,
          },
          {
            accountCode: ACCOUNT_CODES.accountsReceivable,
            debit: 0,
            credit: params.amount,
            memo: "Aplicacion de cobro migrado",
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

async function migrateMovement(
  movement: LegacyCashMovement,
  options: {
    dryRun: boolean;
    withAccounting: boolean;
  },
) {
  const sale = movement.sale;
  const saleId = movement.saleId;

  if (!saleId || !sale?.customerId) {
    return {
      status: "skipped_invalid" as const,
      movementId: movement.id,
      collectionCreated: false,
      applicationCreated: false,
      accountingCreated: false,
      reason: "Movimiento sin venta o sin cliente asociado",
    };
  }

  const coveredCollection = await findCoveredCollection(movement);
  const wouldCreateCollection = !coveredCollection;
  const legacyExternalReference = `legacy-sale-cash-in:${movement.id}`;

  if (options.dryRun) {
    const existingApplication = coveredCollection
      ? await prisma.collectionApplication.findFirst({
          where: {
            collectionId: coveredCollection.id,
            saleId,
            status: CollectionApplicationStatus.APPLIED,
          },
        })
      : null;
    const existingAccounting = coveredCollection
      ? await prisma.accountingEntry.findFirst({
          where: {
            businessId: movement.businessId,
            sourceType: AccountingSourceType.COLLECTION,
            sourceId: coveredCollection.id,
          },
        })
      : null;

    return {
      status: coveredCollection ? "already_covered" as const : "ready_to_migrate" as const,
      movementId: movement.id,
      collectionCreated: wouldCreateCollection,
      applicationCreated: !existingApplication,
      accountingCreated: options.withAccounting && !existingAccounting,
      reason: coveredCollection
        ? "Ya existe una Collection equivalente o previamente migrada"
        : "Listo para migrar",
      externalReference: legacyExternalReference,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const collection =
      coveredCollection ??
      (await tx.collection.create({
        data: {
          businessId: movement.businessId,
          customerId: sale.customerId,
          cashSessionId: movement.sessionId,
          amount: movement.amount,
          paymentMethod: "01",
          status: CollectionStatus.APPLIED,
          affectsCashDrawer: true,
          requiresBankReconciliation: false,
          externalReference: legacyExternalReference,
          notes: "Backfill desde CashMovement SALE_CASH_IN",
          registeredById: movement.createdById,
          collectedAt: movement.createdAt,
          createdAt: movement.createdAt,
        },
      }));

    const application = await ensureApplicationForSale({
      tx,
      collectionId: collection.id,
      saleId,
      amount: movement.amount.toNumber(),
      createdById: movement.createdById,
      createdAt: movement.createdAt,
    });

    const accounting = options.withAccounting
      ? await ensureCollectionAccounting({
          tx,
          businessId: movement.businessId,
          collectionId: collection.id,
          amount: movement.amount.toNumber(),
          createdAt: movement.createdAt,
        })
      : null;

    return {
      collectionId: collection.id,
      applicationId: application.id,
      accountingId: accounting?.id ?? null,
      createdCollection: !coveredCollection,
    };
  });

  return {
    status: coveredCollection ? "completed_existing_collection" as const : "migrated" as const,
    movementId: movement.id,
    collectionCreated: result.createdCollection,
    applicationCreated: true,
    accountingCreated: Boolean(result.accountingId),
    reason: result.createdCollection
      ? "Collection y application creadas desde movimiento legacy"
      : "Se reutilizo Collection existente y se completo el resto",
    externalReference: legacyExternalReference,
    collectionId: result.collectionId,
  };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const dryRun = hasFlag("--dry-run");
  const withAccounting = !hasFlag("--skip-accounting");
  const businessId = getArgValue("--business-id");
  const sessionId = getArgValue("--session-id");
  const movementId = getArgValue("--movement-id");

  const movements = await listLegacyCashMovements({
    businessId,
    sessionId,
    movementId,
  });

  if (movements.length === 0) {
    console.log("No se encontraron movimientos SALE_CASH_IN para migrar.");
    return;
  }

  const summary = {
    total: movements.length,
    migrated: 0,
    readyToMigrate: 0,
    covered: 0,
    skippedInvalid: 0,
    collectionsCreated: 0,
    accountingCreated: 0,
    totalAmount: 0,
  };

  console.log(
    `${dryRun ? "[DRY-RUN]" : "[APPLY]"} Analizando ${movements.length} movimientos legacy...`,
  );

  for (const movement of movements) {
    const result = await migrateMovement(movement, {
      dryRun,
      withAccounting,
    });

    summary.totalAmount += movement.amount.toNumber();

    if (result.status === "migrated" || result.status === "completed_existing_collection") {
      summary.migrated += 1;
    } else if (result.status === "ready_to_migrate") {
      summary.readyToMigrate += 1;
    } else if (result.status === "already_covered") {
      summary.covered += 1;
    } else if (result.status === "skipped_invalid") {
      summary.skippedInvalid += 1;
    }

    if (result.collectionCreated) {
      summary.collectionsCreated += 1;
    }
    if (result.accountingCreated) {
      summary.accountingCreated += 1;
    }

    console.log(
      [
        movement.id,
        result.status,
        result.reason,
        result.externalReference ? `ref=${result.externalReference}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  console.log("\nResumen:");
  console.log(`- movimientos evaluados: ${summary.total}`);
  console.log(`- monto total legacy: ${formatMoney(summary.totalAmount)}`);
  console.log(`- migrados/aplicados: ${summary.migrated}`);
  console.log(`- listos para migrar: ${summary.readyToMigrate}`);
  console.log(`- ya cubiertos: ${summary.covered}`);
  console.log(`- invalidos/omitidos: ${summary.skippedInvalid}`);
  console.log(`- collections creadas: ${summary.collectionsCreated}`);
  console.log(`- asientos contables creados: ${summary.accountingCreated}`);
}

main()
  .catch((error) => {
    console.error("Error en backfill de SALE_CASH_IN:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
