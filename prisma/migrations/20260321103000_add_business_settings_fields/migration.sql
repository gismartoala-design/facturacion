ALTER TABLE "Business"
ADD COLUMN "ruc" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT;

ALTER TABLE "TaxProfile"
ADD COLUMN "accountingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'PRUEBAS',
ADD COLUMN "taxNotes" TEXT;

CREATE UNIQUE INDEX "Business_ruc_key" ON "Business"("ruc");
