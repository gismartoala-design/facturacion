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

export type SriEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp?: string;
};

export type SriInvoiceCreateResponse = {
  id?: string | null;
  issuerId?: string | null;
  secuencial: string | null;
  claveAcceso: string | null;
  status: string;
  sriReceptionStatus: string | null;
  sriAuthorizationStatus: string | null;
  authorizationNumber: string | null;
  authorizedAt: string | null;
  retryCount: number;
  lastError: string | null;
  xmlUrl?: string;
  rideUrl?: string;
};

export type SriInvoiceAuthorizeResponse = SriInvoiceCreateResponse & {
  detalles?: unknown[];
  pagos?: unknown[];
  xmlUrl?: string;
  rideUrl?: string;
};

export async function createInvoice(payload: unknown) {
  const { data } = await http.post<SriEnvelope<SriInvoiceCreateResponse>>(
    "/api/v1/invoices/issue",
    payload,
  );
  return data;
}

export async function authorizeInvoice(externalInvoiceId: string) {
  const { data } = await http.post<SriEnvelope<SriInvoiceAuthorizeResponse>>(
    `/api/v1/invoices/${externalInvoiceId}/authorize`,
  );
  return data;
}
