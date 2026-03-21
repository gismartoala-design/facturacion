CREATE TYPE "DocumentSeriesType" AS ENUM (
  'INVOICE',
  'SALES_NOTE',
  'CREDIT_NOTE',
  'DEBIT_NOTE'
);

CREATE TABLE "DocumentIssuer" (
  "id" UUID NOT NULL,
  "businessId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "legalName" TEXT,
  "ruc" TEXT,
  "environment" TEXT NOT NULL DEFAULT 'PRUEBAS',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentIssuer_pkey" PRIMARY KEY ("id")
);

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

ALTER TABLE "SaleDocument"
ADD COLUMN "documentSeriesId" UUID,
ADD COLUMN "establishmentCode" TEXT,
ADD COLUMN "emissionPointCode" TEXT,
ADD COLUMN "sequenceNumber" INTEGER,
ADD COLUMN "fullNumber" TEXT;

CREATE UNIQUE INDEX "DocumentIssuer_businessId_code_key"
ON "DocumentIssuer"("businessId", "code");

CREATE INDEX "DocumentIssuer_businessId_active_idx"
ON "DocumentIssuer"("businessId", "active");

CREATE UNIQUE INDEX "DocumentSeries_issuerId_documentType_establishmentCode_emissionPointCode_key"
ON "DocumentSeries"("issuerId", "documentType", "establishmentCode", "emissionPointCode");

CREATE INDEX "DocumentSeries_issuerId_documentType_active_idx"
ON "DocumentSeries"("issuerId", "documentType", "active");

CREATE UNIQUE INDEX "SaleDocument_documentSeriesId_sequenceNumber_key"
ON "SaleDocument"("documentSeriesId", "sequenceNumber");

ALTER TABLE "DocumentIssuer"
ADD CONSTRAINT "DocumentIssuer_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentSeries"
ADD CONSTRAINT "DocumentSeries_issuerId_fkey"
FOREIGN KEY ("issuerId") REFERENCES "DocumentIssuer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleDocument"
ADD CONSTRAINT "SaleDocument_documentSeriesId_fkey"
FOREIGN KEY ("documentSeriesId") REFERENCES "DocumentSeries"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
