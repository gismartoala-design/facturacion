export type SalesPeriodReportResponse = {
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
    salesCount: number;
    grossTotal: number;
    averageTicket: number;
    taxTotal: number;
    discountTotal: number;
    itemsSold: number;
  };
  salesRows: Array<{
    saleId: string;
    saleNumber: string;
    customerName: string;
    sellerName: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    itemCount: number;
    createdAt: string;
    paymentMethods: string[];
    documentKey: string;
    documentLabel: string;
  }>;
};

export type SalesPeriodFiltersForm = {
  from: string;
  to: string;
  sellerId: string;
};

export type SalePeriodDetailResponse = {
  businessName: string;
  saleId: string;
  saleNumber: string;
  customerName: string;
  sellerName: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  documentKey: string;
  documentLabel: string;
  documentNumber: string | null;
  paymentMethods: string[];
  lines: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
};

export type SalesPeriodRow = SalesPeriodReportResponse["salesRows"][number];
