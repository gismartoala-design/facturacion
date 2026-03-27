-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "BusinessFeatureKey" AS ENUM ('BILLING', 'POS', 'QUOTES');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('SALE', 'PURCHASE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleDocumentType" AS ENUM ('NONE', 'INVOICE');

-- CreateEnum
CREATE TYPE "SaleDocumentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ISSUED', 'ERROR', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosCashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('OPEN', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SriInvoiceStatus" AS ENUM ('DRAFT', 'AUTHORIZED', 'PENDING_SRI', 'ERROR');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('BIEN', 'SERVICIO');

-- CreateEnum
CREATE TYPE "DocumentSeriesType" AS ENUM ('INVOICE', 'SALES_NOTE', 'CREDIT_NOTE', 'DEBIT_NOTE');

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
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SELLER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "secuencial" BIGSERIAL NOT NULL,
    "sku" TEXT,
    "codigoBarras" TEXT,
    "tipoProducto" "ProductType" NOT NULL DEFAULT 'BIEN',
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "tarifaIva" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "minQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "referenceType" "ReferenceType" NOT NULL,
    "referenceId" UUID,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "saleNumber" BIGSERIAL NOT NULL,
    "customerId" UUID NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL,
    "taxTotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "quoteNumber" BIGSERIAL NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'OPEN',
    "issuerId" UUID NOT NULL,
    "fechaEmision" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "formaPago" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL,
    "taxTotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "convertedSaleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tarifaIva" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "valorIva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tarifaIva" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "valorIva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "formaPago" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "plazo" INTEGER NOT NULL DEFAULT 0,
    "unidadTiempo" TEXT NOT NULL DEFAULT 'DIAS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "SriInvoice" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "issuerId" UUID NOT NULL,
    "externalInvoiceId" UUID,
    "secuencial" TEXT,
    "claveAcceso" TEXT,
    "status" "SriInvoiceStatus" NOT NULL DEFAULT 'PENDING_SRI',
    "sriReceptionStatus" TEXT,
    "sriAuthorizationStatus" TEXT,
    "authorizationNumber" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createRequestPayload" JSONB NOT NULL,
    "createResponsePayload" JSONB,
    "authorizeResponsePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SriInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SriInvoiceDocument" (
    "id" UUID NOT NULL,
    "sriInvoiceId" UUID NOT NULL,
    "xmlSignedPath" TEXT,
    "xmlAuthorizedPath" TEXT,
    "ridePdfPath" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SriInvoiceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" UUID NOT NULL,
    "service" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "httpStatus" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "PosCashSession_businessId_status_openedAt_idx" ON "PosCashSession"("businessId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "PosCashSession_openedById_status_idx" ON "PosCashSession"("openedById", "status");

-- CreateIndex
CREATE INDEX "PosHeldSale_businessId_createdAt_idx" ON "PosHeldSale"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PosHeldSale_createdById_updatedAt_idx" ON "PosHeldSale"("createdById", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tipoIdentificacion_identificacion_key" ON "Customer"("tipoIdentificacion", "identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Product_secuencial_key" ON "Product"("secuencial");

-- CreateIndex
CREATE INDEX "Product_sku_activo_idx" ON "Product"("sku", "activo");

-- CreateIndex
CREATE INDEX "Product_codigoBarras_activo_idx" ON "Product"("codigoBarras", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_productId_key" ON "StockLevel"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_status_createdAt_idx" ON "Quote"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_saleId_key" ON "SaleDocument"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_sriInvoiceId_key" ON "SaleDocument"("sriInvoiceId");

-- CreateIndex
CREATE INDEX "SaleDocument_type_status_createdAt_idx" ON "SaleDocument"("type", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDocument_documentSeriesId_sequenceNumber_key" ON "SaleDocument"("documentSeriesId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SriInvoice_saleId_key" ON "SriInvoice"("saleId");

-- CreateIndex
CREATE INDEX "SriInvoice_status_createdAt_idx" ON "SriInvoice"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SriInvoiceDocument_sriInvoiceId_key" ON "SriInvoiceDocument"("sriInvoiceId");

-- CreateIndex
CREATE INDEX "IntegrationLog_service_operation_createdAt_idx" ON "IntegrationLog"("service", "operation", "createdAt");

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
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_convertedSaleId_fkey" FOREIGN KEY ("convertedSaleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_documentSeriesId_fkey" FOREIGN KEY ("documentSeriesId") REFERENCES "DocumentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDocument" ADD CONSTRAINT "SaleDocument_sriInvoiceId_fkey" FOREIGN KEY ("sriInvoiceId") REFERENCES "SriInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SriInvoice" ADD CONSTRAINT "SriInvoice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SriInvoiceDocument" ADD CONSTRAINT "SriInvoiceDocument_sriInvoiceId_fkey" FOREIGN KEY ("sriInvoiceId") REFERENCES "SriInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

