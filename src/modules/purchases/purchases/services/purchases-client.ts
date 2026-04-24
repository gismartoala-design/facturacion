import { fetchJson } from "@/shared/dashboard/api";

import type { Purchase, PurchaseForm } from "../types";

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCreatePurchasePayload(form: PurchaseForm) {
  return {
    supplierId: form.supplierId,
    documentType: form.documentType,
    documentNumber: form.documentNumber,
    authorizationNumber: form.authorizationNumber || undefined,
    issuedAt: form.issuedAt,
    notes: form.notes || undefined,
    items: form.items.map((item) => ({
      productId: item.productId,
      quantity: numberOrZero(item.quantity),
      unitCost: numberOrZero(item.unitCost),
      discount: numberOrZero(item.discount),
      taxRate: numberOrZero(item.taxRate),
    })),
  };
}

export async function fetchPurchases() {
  return fetchJson<Purchase[]>("/api/v1/purchases");
}

export async function createPurchase(form: PurchaseForm) {
  return fetchJson<Purchase>("/api/v1/purchases", {
    method: "POST",
    body: JSON.stringify(buildCreatePurchasePayload(form)),
  });
}

export async function voidPurchase(id: string, reason: string) {
  return fetchJson<Purchase>(`/api/v1/purchases/${id}/void`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
