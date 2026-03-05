import { Prisma, SriInvoiceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authorizeInvoice, createInvoice } from "@/modules/sri/sri.client";

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
    const createResp = await createInvoice(payload);

    await logIntegration({
      operation: "CREATE",
      requestPayload: payload,
      responsePayload: createResp,
      success: createResp.success,
      httpStatus: 200,
    });

    if (!createResp.success) {
      await prisma.sriInvoice.update({
        where: { id: sriInvoiceId },
        data: {
          status: SriInvoiceStatus.PENDING_SRI,
          lastError: "El servicio SRI devolvio success=false en create",
        },
      });
      return;
    }

    const draft = createResp.data;

    await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        externalInvoiceId: draft.id,
        secuencial: draft.secuencial ?? undefined,
        claveAcceso: draft.claveAcceso ?? undefined,
        status: draft.status === "DRAFT" ? SriInvoiceStatus.DRAFT : SriInvoiceStatus.PENDING_SRI,
        sriReceptionStatus: draft.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: draft.sriAuthorizationStatus ?? undefined,
        authorizationNumber: draft.authorizationNumber ?? undefined,
        authorizedAt: draft.authorizedAt ? new Date(draft.authorizedAt) : null,
        createResponsePayload: createResp as Prisma.InputJsonValue,
        lastError: draft.lastError ?? undefined,
      },
    });

    const authResp = await authorizeInvoice(draft.id);

    await logIntegration({
      operation: "AUTHORIZE",
      requestPayload: { externalInvoiceId: draft.id },
      responsePayload: authResp,
      success: authResp.success,
      httpStatus: 200,
    });

    if (!authResp.success) {
      await prisma.sriInvoice.update({
        where: { id: sriInvoiceId },
        data: {
          status: SriInvoiceStatus.PENDING_SRI,
          retryCount: { increment: 1 },
          lastError: "El servicio SRI devolvio success=false en authorize",
          authorizeResponsePayload: authResp as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const authorized = authResp.data;
    const authorizedOk = authorized.status === "AUTHORIZED";

    await prisma.sriInvoice.update({
      where: { id: sriInvoiceId },
      data: {
        status: authorizedOk ? SriInvoiceStatus.AUTHORIZED : SriInvoiceStatus.PENDING_SRI,
        claveAcceso: authorized.claveAcceso ?? undefined,
        sriReceptionStatus: authorized.sriReceptionStatus ?? undefined,
        sriAuthorizationStatus: authorized.sriAuthorizationStatus ?? undefined,
        authorizationNumber: authorized.authorizationNumber ?? undefined,
        authorizedAt: authorized.authorizedAt ? new Date(authorized.authorizedAt) : null,
        retryCount: { increment: 1 },
        lastError: authorized.lastError ?? undefined,
        authorizeResponsePayload: authResp as Prisma.InputJsonValue,
      },
    });

    if (authorized.xmlUrl || authorized.rideUrl) {
      await prisma.sriInvoiceDocument.upsert({
        where: { sriInvoiceId },
        update: {
          xmlAuthorizedPath: authorized.xmlUrl ?? undefined,
          ridePdfPath: authorized.rideUrl ?? undefined,
          storageProvider: "remote",
        },
        create: {
          sriInvoiceId,
          xmlAuthorizedPath: authorized.xmlUrl ?? undefined,
          ridePdfPath: authorized.rideUrl ?? undefined,
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
  });

  if (!invoice) {
    throw new Error("Factura local no encontrada");
  }

  if (!invoice.externalInvoiceId) {
    throw new Error("La factura no tiene externalInvoiceId para reintento");
  }

  try {
    const response = await authorizeInvoice(invoice.externalInvoiceId);

    await logIntegration({
      operation: "RETRY",
      requestPayload: { externalInvoiceId: invoice.externalInvoiceId },
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
      requestPayload: { externalInvoiceId: invoice.externalInvoiceId },
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
