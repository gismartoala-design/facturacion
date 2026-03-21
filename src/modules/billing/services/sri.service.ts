import { Prisma, SaleStatus, SriInvoiceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createInvoice } from "@/modules/billing/services/sri.client";

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

export async function pushAndAuthorizeInvoice(sriInvoiceId: string, payload: unknown) {
  try {
    const serviceResp = await createInvoice(payload);

    await logIntegration({
      operation: "CREATE",
      requestPayload: payload,
      responsePayload: serviceResp,
      success: serviceResp.success,
      httpStatus: 200,
    });

    if (!serviceResp.success) {
      await prisma.sriInvoice.update({
        where: { id: sriInvoiceId },
        data: {
          status: SriInvoiceStatus.PENDING_SRI,
          lastError: "El servicio SRI devolvio success=false en create",
        },
      });
      return;
    }

    const issued = serviceResp.data;
    const issuedOk = issued.status === "AUTHORIZED";

    await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        externalInvoiceId: issued.id ?? undefined,
        secuencial: issued.secuencial ?? undefined,
        status: issuedOk
          ? SriInvoiceStatus.AUTHORIZED
          : issued.status === "ERROR"
            ? SriInvoiceStatus.ERROR
          : issued.status === "DRAFT"
            ? SriInvoiceStatus.DRAFT
            : SriInvoiceStatus.PENDING_SRI,
        claveAcceso: issued.claveAcceso ?? undefined,
        sriReceptionStatus: issued.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: issued.sriAuthorizationStatus ?? undefined,
        authorizationNumber: issued.authorizationNumber ?? undefined,
        authorizedAt: issued.authorizedAt ? new Date(issued.authorizedAt) : null,
        createResponsePayload: serviceResp as Prisma.InputJsonValue,
        authorizeResponsePayload: serviceResp as Prisma.InputJsonValue,
        lastError: issued.lastError ?? undefined,
      },
    });

    if (issued.xmlUrl || issued.rideUrl) {
      await prisma.sriInvoiceDocument.upsert({
        where: { sriInvoiceId },
        update: {
          xmlAuthorizedPath: issued.xmlUrl ?? undefined,
          ridePdfPath: issued.rideUrl ?? undefined,
          storageProvider: "remote",
        },
        create: {
          sriInvoiceId,
          xmlAuthorizedPath: issued.xmlUrl ?? undefined,
          ridePdfPath: issued.rideUrl ?? undefined,
          storageProvider: "remote",
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en servicio SRI";

    await logIntegration({
      operation: "CREATE",
      requestPayload: payload,
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
  }
}

export async function retrySriInvoiceAuthorization(sriInvoiceId: string) {
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

  if (!invoice.createRequestPayload) {
    throw new Error("La factura no tiene payload guardado para reintento");
  }

  if (invoice.sale.status === SaleStatus.CANCELLED) {
    throw new Error("No se puede reintentar una factura de una venta anulada");
  }

  try {
    const response = await createInvoice(invoice.createRequestPayload);

    await logIntegration({
      operation: "RETRY",
      requestPayload: invoice.createRequestPayload,
      responsePayload: response,
      success: response.success,
      httpStatus: 200,
    });

    if (!response.success) {
      return prisma.sriInvoice.update({
        where: { id: sriInvoiceId },
        data: {
          status: SriInvoiceStatus.PENDING_SRI,
          retryCount: { increment: 1 },
          lastError: "Reintento devolvio success=false",
          authorizeResponsePayload: response as Prisma.InputJsonValue,
        },
      });
    }

    const data = response.data;
    const isAuthorized = data.status === "AUTHORIZED";

    return prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        externalInvoiceId: data.id ?? undefined,
        status: isAuthorized ? SriInvoiceStatus.AUTHORIZED : SriInvoiceStatus.PENDING_SRI,
        claveAcceso: data.claveAcceso ?? undefined,
        sriReceptionStatus: data.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: data.sriAuthorizationStatus ?? undefined,
        authorizationNumber: data.authorizationNumber ?? undefined,
        authorizedAt: data.authorizedAt ? new Date(data.authorizedAt) : null,
        retryCount: { increment: 1 },
        lastError: data.lastError ?? undefined,
        authorizeResponsePayload: response as Prisma.InputJsonValue,
      },
      include: {
        documents: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de reintento";

    await logIntegration({
      operation: "RETRY",
      requestPayload: invoice.createRequestPayload,
      success: false,
      errorMessage: message,
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
