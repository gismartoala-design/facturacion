-- CreateEnum
CREATE TYPE "PosCashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "PosCashSession" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "openedById" UUID NOT NULL,
    "closedById" UUID,
    "status" "PosCashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "closingAmount" DECIMAL(12,2),
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosCashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosHeldSale" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosHeldSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosCashSession_businessId_status_openedAt_idx" ON "PosCashSession"("businessId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "PosCashSession_openedById_status_idx" ON "PosCashSession"("openedById", "status");

-- CreateIndex
CREATE INDEX "PosHeldSale_businessId_createdAt_idx" ON "PosHeldSale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PosHeldSale_createdById_updatedAt_idx" ON "PosHeldSale"("createdById", "updatedAt");

-- AddForeignKey
ALTER TABLE "PosCashSession" ADD CONSTRAINT "PosCashSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCashSession" ADD CONSTRAINT "PosCashSession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosCashSession" ADD CONSTRAINT "PosCashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosHeldSale" ADD CONSTRAINT "PosHeldSale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosHeldSale" ADD CONSTRAINT "PosHeldSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
