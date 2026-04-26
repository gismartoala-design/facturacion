ALTER TABLE "StockLevel"
ADD COLUMN "averageCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "lastCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "inventoryValue" DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE "StockMovement"
ADD COLUMN "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "balanceQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
ADD COLUMN "balanceAverageCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "balanceValue" DECIMAL(14,2) NOT NULL DEFAULT 0;

WITH latest_purchase_cost AS (
  SELECT DISTINCT ON (pi."productId")
    pi."productId",
    ROUND((pi."subtotal" / NULLIF(pi."quantity", 0))::numeric, 4) AS unit_cost
  FROM "PurchaseItem" pi
  JOIN "Purchase" p
    ON p."id" = pi."purchaseId"
   AND p."status" = 'POSTED'
  JOIN "Product" pr
    ON pr."id" = pi."productId"
   AND pr."tipoProducto" = 'BIEN'
  ORDER BY pi."productId", p."issuedAt" DESC, pi."createdAt" DESC
)
UPDATE "StockLevel" sl
SET
  "averageCost" = COALESCE(lpc.unit_cost, 0),
  "lastCost" = COALESCE(lpc.unit_cost, 0),
  "inventoryValue" = ROUND((sl."quantity" * COALESCE(lpc.unit_cost, 0))::numeric, 2)
FROM "Product" pr
LEFT JOIN latest_purchase_cost lpc
  ON lpc."productId" = pr."id"
WHERE pr."id" = sl."productId"
  AND pr."tipoProducto" = 'BIEN';
