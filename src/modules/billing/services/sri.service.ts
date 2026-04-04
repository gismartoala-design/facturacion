import {
  Prisma,
  SaleDocumentStatus,
  SaleStatus,
  SriInvoiceStatus,
} from "@prisma/client";

import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  createInvoice,
  SriHttpError,
} from "@/modules/billing/services/sri.client";
import { sendAuthorizedInvoiceEmailIfApplicable } from "@/modules/billing/services/authorized-invoice-email.service";
import { preparePendingSaleDocumentAuthorizationBySriInvoiceId } from "@/modules/billing/services/sale-document-preparation.service";

const logger = createLogger("SRIService");

export async function logIntegration(params: {
  operation: "CREATE" | "AUTHORIZE" | "RETRY";
  requestPayload: unknown;
  responsePayload?: unknown;
  httpStatus?: number;
  success: boolean;
  errorMessage?: string;
}) {
  await prisma.integrationLog.create({
    data: {
      service: "SRI_INVOICE",
      operation: params.operation,
      requestPayload: params.requestPayload as Prisma.InputJsonValue,
      responsePayload: params.responsePayload
        ? (params.responsePayload as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      httpStatus: params.httpStatus,
      success: params.success,
      errorMessage: params.errorMessage,
    },
  });
}

function toLocalSriInvoiceStatus(remoteStatus: string | null | undefined) {
  if (remoteStatus === "AUTHORIZED") {
    return SriInvoiceStatus.AUTHORIZED;
  }

  if (remoteStatus === "ERROR") {
    return SriInvoiceStatus.ERROR;
  }

  if (remoteStatus === "DRAFT") {
    return SriInvoiceStatus.DRAFT;
  }

  return SriInvoiceStatus.PENDING_SRI;
}

function toLocalSaleDocumentStatus(invoiceStatus: SriInvoiceStatus) {
  if (invoiceStatus === SriInvoiceStatus.AUTHORIZED) {
    return SaleDocumentStatus.ISSUED;
  }

  if (invoiceStatus === SriInvoiceStatus.ERROR) {
    return SaleDocumentStatus.ERROR;
  }

  return SaleDocumentStatus.PENDING;
}

async function syncSaleDocumentStatusBySriInvoiceId(
  sriInvoiceId: string,
  invoiceStatus: SriInvoiceStatus,
  authorizedAt: Date | null,
) {
  await prisma.saleDocument.updateMany({
    where: { sriInvoiceId },
    data: {
      status: toLocalSaleDocumentStatus(invoiceStatus),
      issuedAt: invoiceStatus === SriInvoiceStatus.AUTHORIZED ? authorizedAt : null,
    },
  });
}

export async function pushAndAuthorizeInvoice(sriInvoiceId: string, payload: unknown) {
  const startedAt = startTimer();
  logger.info("invoice:issue:start", {
    sriInvoiceId,
    payload,
  });

  try {
    const issued = await createInvoice(payload);
    logger.info("invoice:issue:response", {
      sriInvoiceId,
      response: issued,
    });
    const localStatus = toLocalSriInvoiceStatus(issued.status);
    const authorizedAt = issued.authorizedAt ? new Date(issued.authorizedAt) : null;

    await logIntegration({
      operation: "CREATE",
      requestPayload: payload,
      responsePayload: issued,
      success: localStatus !== SriInvoiceStatus.ERROR,
      httpStatus: 200,
    });

    await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        externalInvoiceId: issued.id ?? undefined,
        secuencial: issued.secuencial ?? undefined,
        status: localStatus,
        claveAcceso: issued.claveAcceso ?? undefined,
        sriReceptionStatus: issued.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: issued.sriAuthorizationStatus ?? undefined,
        authorizationNumber: issued.authorizationNumber ?? undefined,
        authorizedAt,
        createResponsePayload: issued as Prisma.InputJsonValue,
        lastError: issued.lastError ?? undefined,
      },
    });

    logger.info("invoice:issue:stored", {
      sriInvoiceId,
      externalInvoiceId: issued.id ?? null,
      remoteStatus: issued.status,
      localStatus,
      claveAcceso: issued.claveAcceso ?? null,
      authorizationNumber: issued.authorizationNumber ?? null,
      durationMs: timerDurationMs(startedAt),
    });

    await syncSaleDocumentStatusBySriInvoiceId(
      sriInvoiceId,
      localStatus,
      authorizedAt,
    );

    logger.info("invoice:issue:sale-document-synced", {
      sriInvoiceId,
      saleDocumentStatus: toLocalSaleDocumentStatus(localStatus),
      authorizedAt: authorizedAt?.toISOString() ?? null,
      durationMs: timerDurationMs(startedAt),
    });

    if (
      issued.artifacts?.signedXmlUrl ||
      issued.artifacts?.authorizedXmlUrl
    ) {
      await prisma.sriInvoiceDocument.upsert({
        where: { sriInvoiceId },
        update: {
          xmlSignedPath: issued.artifacts?.signedXmlUrl ?? undefined,
          xmlAuthorizedPath: issued.artifacts?.authorizedXmlUrl ?? undefined,
          storageProvider: "remote",
        },
        create: {
          sriInvoiceId,
          xmlSignedPath: issued.artifacts?.signedXmlUrl ?? undefined,
          xmlAuthorizedPath: issued.artifacts?.authorizedXmlUrl ?? undefined,
          storageProvider: "remote",
        },
      });

      logger.info("invoice:issue:artifacts-synced", {
        sriInvoiceId,
        signedXmlUrl: issued.artifacts?.signedXmlUrl ?? null,
        authorizedXmlUrl: issued.artifacts?.authorizedXmlUrl ?? null,
        durationMs: timerDurationMs(startedAt),
      });
    }

    if (localStatus !== SriInvoiceStatus.AUTHORIZED) {
      logger.warn("invoice:issue:pending-or-error", {
        sriInvoiceId,
        remoteStatus: issued.status,
        localStatus,
        lastError: issued.lastError ?? null,
        sriReceptionStatus: issued.sriReceptionStatus ?? null,
        sriAuthorizationStatus: issued.sriAuthorizationStatus ?? null,
        durationMs: timerDurationMs(startedAt),
      });
      return;
    }

    logger.info("invoice:issue:authorized", {
      sriInvoiceId,
      externalInvoiceId: issued.id ?? null,
      authorizationNumber: issued.authorizationNumber ?? null,
      authorizedAt: authorizedAt?.toISOString() ?? null,
      durationMs: timerDurationMs(startedAt),
    });

    await sendAuthorizedInvoiceEmailIfApplicable(sriInvoiceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en servicio SRI";
    const httpStatus = error instanceof SriHttpError ? error.statusCode ?? undefined : undefined;
    const responseBody =
      error instanceof SriHttpError ? error.responseBody : undefined;

    await logIntegration({
      operation: "CREATE",
      requestPayload: payload,
      responsePayload: responseBody,
      httpStatus,
      success: false,
      errorMessage: message,
    });

    await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        status: SriInvoiceStatus.PENDING_SRI,
        retryCount: { increment: 1 },
        lastError: message,
      },
    });

    logger.error("invoice:issue:failed", {
      sriInvoiceId,
      message,
      httpStatus: httpStatus ?? null,
      responseBody: responseBody ?? null,
      durationMs: timerDurationMs(startedAt),
    });
  }
}

export async function retrySriInvoiceAuthorization(sriInvoiceId: string) {
  const startedAt = startTimer();
  const invoice = await prisma.sriInvoice.findUnique({
    where: { id: sriInvoiceId },
    include: {
      sale: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Factura local no encontrada");
  }

  const { invoicePayload: createRequestPayload } =
    await preparePendingSaleDocumentAuthorizationBySriInvoiceId(
      sriInvoiceId,
    );

  if (invoice.sale.status === SaleStatus.CANCELLED) {
    throw new Error("No se puede reintentar una factura de una venta anulada");
  }

  logger.info("invoice:retry:start", {
    sriInvoiceId,
    claveAcceso: invoice.claveAcceso ?? null,
  });

  try {
    const response = await createInvoice(createRequestPayload);
    const localStatus = toLocalSriInvoiceStatus(response.status);
    const authorizedAt = response.authorizedAt
      ? new Date(response.authorizedAt)
      : null;

    await logIntegration({
      operation: "RETRY",
      requestPayload: createRequestPayload,
      responsePayload: response,
      success: localStatus !== SriInvoiceStatus.ERROR,
      httpStatus: 200,
    });
    const updatedInvoice = await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        externalInvoiceId: response.id ?? undefined,
        secuencial: response.secuencial ?? undefined,
        status: localStatus,
        claveAcceso: response.claveAcceso ?? undefined,
        sriReceptionStatus: response.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: response.sriAuthorizationStatus ?? undefined,
        authorizationNumber: response.authorizationNumber ?? undefined,
        authorizedAt,
        retryCount: { increment: 1 },
        lastError: response.lastError ?? undefined,
        authorizeResponsePayload: response as Prisma.InputJsonValue,
      },
      include: {
        documents: true,
      },
    });

    logger.info("invoice:retry:stored", {
      sriInvoiceId,
      externalInvoiceId: response.id ?? null,
      remoteStatus: response.status,
      localStatus,
      claveAcceso: response.claveAcceso ?? null,
      authorizationNumber: response.authorizationNumber ?? null,
      retryCount: updatedInvoice.retryCount,
      durationMs: timerDurationMs(startedAt),
    });

    await syncSaleDocumentStatusBySriInvoiceId(
      sriInvoiceId,
      localStatus,
      authorizedAt,
    );

    logger.info("invoice:retry:sale-document-synced", {
      sriInvoiceId,
      saleDocumentStatus: toLocalSaleDocumentStatus(localStatus),
      authorizedAt: authorizedAt?.toISOString() ?? null,
      durationMs: timerDurationMs(startedAt),
    });

    if (
      response.artifacts?.signedXmlUrl ||
      response.artifacts?.authorizedXmlUrl
    ) {
      await prisma.sriInvoiceDocument.upsert({
        where: { sriInvoiceId },
        update: {
          xmlSignedPath: response.artifacts?.signedXmlUrl ?? undefined,
          xmlAuthorizedPath: response.artifacts?.authorizedXmlUrl ?? undefined,
          storageProvider: "remote",
        },
        create: {
          sriInvoiceId,
          xmlSignedPath: response.artifacts?.signedXmlUrl ?? undefined,
          xmlAuthorizedPath: response.artifacts?.authorizedXmlUrl ?? undefined,
          storageProvider: "remote",
        },
      });

      logger.info("invoice:retry:artifacts-synced", {
        sriInvoiceId,
        signedXmlUrl: response.artifacts?.signedXmlUrl ?? null,
        authorizedXmlUrl: response.artifacts?.authorizedXmlUrl ?? null,
        durationMs: timerDurationMs(startedAt),
      });
    }

    if (localStatus !== SriInvoiceStatus.AUTHORIZED) {
      logger.warn("invoice:retry:pending-or-error", {
        sriInvoiceId,
        remoteStatus: response.status,
        localStatus,
        lastError: response.lastError ?? null,
        sriReceptionStatus: response.sriReceptionStatus ?? null,
        sriAuthorizationStatus: response.sriAuthorizationStatus ?? null,
        durationMs: timerDurationMs(startedAt),
      });
      return updatedInvoice;
    }

    logger.info("invoice:retry:authorized", {
      sriInvoiceId,
      externalInvoiceId: response.id ?? null,
      authorizationNumber: response.authorizationNumber ?? null,
      authorizedAt: authorizedAt?.toISOString() ?? null,
      retryCount: updatedInvoice.retryCount,
      durationMs: timerDurationMs(startedAt),
    });

    await sendAuthorizedInvoiceEmailIfApplicable(sriInvoiceId);

    return updatedInvoice;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de reintento";
    const httpStatus = error instanceof SriHttpError ? error.statusCode ?? undefined : undefined;
    const responseBody =
      error instanceof SriHttpError ? error.responseBody : undefined;

    await logIntegration({
      operation: "RETRY",
      requestPayload: createRequestPayload,
      responsePayload: responseBody,
      httpStatus,
      success: false,
      errorMessage: message,
    });

    logger.error("invoice:retry:failed", {
      sriInvoiceId,
      message,
      httpStatus: httpStatus ?? null,
      responseBody: responseBody ?? null,
      durationMs: timerDurationMs(startedAt),
    });

    return prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        status: SriInvoiceStatus.PENDING_SRI,
        retryCount: { increment: 1 },
        lastError: message,
      },
      include: {
        documents: true,
      },
    });
  }
}
