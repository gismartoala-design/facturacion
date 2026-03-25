import { SaleDocumentStatus, SriInvoiceStatus } from "@prisma/client";
import type { PendingSaleDocumentAuthorization } from "@/core/sales/document.service";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { preparePendingSaleDocumentAuthorization } from "@/modules/billing/services/sale-document-preparation.service";
import { pushAndAuthorizeInvoice } from "@/modules/billing/services/sri.service";

const logger = createLogger("BillingSaleDocument");

function toSaleDocumentStatus(invoiceStatus: SriInvoiceStatus) {
  if (invoiceStatus === SriInvoiceStatus.AUTHORIZED) {
    return SaleDocumentStatus.ISSUED;
  }

  if (invoiceStatus === SriInvoiceStatus.ERROR) {
    return SaleDocumentStatus.ERROR;
  }

  return SaleDocumentStatus.PENDING;
}

export async function authorizePendingSaleDocument(
  task: PendingSaleDocumentAuthorization,
) {
  const startedAt = startTimer();
  let pushError: unknown = null;

  try {
    const { invoicePayload } = await preparePendingSaleDocumentAuthorization(
      task,
    );
    await pushAndAuthorizeInvoice(task.sriInvoiceId, invoicePayload);
  } catch (error) {
    pushError = error;
  }

  const finalInvoice = await prisma.sriInvoice.findUnique({
    where: { id: task.sriInvoiceId },
    include: {
      documents: true,
    },
  });

  if (!finalInvoice) {
    await prisma.saleDocument.update({
      where: { id: task.saleDocumentId },
      data: {
        status: SaleDocumentStatus.ERROR,
        issuedAt: null,
      },
    });

    logger.error("document:authorize-missing-invoice", {
      saleId: task.saleId,
      saleNumber: task.saleNumber,
      documentNumber: task.documentNumber,
      sriInvoiceId: task.sriInvoiceId,
      durationMs: timerDurationMs(startedAt),
    });

    return;
  }

  await prisma.saleDocument.update({
    where: { id: task.saleDocumentId },
    data: {
      status: toSaleDocumentStatus(finalInvoice.status),
      issuedAt: finalInvoice.authorizedAt ?? null,
    },
  });

  if (pushError) {
    logger.error("document:authorize-failed", {
      saleId: task.saleId,
      saleNumber: task.saleNumber,
      documentNumber: task.documentNumber,
      sriInvoiceId: task.sriInvoiceId,
      invoiceStatus: finalInvoice.status,
      lastError: finalInvoice.lastError,
      durationMs: timerDurationMs(startedAt),
      message:
        pushError instanceof Error ? pushError.message : "Error desconocido",
    });

    return;
  }

  logger[
    finalInvoice.status === SriInvoiceStatus.AUTHORIZED ? "info" : "warn"
  ]("document:authorize-completed", {
    saleId: task.saleId,
    saleNumber: task.saleNumber,
    documentNumber: task.documentNumber,
    sriInvoiceId: task.sriInvoiceId,
    invoiceStatus: finalInvoice.status,
    lastError: finalInvoice.lastError,
    durationMs: timerDurationMs(startedAt),
  });
}
