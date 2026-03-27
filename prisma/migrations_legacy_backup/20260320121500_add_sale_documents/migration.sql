-- CreateEnum
CREATE TYPE "SaleDocumentType" AS ENUM ('NONE', 'INVOICE');

-- CreateEnum
CREATE TYPE "SaleDocumentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ISSUED', 'ERROR', 'VOIDED');

-- CreateTable
CREATE TABLE "SaleDocument" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "type" "SaleDocumentType" NOT NULL,
    "status" "SaleDocumentStatus" NOT NULL,
    "issuerId" UUID,
    "issuedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "sriInvoiceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_saleId_key" ON "SaleDocument"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_sriInvoiceId_key" ON "SaleDocument"("sriInvoiceId");

-- CreateIndex
CREATE INDEX "SaleDocument_type_status_createdAt_idx" ON "SaleDocument"("type", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_sriInvoiceId_fkey" FOREIGN KEY ("sriInvoiceId") REFERENCES "SriInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
