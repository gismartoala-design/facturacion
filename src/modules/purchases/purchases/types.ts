import type { Product } from "@/shared/dashboard/types";

import type { Supplier } from "../suppliers/types";

export type PurchaseStatus = "POSTED" | "VOIDED";

export type PurchaseItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productType: Product["tipoProducto"];
  quantity: number;
  unitCost: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxTotal: number;
  total: number;
};

export type Purchase = {
  id: string;
  purchaseNumber: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  supplierIdentification: string;
  documentType: string;
  documentNumber: string;
  authorizationNumber: string | null;
  issuedAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  status: PurchaseStatus;
  notes: string | null;
  voidedAt: string | null;
  voidedById: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
};

export type PurchaseLineForm = {
  productId: string;
  quantity: string;
  unitCost: string;
  discount: string;
  taxRate: string;
};

export type PurchaseForm = {
  supplierId: string;
  documentType: string;
  documentNumber: string;
  authorizationNumber: string;
  issuedAt: string;
  notes: string;
  items: PurchaseLineForm[];
};

export type PurchaseRegistrationBootstrap = {
  suppliers: Supplier[];
  products: Product[];
  purchases: Purchase[];
};

export const PURCHASE_DOCUMENT_TYPES = [
  { code: "FACTURA", label: "Factura" },
  { code: "NOTA_VENTA", label: "Nota de venta" },
  { code: "LIQUIDACION", label: "Liquidacion" },
  { code: "OTRO", label: "Otro" },
] as const;
