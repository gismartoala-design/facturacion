export type SalesByProductReportResponse = {
  filters: {
    from: string;
    to: string;
    sellerId: string | null;
    sellerLocked: boolean;
  };
  sellerOptions: Array<{
    id: string;
    name: string;
    role: "ADMIN" | "SELLER";
  }>;
  summary: {
    productsCount: number;
    salesCount: number;
    unitsSold: number;
    grossTotal: number;
    averageProductRevenue: number;
  };
  rows: Array<{
    productId: string;
    productCode: string;
    productName: string;
    unitsSold: number;
    salesCount: number;
    total: number;
    averageUnitPrice: number;
    lastSoldAt: string;
    participationPercent: number;
  }>;
};

export type SalesByProductFiltersForm = {
  from: string;
  to: string;
  sellerId: string;
};

export type SalesByProductRow = SalesByProductReportResponse["rows"][number];
