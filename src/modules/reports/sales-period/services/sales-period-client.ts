import { fetchJson } from "@/shared/dashboard/api";

import type {
  SalePeriodDetailResponse,
  SalesPeriodReportResponse,
} from "@/modules/reports/sales-period/page/sales-period-view-model";

export function fetchSalesPeriodReport(query: string) {
  return fetchJson<SalesPeriodReportResponse>(
    `/api/v1/reports/sales${query ? `?${query}` : ""}`,
  );
}

export function fetchSalePeriodDetail(saleId: string) {
  return fetchJson<SalePeriodDetailResponse>(`/api/v1/reports/sales/${saleId}`);
}
