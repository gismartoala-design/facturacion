import {
  createDocumentForSaleInTransaction,
  type InvoiceSummary,
  type PendingSaleDocumentAuthorization,
} from "@/core/sales/document.service";
import { createSaleInTransaction } from "@/core/sales/sale.service";
import { checkoutSchema } from "@/core/sales/schemas";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const logger = createLogger("SalesCheckout");

export type CheckoutOptions = {
  inventoryTrackingEnabled?: boolean;
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
  backgroundDocumentTask: PendingSaleDocumentAuthorization | null;
};

export type CheckoutResponse = Omit<CheckoutResult, "backgroundDocumentTask">;

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
    const input = checkoutSchema.parse(rawInput);
    const { saleContext, documentResult } = await prisma.$transaction(
      async (tx) => {
        const saleContext = await createSaleInTransaction(tx, input, {
          startedAt,
          inventoryTrackingEnabled: options?.inventoryTrackingEnabled,
        });
        const documentResult = await createDocumentForSaleInTransaction(
          tx,
          saleContext,
        );

        return {
          saleContext,
          documentResult,
        };
      },
    );

    logger.info("checkout:completed", {
      saleId: saleContext.sale.id,
      saleNumber: saleContext.sale.saleNumber.toString(),
      saleStatus: saleContext.sale.status,
      documentType: documentResult.document.type,
      documentStatus: documentResult.document.status,
      backgroundDocument: Boolean(documentResult.backgroundAuthorization),
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
