import {
  checkout,
  type CheckoutOptions,
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
  const result = await checkout(rawInput, options);

  if (result.backgroundDocumentTask) {
    await preparePendingSaleDocumentAuthorization(result.backgroundDocumentTask);
    await handlers?.scheduleDocumentAuthorization?.(result.backgroundDocumentTask);
  }

  return toCheckoutResponse(result);
}
