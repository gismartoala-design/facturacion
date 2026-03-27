-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BIEN', 'SERVICIO');

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tipoProducto" "ProductType" NOT NULL DEFAULT 'BIEN';

-- CreateIndex
CREATE INDEX "Product_sku_activo_idx" ON "Product"("sku", "activo");
