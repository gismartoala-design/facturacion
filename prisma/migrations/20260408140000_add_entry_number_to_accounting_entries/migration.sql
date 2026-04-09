-- AlterTable
ALTER TABLE "AccountingEntry" ADD COLUMN "entryNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "AccountingEntry_businessId_entryNumber_key" ON "AccountingEntry"("businessId", "entryNumber");
