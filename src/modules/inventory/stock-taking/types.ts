export type StockTakingStatus = "DRAFT" | "APPLIED";

export type StockTakingSummary = {
  id: string;
  takingNumber: string;
  status: StockTakingStatus;
  notes: string | null;
  createdByName: string;
  appliedByName: string | null;
  itemCount: number;
  rowsWithDifference: number;
  createdAt: string;
  appliedAt: string | null;
};

export type StockTakingDetailItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
};

export type StockTakingDetail = StockTakingSummary & {
  items: StockTakingDetailItem[];
};
