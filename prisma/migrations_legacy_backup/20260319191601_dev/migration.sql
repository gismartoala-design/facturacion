-- DropIndex
DROP INDEX "Product_sku_key";

-- CreateIndex
CREATE INDEX "Product_sku_activo_idx" ON "Product"("sku", "activo");
