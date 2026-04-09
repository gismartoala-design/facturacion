CREATE TYPE "AccountingAccountGroupKey" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

CREATE TYPE "AccountingAccountNature" AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE "AccountingAccount" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupKey" "AccountingAccountGroupKey" NOT NULL,
    "defaultNature" "AccountingAccountNature" NOT NULL,
    "parentId" UUID,
    "level" INTEGER NOT NULL DEFAULT 1,
    "acceptsPostings" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingAccount_businessId_code_key" ON "AccountingAccount"("businessId", "code");
CREATE INDEX "AccountingAccount_businessId_groupKey_active_idx" ON "AccountingAccount"("businessId", "groupKey", "active");
CREATE INDEX "AccountingAccount_parentId_idx" ON "AccountingAccount"("parentId");

ALTER TABLE "AccountingAccount"
ADD CONSTRAINT "AccountingAccount_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountingAccount"
ADD CONSTRAINT "AccountingAccount_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "AccountingAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
