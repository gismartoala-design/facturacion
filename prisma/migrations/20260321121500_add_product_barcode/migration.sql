ALTER TABLE "Product"
ADD COLUMN "codigoBarras" TEXT;

CREATE INDEX "Product_codigoBarras_activo_idx"
ON "Product"("codigoBarras", "activo");
