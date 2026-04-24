import { fetchJson } from "@/shared/dashboard/api";

import type { AccountsPayable, SupplierPaymentForm } from "../types";

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPaymentPayload(
  payableId: string,
  form: SupplierPaymentForm,
) {
  return {
    payableId,
    amount: numberOrZero(form.amount),
    paymentMethod: form.paymentMethod,
    externalReference: form.externalReference || undefined,
    notes: form.notes || undefined,
    paidAt: form.paidAt,
  };
}

export async function fetchPayables() {
  return fetchJson<AccountsPayable[]>("/api/v1/purchases/payables");
}

export async function registerSupplierPayment(
  payableId: string,
  form: SupplierPaymentForm,
) {
  return fetchJson<AccountsPayable>("/api/v1/purchases/payables", {
    method: "POST",
    body: JSON.stringify(buildPaymentPayload(payableId, form)),
  });
}

export async function voidSupplierPayment(paymentId: string, reason: string) {
  return fetchJson<AccountsPayable>(
    `/api/v1/purchases/payments/${paymentId}/void`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}
