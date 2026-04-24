export type AccountsPayableStatus =
  | "OPEN"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type SupplierPaymentStatus = "APPLIED" | "VOIDED";

export type SupplierPayment = {
  id: string;
  supplierPaymentNumber: string;
  amount: number;
  paymentMethod: string;
  status: SupplierPaymentStatus;
  externalReference: string | null;
  notes: string | null;
  paidAt: string;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
};

export type AccountsPayable = {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  supplierIdentification: string;
  purchaseId: string;
  purchaseNumber: string;
  purchaseStatus: "POSTED" | "VOIDED";
  documentType: string;
  documentNumber: string;
  currency: string;
  issuedAt: string;
  dueAt: string | null;
  originalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: AccountsPayableStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payments: SupplierPayment[];
};

export type SupplierPaymentForm = {
  amount: string;
  paymentMethod: string;
  externalReference: string;
  notes: string;
  paidAt: string;
};
