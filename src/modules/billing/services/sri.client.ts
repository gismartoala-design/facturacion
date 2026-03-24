import axios from "axios";

const SRI_BASE_URL = process.env.SRI_BASE_URL ?? "http://localhost:3000";
const SRI_TIMEOUT_MS = Number(process.env.SRI_TIMEOUT_MS ?? 15000);
export const SRI_SIGNATURE_ISSUER_ID =
  process.env.SRI_SIGNATURE_ISSUER_ID ??
  "5fc1d44c-9a58-4383-b475-2c3adb49afc9";

const http = axios.create({
  baseURL: SRI_BASE_URL,
  timeout: SRI_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export type SriInvoiceArtifacts = {
  signedXmlUrl?: string | null;
  authorizedXmlUrl?: string | null;
  responseReceptionUrl?: string | null;
  responseAuthUrl?: string | null;
};

export class SriHttpError extends Error {
  statusCode: number | null;
  responseBody: unknown;

  constructor(message: string, options?: { statusCode?: number | null; responseBody?: unknown }) {
    super(message);
    this.name = "SriHttpError";
    this.statusCode = options?.statusCode ?? null;
    this.responseBody = options?.responseBody ?? null;
  }
}

export type SriInvoiceIssueResponse = {
  id?: string | null;
  issuerId?: string | null;
  establecimiento?: string | null;
  puntoEmision?: string | null;
  fechaEmision?: string | null;
  clienteTipoIdentificacion?: string | null;
  clienteIdentificacion?: string | null;
  clienteRazonSocial?: string | null;
  clienteDireccion?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  totalSinImpuestos?: number | null;
  totalDescuento?: number | null;
  propina?: number | null;
  importeTotal?: number | null;
  moneda?: string | null;
  secuencial: string | null;
  claveAcceso: string | null;
  status: string;
  sriReceptionStatus: string | null;
  sriAuthorizationStatus: string | null;
  authorizationNumber: string | null;
  authorizedAt: string | null;
  retryCount: number;
  lastError: string | null;
  detalles?: unknown[];
  pagos?: unknown[];
  infoAdicional?: Record<string, unknown> | null;
  artifacts?: SriInvoiceArtifacts | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SriEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp?: string;
};

function normalizeSriErrorMessage(responseBody: unknown, statusCode: number | null) {
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
    ? `El servicio SRI respondio HTTP ${statusCode}`
    : "No se pudo consumir el servicio SRI";
}

function isSriEnvelope(value: unknown): value is SriEnvelope<SriInvoiceIssueResponse> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.success === "boolean" && "data" in record;
}

export async function createInvoice(payload: unknown) {
  try {
    const { data } = await http.post<SriInvoiceIssueResponse | SriEnvelope<SriInvoiceIssueResponse>>(
      "/api/v1/invoices/issue",
      payload,
    );

    if (isSriEnvelope(data)) {
      if (!data.success) {
        throw new SriHttpError(
          normalizeSriErrorMessage(data, 200),
          {
            statusCode: 200,
            responseBody: data,
          },
        );
      }

      return data.data;
    }

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status ?? null;
      const responseBody = error.response?.data;

      throw new SriHttpError(
        normalizeSriErrorMessage(responseBody, statusCode),
        {
          statusCode,
          responseBody,
        },
      );
    }

    throw error;
  }
}
