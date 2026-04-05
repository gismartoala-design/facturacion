import https from "node:https";

import axios from "axios";

const TRANSACTIONAL_EMAIL_BASE_URL =
  process.env.TRANSACTIONAL_EMAIL_BASE_URL?.trim().replace(/\/$/, "") ?? "";
const TRANSACTIONAL_EMAIL_TIMEOUT_MS = Number(
  process.env.TRANSACTIONAL_EMAIL_TIMEOUT_MS ?? 15000,
);
const TRANSACTIONAL_EMAIL_ALLOW_SELF_SIGNED =
  process.env.TRANSACTIONAL_EMAIL_ALLOW_SELF_SIGNED === "true";
export const TRANSACTIONAL_EMAIL_SOURCE_SERVICE =
  process.env.TRANSACTIONAL_EMAIL_SOURCE_SERVICE?.trim() || "arg-mvp";

const http = TRANSACTIONAL_EMAIL_BASE_URL
  ? axios.create({
      baseURL: TRANSACTIONAL_EMAIL_BASE_URL,
      timeout: TRANSACTIONAL_EMAIL_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        rejectUnauthorized: !TRANSACTIONAL_EMAIL_ALLOW_SELF_SIGNED,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
  : null;

export type TransactionalEmailPayload = {
  sourceService: string;
  eventType: string;
  idempotencyKey: string;
  subject: string;
  to: {
    email: string;
    name?: string | null;
  };
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
};

function summarizeTransactionalEmailPayload(payload: TransactionalEmailPayload) {
  return {
    sourceService: payload.sourceService,
    eventType: payload.eventType,
    idempotencyKey: payload.idempotencyKey,
    subject: payload.subject,
    to: payload.to,
    attachments:
      payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentBase64Length: attachment.contentBase64.length,
      })) ?? [],
  };
}

export class TransactionalEmailHttpError extends Error {
  statusCode: number | null;
  responseBody: unknown;

  constructor(
    message: string,
    options?: { statusCode?: number | null; responseBody?: unknown },
  ) {
    super(message);
    this.name = "TransactionalEmailHttpError";
    this.statusCode = options?.statusCode ?? null;
    this.responseBody = options?.responseBody ?? null;
  }
}

function normalizeTransactionalEmailErrorMessage(
  responseBody: unknown,
  statusCode: number | null,
) {
  if (responseBody && typeof responseBody === "object") {
    const record = responseBody as Record<string, unknown>;
    const directMessage =
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : null;

    if (directMessage) {
      return directMessage;
    }
  }

  return statusCode
    ? `El servicio de correos respondio HTTP ${statusCode}`
    : "No se pudo consumir el servicio de correos";
}

export function isTransactionalEmailConfigured() {
  return Boolean(http);
}

export async function sendTransactionalEmail(
  payload: TransactionalEmailPayload,
) {
  if (!http) {
    throw new Error(
      "TRANSACTIONAL_EMAIL_BASE_URL no esta configurado para enviar correos",
    );
  }

  try {
    const { data } = await http.post("/v1/emails/transactional", payload);
    return data;
  } catch (error) {
    console.error("Error al enviar correo transaccional:", {
      error: error instanceof Error ? error.message : error,
      payload: summarizeTransactionalEmailPayload(payload),
      allowSelfSigned: TRANSACTIONAL_EMAIL_ALLOW_SELF_SIGNED,
      responseBody: axios.isAxiosError(error) ? error.response?.data : undefined,
    });
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? null;
      const responseBody = error.response?.data;

      throw new TransactionalEmailHttpError(
        normalizeTransactionalEmailErrorMessage(responseBody, statusCode),
        {
          statusCode,
          responseBody,
        },
      );
    }

    throw error;
  }
}
