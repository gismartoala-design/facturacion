import process from "node:process";

import { Prisma, PrismaClient } from "@prisma/client";

const RESET_OPERATIONAL_DATA_CONFIRMATION = "RESET_OPERATIONAL_DATA";
const prisma = new PrismaClient();

function printUsage() {
  console.log(`
Uso:
  npm run db:reset:operational -- --confirm ${RESET_OPERATIONAL_DATA_CONFIRMATION}

Opciones:
  --skip-orphan-customers   Conserva clientes huerfanos
  --keep-document-series    Conserva el consecutivo actual de series
  --keep-stock-levels       Conserva cantidades actuales de stock
  --keep-integration-logs   Conserva logs de integraciones
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

async function runReset(options: {
  pruneOrphanCustomers: boolean;
  resetDocumentSeries: boolean;
  resetProductStockToZero: boolean;
  clearIntegrationLogs: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.posHeldSale.deleteMany();
    await tx.posCashSession.deleteMany();
    await tx.quote.deleteMany();
    await tx.sale.deleteMany();
    await tx.stockMovement.deleteMany();

    if (options.clearIntegrationLogs) {
      await tx.integrationLog.deleteMany();
    }

    const orphanCustomers = options.pruneOrphanCustomers
      ? await tx.customer.deleteMany({
          where: {
            sales: { none: {} },
            quotes: { none: {} },
          },
        })
      : { count: 0 };

    const stockLevels = options.resetProductStockToZero
      ? await tx.stockLevel.updateMany({
          data: {
            quantity: new Prisma.Decimal(0),
          },
        })
      : { count: 0 };

    const documentSeries = options.resetDocumentSeries
      ? await tx.documentSeries.updateMany({
          data: {
            nextSequence: 1,
          },
        })
      : { count: 0 };

    return {
      orphanCustomers: orphanCustomers.count,
      stockLevels: stockLevels.count,
      documentSeries: documentSeries.count,
    };
  });
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const confirm = getArgValue("--confirm");
  if (confirm !== RESET_OPERATIONAL_DATA_CONFIRMATION) {
    console.error(
      `Debes confirmar con --confirm ${RESET_OPERATIONAL_DATA_CONFIRMATION}`,
    );
    process.exitCode = 1;
    return;
  }

  const result = await runReset({
    pruneOrphanCustomers: !hasFlag("--skip-orphan-customers"),
    resetDocumentSeries: !hasFlag("--keep-document-series"),
    resetProductStockToZero: !hasFlag("--keep-stock-levels"),
    clearIntegrationLogs: !hasFlag("--keep-integration-logs"),
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "No se pudo ejecutar el reseteo",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
