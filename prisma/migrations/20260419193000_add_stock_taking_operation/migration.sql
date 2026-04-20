-- CreateEnum
CREATE TYPE "StockTakingStatus" AS ENUM ('DRAFT', 'APPLIED');

-- CreateTable
CREATE TABLE "StockTaking" (
    "id" UUID NOT NULL,
    "takingNumber" BIGSERIAL NOT NULL,
    "businessId" UUID NOT NULL,
    "status" "StockTakingStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "appliedById" UUID,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTaking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTakingItem" (
    "id" UUID NOT NULL,
    "stockTakingId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "systemQuantity" DECIMAL(14,3) NOT NULL,
    "countedQuantity" DECIMAL(14,3) NOT NULL,
    "differenceQuantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTakingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockTaking_takingNumber_key" ON "StockTaking"("takingNumber");

-- CreateIndex
CREATE INDEX "StockTaking_businessId_status_createdAt_idx" ON "StockTaking"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StockTakingItem_stockTakingId_idx" ON "StockTakingItem"("stockTakingId");

-- CreateIndex
CREATE INDEX "StockTakingItem_productId_idx" ON "StockTakingItem"("productId");

-- AddForeignKey
ALTER TABLE "StockTaking" ADD CONSTRAINT "StockTaking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTaking" ADD CONSTRAINT "StockTaking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTaking" ADD CONSTRAINT "StockTaking_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakingItem" ADD CONSTRAINT "StockTakingItem_stockTakingId_fkey" FOREIGN KEY ("stockTakingId") REFERENCES "StockTaking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTakingItem" ADD CONSTRAINT "StockTakingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
