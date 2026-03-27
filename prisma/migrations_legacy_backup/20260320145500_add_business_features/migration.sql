-- CreateEnum
CREATE TYPE "BusinessFeatureKey" AS ENUM ('BILLING', 'POS', 'QUOTES');

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

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
    "issuerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessFeature_businessId_key_key" ON "BusinessFeature"("businessId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_businessId_key" ON "TaxProfile"("businessId");

-- Seed default business for existing single-tenant installations
INSERT INTO "Business" ("id", "name", "legalName", "slug", "isActive", "createdAt", "updatedAt")
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Negocio Principal',
  'Negocio Principal',
  'default',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "BusinessFeature" ("id", "businessId", "key", "enabled", "createdAt", "updatedAt")
VALUES
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'BILLING', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'QUOTES', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'POS', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("businessId", "key") DO NOTHING;

INSERT INTO "TaxProfile" (
  "id",
  "businessId",
  "profileType",
  "requiresElectronicBilling",
  "allowsSalesNote",
  "createdAt",
  "updatedAt"
)
VALUES (
  '11111111-1111-1111-1111-111111111115',
  '11111111-1111-1111-1111-111111111111',
  'GENERAL',
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("businessId") DO NOTHING;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "businessId" UUID;

UPDATE "User"
SET "businessId" = '11111111-1111-1111-1111-111111111111'
WHERE "businessId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "businessId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFeature" ADD CONSTRAINT "BusinessFeature_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
