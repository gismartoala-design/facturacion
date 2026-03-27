import {
  checkout,
  refreshCheckoutResult,
  toCheckoutResponse,
  type CheckoutOptions,
  type CheckoutResult,
  type CheckoutResponse,
} from "@/core/sales/checkout.service";
import type { PendingSaleDocumentAuthorization } from "@/core/sales/document.service";
import { preparePendingSaleDocumentAuthorization } from "@/modules/billing/services/sale-document-preparation.service";

export type DirectSaleCheckoutResponse = CheckoutResponse;

type DirectSaleCheckoutHandlers = {
  scheduleDocumentAuthorization?: (
    task: PendingSaleDocumentAuthorization,
  ) => void | Promise<void>;
};

export async function runDirectSaleCheckout(
  rawInput: unknown,
  options?: CheckoutOptions,
  handlers?: DirectSaleCheckoutHandlers,
): Promise<DirectSaleCheckoutResponse> {
  let result: CheckoutResult = await checkout(rawInput, options);

  if (!result.backgroundDocumentTask) {
    return toCheckoutResponse(result);
  }

  const backgroundTask = result.backgroundDocumentTask;
  await preparePendingSaleDocumentAuthorization(backgroundTask);
  result = await refreshCheckoutResult(result);
  await handlers?.scheduleDocumentAuthorization?.(backgroundTask);

  return toCheckoutResponse(result);
}
