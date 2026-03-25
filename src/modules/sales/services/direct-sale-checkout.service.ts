import {
  checkout,
  refreshCheckoutResult,
  toCheckoutResponse,
  type CheckoutOptions,
  type CheckoutResponse,
} from "@/core/sales/checkout.service";
import { authorizePendingSaleDocument } from "@/modules/billing/services/sale-document-authorization.service";
import { preparePendingSaleDocumentAuthorization } from "@/modules/billing/services/sale-document-preparation.service";

export type DirectSaleCheckoutResponse = CheckoutResponse;

export async function runDirectSaleCheckout(
  rawInput: unknown,
  options?: CheckoutOptions,
): Promise<DirectSaleCheckoutResponse> {
  const result = await checkout(rawInput, options);

  if (!result.backgroundDocumentTask) {
    return toCheckoutResponse(result);
  }

  await preparePendingSaleDocumentAuthorization(result.backgroundDocumentTask);
  await authorizePendingSaleDocument(result.backgroundDocumentTask);
  const refreshedResult = await refreshCheckoutResult(result);

  return toCheckoutResponse(refreshedResult);
}
