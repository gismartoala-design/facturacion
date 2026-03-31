import { applyCollectionToSaleInTransaction } from "@/core/accounts-receivable/collection-application.service";
import { createCollectionInTransaction } from "@/core/accounts-receivable/collection.service";
import { createReceivableInTransaction } from "@/core/accounts-receivable/receivable.service";
import type { AccountsReceivableSummary } from "@/core/accounts-receivable/types";
import {
  postCollectionEntryInTransaction,
  postSaleEntryInTransaction,
} from "@/core/accounting/accounting-entry.service";
import {
  createDocumentForSaleInTransaction,
  type InvoiceSummary,
  type PendingSaleDocumentAuthorization,
} from "@/core/sales/document.service";
import { createSaleInTransaction } from "@/core/sales/sale.service";
import {
  checkoutSchema,
  type CheckoutInput,
  type SaleSourceInput,
} from "@/core/sales/schemas";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const logger = createLogger("SalesCheckout");
const CASH_DRAWER_PAYMENT_METHODS = new Set(["01"]);
const BANK_RECONCILIATION_PAYMENT_METHODS = new Set(["16", "19", "20"]);
const CREDIT_PAYMENT_METHODS = new Set(["15"]);

export type CheckoutOptions = {
  inventoryTrackingEnabled?: boolean;
  businessId?: string;
  cashSessionId?: string | null;
  saleSource?: SaleSourceInput;
  collectionRegisteredById?: string | null;
  createImmediateCollections?: boolean;
  createReceivableForPendingBalance?: boolean;
};

export type CheckoutResult = {
  saleId: string;
  saleNumber: string;
  saleStatus: string;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  document: Awaited<
    ReturnType<typeof createDocumentForSaleInTransaction>
  >["document"];
  invoice: Awaited<
    ReturnType<typeof createDocumentForSaleInTransaction>
  >["invoice"];
  receivable: AccountsReceivableSummary | null;
  backgroundDocumentTask: PendingSaleDocumentAuthorization | null;
};

export type CheckoutResponse = Omit<CheckoutResult, "backgroundDocumentTask">;

function resolveCollectionCapabilities(paymentMethod: string) {
  return {
    affectsCashDrawer: CASH_DRAWER_PAYMENT_METHODS.has(paymentMethod),
    requiresBankReconciliation:
      BANK_RECONCILIATION_PAYMENT_METHODS.has(paymentMethod),
  };
}

function isCreditPaymentMethod(paymentMethod: string) {
  return CREDIT_PAYMENT_METHODS.has(paymentMethod);
}

function parseIssuedAt(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function resolveDueDate(
  issuedAt: string,
  payments: CheckoutInput["payments"],
) {
  const baseDate = parseIssuedAt(issuedAt);
  let maxOffsetDays = 0;

  for (const payment of payments) {
    if (!isCreditPaymentMethod(payment.formaPago) || payment.plazo <= 0) {
      continue;
    }

    const multiplier =
      payment.unidadTiempo === "MESES"
        ? 30
        : payment.unidadTiempo === "ANIOS"
          ? 365
          : 1;
    maxOffsetDays = Math.max(maxOffsetDays, payment.plazo * multiplier);
  }

  if (maxOffsetDays <= 0) {
    return null;
  }

  const dueAt = new Date(baseDate);
  dueAt.setDate(dueAt.getDate() + maxOffsetDays);
  return dueAt;
}

async function createImmediateCollectionsInTransaction(
  tx: Parameters<typeof createSaleInTransaction>[0],
  input: CheckoutInput,
  saleContext: Awaited<ReturnType<typeof createSaleInTransaction>>,
  options?: CheckoutOptions,
) {
  if (!options?.createImmediateCollections) {
    return;
  }

  if (!options.businessId) {
    throw new Error(
      "No se puede registrar cobros inmediatos sin businessId en checkout",
    );
  }

  for (const payment of input.payments) {
    if (isCreditPaymentMethod(payment.formaPago) || payment.total <= 0) {
      continue;
    }

    const capabilities = resolveCollectionCapabilities(payment.formaPago);
    const collection = await createCollectionInTransaction(tx, {
      businessId: options.businessId,
      customerId: saleContext.customer.id,
      cashSessionId: capabilities.affectsCashDrawer
        ? options.cashSessionId ?? null
        : null,
      amount: payment.total,
      paymentMethod: payment.formaPago,
      status: "APPLIED",
      affectsCashDrawer: capabilities.affectsCashDrawer,
      requiresBankReconciliation: capabilities.requiresBankReconciliation,
      registeredById: options.collectionRegisteredById ?? input.createdById ?? null,
      collectedAt: new Date(),
    });
    await postCollectionEntryInTransaction(tx, {
      businessId: options.businessId,
      collectionId: collection.id,
      amount: payment.total,
      paymentMethod: payment.formaPago,
      affectsCashDrawer: capabilities.affectsCashDrawer,
    });

    await applyCollectionToSaleInTransaction(tx, {
      collectionId: collection.id,
      saleId: saleContext.sale.id,
      appliedAmount: payment.total,
      createdById: options.collectionRegisteredById ?? input.createdById ?? null,
      appliedAt: new Date(),
    });
  }
}

async function createReceivableForPendingBalanceInTransaction(
  tx: Parameters<typeof createSaleInTransaction>[0],
  input: CheckoutInput,
  saleContext: Awaited<ReturnType<typeof createSaleInTransaction>>,
  options?: CheckoutOptions,
): Promise<AccountsReceivableSummary | null> {
  if (!options?.createReceivableForPendingBalance) {
    return null;
  }

  if (!options.businessId) {
    throw new Error(
      "No se puede registrar cartera sin businessId en checkout",
    );
  }

  const pendingPayments = options.createImmediateCollections
    ? input.payments.filter((payment) => isCreditPaymentMethod(payment.formaPago))
    : input.payments.filter((payment) => payment.total > 0);
  const pendingAmount = pendingPayments.reduce(
    (acc, payment) => acc + payment.total,
    0,
  );

  if (pendingAmount <= 0) {
    return null;
  }

  const receivable = await createReceivableInTransaction(tx, {
    businessId: options.businessId,
    customerId: saleContext.customer.id,
    saleId: saleContext.sale.id,
    documentType: input.documentType === "INVOICE" ? "INVOICE" : "SALE",
    documentId: null,
    currency: input.moneda,
    issuedAt: parseIssuedAt(input.fechaEmision),
    dueAt: options.createImmediateCollections
      ? resolveDueDate(input.fechaEmision, pendingPayments)
      : null,
    originalAmount: pendingAmount,
    appliedAmount: 0,
    pendingAmount,
    notes:
      options.createImmediateCollections
        ? pendingPayments.length > 1
          ? "Saldo pendiente generado desde multiples lineas de credito"
          : "Saldo pendiente generado desde checkout directo"
        : "Saldo pendiente generado desde venta directa sin cobro inmediato",
  });

  return {
    id: receivable.id,
    businessId: receivable.businessId,
    customerId: receivable.customerId,
    saleId: receivable.saleId,
    documentType: receivable.documentType,
    documentId: receivable.documentId,
    currency: receivable.currency,
    issuedAt: receivable.issuedAt,
    dueAt: receivable.dueAt,
    originalAmount: Number(receivable.originalAmount),
    appliedAmount: Number(receivable.appliedAmount),
    pendingAmount: Number(receivable.pendingAmount),
    status: receivable.status,
    notes: receivable.notes,
    createdAt: receivable.createdAt,
    updatedAt: receivable.updatedAt,
  };
}

function toInvoiceSummary(rawInvoice: {
  id: string;
  externalInvoiceId: string | null;
  secuencial: string | null;
  status: InvoiceSummary["status"];
  authorizationNumber: string | null;
  claveAcceso: string | null;
  lastError: string | null;
  retryCount: number;
  documents: {
    xmlSignedPath: string | null;
    xmlAuthorizedPath: string | null;
    ridePdfPath: string | null;
  } | null;
}): InvoiceSummary {
  return {
    sriInvoiceId: rawInvoice.id,
    externalInvoiceId: rawInvoice.externalInvoiceId,
    secuencial: rawInvoice.secuencial,
    status: rawInvoice.status,
    authorizationNumber: rawInvoice.authorizationNumber,
    claveAcceso: rawInvoice.claveAcceso,
    lastError: rawInvoice.lastError,
    retryCount: rawInvoice.retryCount,
    documents: rawInvoice.documents,
  };
}

export async function checkout(rawInput: unknown, options?: CheckoutOptions) {
  const startedAt = startTimer();

  try {
    const rawPayload =
      typeof rawInput === "object" && rawInput !== null
        ? (rawInput as Record<string, unknown>)
        : {};
    const input = checkoutSchema.parse({
      ...rawPayload,
      cashSessionId: options?.cashSessionId ?? rawPayload.cashSessionId,
      source: options?.saleSource ?? rawPayload.source,
    });
    const { saleContext, documentResult, receivable } = await prisma.$transaction(
      async (tx) => {
        // Genera la venta
        const saleContext = await createSaleInTransaction(tx, input, {
          startedAt,
          inventoryTrackingEnabled: options?.inventoryTrackingEnabled,
        });
        // Registra asiento contable de la venta
        if (options?.businessId) {
          await postSaleEntryInTransaction(tx, {
            businessId: options.businessId,
            saleId: saleContext.sale.id,
            subtotal: saleContext.totals.subtotal,
            taxTotal: saleContext.totals.taxTotal,
            total: saleContext.totals.total,
          });
        }
        // Registra Cobros
        await createImmediateCollectionsInTransaction(
          tx,
          input,
          saleContext,
          options,
        );
        const receivable = await createReceivableForPendingBalanceInTransaction(
          tx,
          input,
          saleContext,
          options,
        );
        const documentResult = await createDocumentForSaleInTransaction(
          tx,
          saleContext,
        );

        return {
          saleContext,
          receivable,
          documentResult,
        };
      },
      {
        maxWait: 15000,
        timeout: 60000,
        isolationLevel: "Serializable",
      }
    );

    logger.info("checkout:completed", {
      saleId: saleContext.sale.id,
      saleNumber: saleContext.sale.saleNumber.toString(),
      saleStatus: saleContext.sale.status,
      documentType: documentResult.document.type,
      documentStatus: documentResult.document.status,
      backgroundDocument: Boolean(documentResult.backgroundAuthorization),
      saleSource: input.source ?? null,
      cashSessionId: input.cashSessionId ?? null,
      immediateCollections: options?.createImmediateCollections ?? false,
      pendingReceivable: receivable?.pendingAmount ?? 0,
      inventoryTrackingEnabled: options?.inventoryTrackingEnabled ?? true,
      durationMs: timerDurationMs(startedAt),
    });

    return {
      saleId: saleContext.sale.id,
      saleNumber: saleContext.sale.saleNumber.toString(),
      saleStatus: saleContext.sale.status,
      totals: saleContext.totals,
      document: documentResult.document,
      invoice: documentResult.invoice,
      receivable,
      backgroundDocumentTask: documentResult.backgroundAuthorization,
    } satisfies CheckoutResult;
  } catch (error) {
    logger.error("checkout:failed", {
      durationMs: timerDurationMs(startedAt),
      message: error instanceof Error ? error.message : "Error desconocido",
    });
    throw error;
  }
}

export async function refreshCheckoutResult(
  result: CheckoutResult,
): Promise<CheckoutResult> {
  if (!result.invoice) {
    return result;
  }

  const saleDocument = await prisma.saleDocument.findUnique({
    where: { id: result.document.saleDocumentId },
    include: {
      sriInvoice: {
        include: {
          documents: true,
        },
      },
    },
  });

  if (!saleDocument) {
    return result;
  }

  const invoice = saleDocument.sriInvoice
    ? toInvoiceSummary(saleDocument.sriInvoice)
    : null;

  return {
    ...result,
    document: {
      saleDocumentId: saleDocument.id,
      type: saleDocument.type,
      status: saleDocument.status,
      fullNumber: saleDocument.fullNumber,
      establishmentCode: saleDocument.establishmentCode,
      emissionPointCode: saleDocument.emissionPointCode,
      sequenceNumber: saleDocument.sequenceNumber,
      issuedAt: saleDocument.issuedAt,
      invoice,
    },
    invoice,
  } satisfies CheckoutResult;
}

export function toCheckoutResponse(result: CheckoutResult): CheckoutResponse {
  const { backgroundDocumentTask: _backgroundDocumentTask, ...response } =
    result;

  return response;
}
