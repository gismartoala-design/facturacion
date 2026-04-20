import { fetchJson } from "@/shared/dashboard/api";

import type { SalesByCustomerReportResponse } from "@/modules/reports/sales-by-customer/page/sales-by-customer-view-model";

export function fetchSalesByCustomerReport(query: string) {
  return fetchJson<SalesByCustomerReportResponse>(
    `/api/v1/reports/sales-by-customer${query ? `?${query}` : ""}`,
  );
}
