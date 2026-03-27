import {
  checkout,
  type CheckoutOptions,
  type CheckoutResult,
  refreshCheckoutResult,
  toCheckoutResponse,
  type CheckoutResponse,
} from "@/core/sales/checkout.service";
import type { PendingSaleDocumentAuthorization } from "@/core/sales/document.service";
import { preparePendingSaleDocumentAuthorization } from "@/modules/billing/services/sale-document-preparation.service";

export type PosCheckoutResponse = CheckoutResponse;

type PosCheckoutHandlers = {
  scheduleDocumentAuthorization?: (
    task: PendingSaleDocumentAuthorization,
  ) => void | Promise<void>;
};

export async function runPosCheckout(
  rawInput: unknown,
  options?: CheckoutOptions,
  handlers?: PosCheckoutHandlers,
): Promise<PosCheckoutResponse> {
  let result: CheckoutResult = await checkout(rawInput, options);

  if (result.backgroundDocumentTask) {
    const backgroundTask = result.backgroundDocumentTask;
    await preparePendingSaleDocumentAuthorization(backgroundTask);
    result = await refreshCheckoutResult(result);
    await handlers?.scheduleDocumentAuthorization?.(backgroundTask);
  }

  return toCheckoutResponse(result);
}
