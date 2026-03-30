import type {
  AccountsReceivableStatus,
  CollectionApplicationStatus,
  CollectionStatus,
} from "@prisma/client";

export type CollectionSummary = {
  id: string;
  businessId: string;
  customerId: string;
  cashSessionId: string | null;
  amount: number;
  paymentMethod: string;
  status: CollectionStatus;
  affectsCashDrawer: boolean;
  requiresBankReconciliation: boolean;
  externalReference: string | null;
  notes: string | null;
  registeredById: string | null;
  collectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionApplicationSummary = {
  id: string;
  collectionId: string;
  saleId: string | null;
  receivableId: string | null;
  appliedAmount: number;
  status: CollectionApplicationStatus;
  notes: string | null;
  createdById: string | null;
  appliedAt: Date;
  createdAt: Date;
};

export type AccountsReceivableSummary = {
  id: string;
  businessId: string;
  customerId: string;
  saleId: string | null;
  documentType: string;
  documentId: string | null;
  currency: string;
  issuedAt: Date;
  dueAt: Date | null;
  originalAmount: number;
  appliedAmount: number;
  pendingAmount: number;
  status: AccountsReceivableStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
