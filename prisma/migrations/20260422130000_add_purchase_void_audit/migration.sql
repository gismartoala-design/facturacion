-- AlterTable
ALTER TABLE "Purchase"
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedById" UUID,
ADD COLUMN "voidReason" TEXT;

-- CreateIndex
CREATE INDEX "Purchase_voidedById_idx" ON "Purchase"("voidedById");

-- AddForeignKey
ALTER TABLE "Purchase"
ADD CONSTRAINT "Purchase_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
