export type KardexMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type KardexReferenceType = "SALE" | "PURCHASE" | "MANUAL";

export type KardexEntry = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  movementType: KardexMovementType;
  movementLabel: string;
  referenceType: KardexReferenceType;
  referenceLabel: string;
  referenceId: string | null;
  quantity: number;
  signedQuantity: number;
  unitCost: number;
  signedTotalCost: number;
  balanceBefore: number;
  balanceAfter: number;
  balanceValue: number;
  balanceAverageCost: number;
  createdAt: string;
  createdByName: string | null;
  notes: string | null;
};
