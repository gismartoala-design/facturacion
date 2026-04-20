import { fetchJson } from "@/shared/dashboard/api";
import type { StockItem } from "@/shared/dashboard/types";

import type {
  StockTakingDetail,
  StockTakingSummary,
} from "../types";

type StockTakingDraftItem = {
  productId: string;
  countedQuantity: number;
};

type StockTakingDraftPayload = {
  notes?: string;
  items: StockTakingDraftItem[];
};

export async function fetchStockTakingItems() {
  return fetchJson<StockItem[]>("/api/v1/stock");
}

export async function fetchStockTakingSummaries() {
  return fetchJson<StockTakingSummary[]>("/api/v1/inventory/stock-takings");
}

export async function fetchStockTakingDetail(id: string) {
  return fetchJson<StockTakingDetail>(`/api/v1/inventory/stock-takings/${id}`);
}

export async function createStockTakingDraft(payload: StockTakingDraftPayload) {
  return fetchJson<StockTakingDetail>("/api/v1/inventory/stock-takings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStockTakingDraft(
  id: string,
  payload: StockTakingDraftPayload,
) {
  return fetchJson<StockTakingDetail>(`/api/v1/inventory/stock-takings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function applyStockTakingDraft(id: string) {
  return fetchJson<StockTakingDetail>(
    `/api/v1/inventory/stock-takings/${id}/apply`,
    {
      method: "POST",
    },
  );
}
