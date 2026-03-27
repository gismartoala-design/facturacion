-- CreateEnum
CREATE TYPE "BusinessFeatureKey" AS ENUM ('BILLING', 'POS', 'QUOTES');

-- CreateEnum
CREATE TYPE "SaleDocumentType" AS ENUM ('NONE', 'INVOICE');

-- CreateEnum
CREATE TYPE "SaleDocumentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ISSUED', 'ERROR', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosCashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DocumentSeriesType" AS ENUM ('INVOICE', 'SALES_NOTE', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "codigoBarras" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "businessId" UUID;

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "ruc" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Business" (
  "id", "name", "legalName", "slug", "isActive", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'Negocio Principal',
  'Negocio Principal',
  'default',
  true,
  now(),
  now()
);

UPDATE "User"
SET "businessId" = (SELECT "id" FROM "Business" WHERE "slug" = 'default' LIMIT 1)
WHERE "businessId" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "businessId" SET NOT NULL;


-- CreateTable
CREATE TABLE "BusinessFeature" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "key" "BusinessFeatureKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "profileType" TEXT NOT NULL DEFAULT 'GENERAL',
    "requiresElectronicBilling" BOOLEAN NOT NULL DEFAULT true,
    "allowsSalesNote" BOOLEAN NOT NULL DEFAULT false,
    "accountingRequired" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'PRUEBAS',
    "taxNotes" TEXT,
    "issuerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentIssuer" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "ruc" TEXT,
    "externalIssuerId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'PRUEBAS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIssuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" UUID NOT NULL,
    "issuerId" UUID NOT NULL,
    "documentType" "DocumentSeriesType" NOT NULL,
    "establishmentCode" TEXT NOT NULL,
    "emissionPointCode" TEXT NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "SaleDocument" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "type" "SaleDocumentType" NOT NULL,
    "status" "SaleDocumentStatus" NOT NULL,
    "issuerId" UUID,
    "documentSeriesId" UUID,
    "establishmentCode" TEXT,
    "emissionPointCode" TEXT,
    "sequenceNumber" INTEGER,
    "fullNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "sriInvoiceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_ruc_key" ON "Business"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFeature_businessId_key_key" ON "BusinessFeature"("businessId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_businessId_key" ON "TaxProfile"("businessId");

-- CreateIndex
CREATE INDEX "DocumentIssuer_businessId_active_idx" ON "DocumentIssuer"("businessId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentIssuer_businessId_code_key" ON "DocumentIssuer"("businessId", "code");

-- CreateIndex
CREATE INDEX "DocumentSeries_issuerId_documentType_active_idx" ON "DocumentSeries"("issuerId", "documentType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSeries_issuerId_documentType_establishmentCode_emis_key" ON "DocumentSeries"("issuerId", "documentType", "establishmentCode", "emissionPointCode");

-- CreateIndex
CREATE INDEX "PosCashSession_businessId_status_openedAt_idx" ON "PosCashSession"("businessId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "PosCashSession_openedById_status_idx" ON "PosCashSession"("openedById", "status");

-- CreateIndex
CREATE INDEX "PosHeldSale_businessId_createdAt_idx" ON "PosHeldSale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PosHeldSale_createdById_updatedAt_idx" ON "PosHeldSale"("createdById", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_saleId_key" ON "SaleDocument"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_sriInvoiceId_key" ON "SaleDocument"("sriInvoiceId");

-- CreateIndex
CREATE INDEX "SaleDocument_type_status_createdAt_idx" ON "SaleDocument"("type", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_documentSeriesId_sequenceNumber_key" ON "SaleDocument"("documentSeriesId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "Product_codigoBarras_activo_idx" ON "Product"("codigoBarras", "activo");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessFeature" ADD CONSTRAINT "BusinessFeature_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentIssuer" ADD CONSTRAINT "DocumentIssuer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSeries" ADD CONSTRAINT "DocumentSeries_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "DocumentIssuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_documentSeriesId_fkey" FOREIGN KEY ("documentSeriesId") REFERENCES "DocumentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_sriInvoiceId_fkey" FOREIGN KEY ("sriInvoiceId") REFERENCES "SriInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

