import { fetchJson } from "@/shared/dashboard/api";

import type { SalesByProductReportResponse } from "@/modules/reports/sales-by-product/page/sales-by-product-view-model";

export function fetchSalesByProductReport(query: string) {
  return fetchJson<SalesByProductReportResponse>(
    `/api/v1/reports/sales-by-product${query ? `?${query}` : ""}`,
  );
}
