export type SalesByCustomerReportResponse = {
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
    customersCount: number;
    salesCount: number;
    grossTotal: number;
    averageTicket: number;
    averageCustomerValue: number;
  };
  rows: Array<{
    customerId: string;
    customerName: string;
    identification: string;
    salesCount: number;
    total: number;
    averageTicket: number;
    lastPurchaseAt: string;
    participationPercent: number;
  }>;
};

export type SalesByCustomerFiltersForm = {
  from: string;
  to: string;
  sellerId: string;
};

export type SalesByCustomerRow = SalesByCustomerReportResponse["rows"][number];
