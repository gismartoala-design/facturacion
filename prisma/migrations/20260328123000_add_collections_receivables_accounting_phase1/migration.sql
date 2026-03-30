-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('POS', 'DIRECT_SALE', 'QUOTE');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'APPLIED', 'VOIDED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CollectionApplicationStatus" AS ENUM ('APPLIED', 'REVERSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AccountsReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountingEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AccountingSourceType" AS ENUM ('SALE', 'COLLECTION', 'CASH_MOVEMENT', 'REFUND', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN     "cashSessionId" UUID,
ADD COLUMN     "source" "SaleSource";

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "cashSessionId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'APPLIED',
    "affectsCashDrawer" BOOLEAN NOT NULL DEFAULT false,
    "requiresBankReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "externalReference" TEXT,
    "notes" TEXT,
    "registeredById" UUID,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionApplication" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "saleId" UUID,
    "receivableId" UUID,
    "appliedAmount" DECIMAL(12,2) NOT NULL,
    "status" "CollectionApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "createdById" UUID,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountsReceivable" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "saleId" UUID,
    "documentType" TEXT NOT NULL,
    "documentId" UUID,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "appliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(12,2) NOT NULL,
    "status" "AccountsReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEntry" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "sourceType" "AccountingSourceType" NOT NULL,
    "sourceId" UUID NOT NULL,
    "status" "AccountingEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEntryLine" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "accountCode" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_cashSessionId_createdAt_idx" ON "Sale"("cashSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Collection_businessId_collectedAt_idx" ON "Collection"("businessId", "collectedAt");

-- CreateIndex
CREATE INDEX "Collection_cashSessionId_collectedAt_idx" ON "Collection"("cashSessionId", "collectedAt");

-- CreateIndex
CREATE INDEX "Collection_customerId_collectedAt_idx" ON "Collection"("customerId", "collectedAt");

-- CreateIndex
CREATE INDEX "Collection_status_collectedAt_idx" ON "Collection"("status", "collectedAt");

-- CreateIndex
CREATE INDEX "CollectionApplication_collectionId_appliedAt_idx" ON "CollectionApplication"("collectionId", "appliedAt");

-- CreateIndex
CREATE INDEX "CollectionApplication_saleId_appliedAt_idx" ON "CollectionApplication"("saleId", "appliedAt");

-- CreateIndex
CREATE INDEX "CollectionApplication_receivableId_appliedAt_idx" ON "CollectionApplication"("receivableId", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivable_saleId_key" ON "AccountsReceivable"("saleId");

-- CreateIndex
CREATE INDEX "AccountsReceivable_businessId_status_issuedAt_idx" ON "AccountsReceivable"("businessId", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "AccountsReceivable_customerId_status_dueAt_idx" ON "AccountsReceivable"("customerId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "AccountingEntry_businessId_sourceType_sourceId_idx" ON "AccountingEntry"("businessId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AccountingEntry_status_createdAt_idx" ON "AccountingEntry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountingEntryLine_entryId_idx" ON "AccountingEntryLine"("entryId");

-- CreateIndex
CREATE INDEX "AccountingEntryLine_accountCode_idx" ON "AccountingEntryLine"("accountCode");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "AccountsReceivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionApplication" ADD CONSTRAINT "CollectionApplication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsReceivable" ADD CONSTRAINT "AccountsReceivable_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntryLine" ADD CONSTRAINT "AccountingEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AccountingEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
