-- CreateEnum
CREATE TYPE "AccountsPayableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('APPLIED', 'VOIDED');

-- CreateTable
CREATE TABLE "AccountsPayable" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingAmount" DECIMAL(12,2) NOT NULL,
    "status" "AccountsPayableStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsPayable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" UUID NOT NULL,
    "supplierPaymentNumber" BIGSERIAL NOT NULL,
    "businessId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "payableId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" "SupplierPaymentStatus" NOT NULL DEFAULT 'APPLIED',
    "externalReference" TEXT,
    "notes" TEXT,
    "registeredById" UUID,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedById" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountsPayable_purchaseId_key" ON "AccountsPayable"("purchaseId");

-- CreateIndex
CREATE INDEX "AccountsPayable_businessId_status_issuedAt_idx" ON "AccountsPayable"("businessId", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "AccountsPayable_supplierId_status_dueAt_idx" ON "AccountsPayable"("supplierId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_supplierPaymentNumber_key" ON "SupplierPayment"("supplierPaymentNumber");

-- CreateIndex
CREATE INDEX "SupplierPayment_businessId_paidAt_idx" ON "SupplierPayment"("businessId", "paidAt");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_paidAt_idx" ON "SupplierPayment"("supplierId", "paidAt");

-- CreateIndex
CREATE INDEX "SupplierPayment_payableId_paidAt_idx" ON "SupplierPayment"("payableId", "paidAt");

-- CreateIndex
CREATE INDEX "SupplierPayment_status_paidAt_idx" ON "SupplierPayment"("status", "paidAt");

-- AddForeignKey
ALTER TABLE "AccountsPayable"
ADD CONSTRAINT "AccountsPayable_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable"
ADD CONSTRAINT "AccountsPayable_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountsPayable"
ADD CONSTRAINT "AccountsPayable_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_payableId_fkey"
FOREIGN KEY ("payableId") REFERENCES "AccountsPayable"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_registeredById_fkey"
FOREIGN KEY ("registeredById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment"
ADD CONSTRAINT "SupplierPayment_voidedById_fkey"
FOREIGN KEY ("voidedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
