import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export const RESET_OPERATIONAL_DATA_CONFIRMATION = "RESET_OPERATIONAL_DATA";

export type ResetOperationalDataOptions = {
  pruneOrphanCustomers?: boolean;
  resetDocumentSeries?: boolean;
  resetProductStockToZero?: boolean;
  clearIntegrationLogs?: boolean;
};

export type ResetOperationalDataResult = {
  scope: "global";
  cleared: {
    posHeldSales: number;
    posCashSessions: number;
    quotes: number;
    quoteItems: number;
    sales: number;
    saleItems: number;
    salePayments: number;
    saleDocuments: number;
    sriInvoices: number;
    sriInvoiceDocuments: number;
    stockMovements: number;
    integrationLogs: number;
    orphanCustomers: number;
  };
  reset: {
    stockLevels: number;
    documentSeries: number;
  };
  notes: string[];
};

const DEFAULT_OPTIONS: Required<ResetOperationalDataOptions> = {
  pruneOrphanCustomers: true,
  resetDocumentSeries: true,
  resetProductStockToZero: true,
  clearIntegrationLogs: true,
};

export async function resetOperationalData(
  rawOptions: ResetOperationalDataOptions = {},
): Promise<ResetOperationalDataResult> {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };

  return prisma.$transaction(async (tx) => {
    const [
      posHeldSales,
      posCashSessions,
      quotes,
      quoteItems,
      sales,
      saleItems,
      salePayments,
      saleDocuments,
      sriInvoices,
      sriInvoiceDocuments,
      stockMovements,
      integrationLogs,
    ] = await Promise.all([
      tx.posHeldSale.count(),
      tx.posCashSession.count(),
      tx.quote.count(),
      tx.quoteItem.count(),
      tx.sale.count(),
      tx.saleItem.count(),
      tx.salePayment.count(),
      tx.saleDocument.count(),
      tx.sriInvoice.count(),
      tx.sriInvoiceDocument.count(),
      tx.stockMovement.count(),
      tx.integrationLog.count(),
    ]);

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
      scope: "global",
      cleared: {
        posHeldSales,
        posCashSessions,
        quotes,
        quoteItems,
        sales,
        saleItems,
        salePayments,
        saleDocuments,
        sriInvoices,
        sriInvoiceDocuments,
        stockMovements,
        integrationLogs: options.clearIntegrationLogs ? integrationLogs : 0,
        orphanCustomers: orphanCustomers.count,
      },
      reset: {
        stockLevels: stockLevels.count,
        documentSeries: documentSeries.count,
      },
      notes: [
        "Se conservaron compania, usuarios, configuraciones, emisores, series y productos.",
        "Las tablas operativas compartidas se limpiaron de forma global porque ventas, cotizaciones, clientes, productos y movimientos no tienen businessId directo en el modelo actual.",
        "Los niveles de stock quedaron en 0 para que el inventario pueda empezar desde cero cuando se active su uso real.",
      ],
    };
  });
}
