-- CreateEnum
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "RestaurantOrderChannel" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "RestaurantOrderStatus" AS ENUM ('OPEN', 'IN_PREPARATION', 'PARTIALLY_SERVED', 'SERVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RestaurantOrderItemStatus" AS ENUM ('PENDING', 'SENT', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELLED', 'BILLED');

-- CreateEnum
CREATE TYPE "KitchenTicketStatus" AS ENUM ('NEW', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KitchenTicketItemStatus" AS ENUM ('NEW', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "restaurantVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "restaurantCategory" TEXT,
ADD COLUMN "restaurantStationCode" TEXT,
ADD COLUMN "allowsModifiers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prepTimeMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Sale"
ADD COLUMN "restaurantOrderId" UUID;

-- CreateTable
CREATE TABLE "DiningArea" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "diningAreaId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableSession" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "openedById" UUID NOT NULL,
    "closedById" UUID,
    "status" "TableSessionStatus" NOT NULL DEFAULT 'OPEN',
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrder" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "tableSessionId" UUID,
    "customerId" UUID,
    "channel" "RestaurantOrderChannel" NOT NULL,
    "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'OPEN',
    "guestCount" INTEGER,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "deliveryAddress" TEXT,
    "deliveryReference" TEXT,
    "assignedDriverName" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "billedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "cancelledQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tarifaIva" DECIMAL(5,2) NOT NULL,
    "notes" TEXT,
    "status" "RestaurantOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "preparedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemModifier" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicket" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "stationId" UUID,
    "stationCode" TEXT NOT NULL,
    "status" "KitchenTicketStatus" NOT NULL DEFAULT 'NEW',
    "printedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenTicketItem" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" "KitchenTicketItemStatus" NOT NULL DEFAULT 'NEW',
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenTicketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "usePrepBatches" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepBatch" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "producedQuantity" DECIMAL(14,3) NOT NULL,
    "availableQuantity" DECIMAL(14,3) NOT NULL,
    "notes" TEXT,
    "producedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrepBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrepBatchConsumption" (
    "id" UUID NOT NULL,
    "prepBatchId" UUID NOT NULL,
    "restaurantOrderItemId" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepBatchConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItemSettlement" (
    "id" UUID NOT NULL,
    "restaurantOrderItemId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxTotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOrderItemSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_restaurantOrderId_createdAt_idx" ON "Sale"("restaurantOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiningArea_businessId_code_key" ON "DiningArea"("businessId", "code");
CREATE INDEX "DiningArea_businessId_active_sortOrder_idx" ON "DiningArea"("businessId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_businessId_code_key" ON "RestaurantTable"("businessId", "code");
CREATE INDEX "RestaurantTable_businessId_active_diningAreaId_idx" ON "RestaurantTable"("businessId", "active", "diningAreaId");

-- CreateIndex
CREATE INDEX "TableSession_businessId_status_openedAt_idx" ON "TableSession"("businessId", "status", "openedAt");
CREATE INDEX "TableSession_tableId_status_openedAt_idx" ON "TableSession"("tableId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "RestaurantOrder_businessId_status_createdAt_idx" ON "RestaurantOrder"("businessId", "status", "createdAt");
CREATE INDEX "RestaurantOrder_tableSessionId_status_idx" ON "RestaurantOrder"("tableSessionId", "status");
CREATE INDEX "RestaurantOrder_channel_status_createdAt_idx" ON "RestaurantOrder"("channel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_orderId_status_createdAt_idx" ON "RestaurantOrderItem"("orderId", "status", "createdAt");
CREATE INDEX "RestaurantOrderItem_productId_status_idx" ON "RestaurantOrderItem"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_businessId_code_key" ON "KitchenStation"("businessId", "code");
CREATE INDEX "KitchenStation_businessId_active_sortOrder_idx" ON "KitchenStation"("businessId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "KitchenTicket_businessId_status_createdAt_idx" ON "KitchenTicket"("businessId", "status", "createdAt");
CREATE INDEX "KitchenTicket_orderId_status_createdAt_idx" ON "KitchenTicket"("orderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "KitchenTicketItem_ticketId_status_createdAt_idx" ON "KitchenTicketItem"("ticketId", "status", "createdAt");
CREATE INDEX "KitchenTicketItem_orderItemId_status_createdAt_idx" ON "KitchenTicketItem"("orderItemId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_businessId_productId_key" ON "Recipe"("businessId", "productId");
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");
CREATE INDEX "RecipeIngredient_productId_idx" ON "RecipeIngredient"("productId");

-- CreateIndex
CREATE INDEX "PrepBatch_businessId_productId_producedAt_idx" ON "PrepBatch"("businessId", "productId", "producedAt");
CREATE INDEX "PrepBatchConsumption_prepBatchId_createdAt_idx" ON "PrepBatchConsumption"("prepBatchId", "createdAt");
CREATE INDEX "PrepBatchConsumption_restaurantOrderItemId_createdAt_idx" ON "PrepBatchConsumption"("restaurantOrderItemId", "createdAt");

-- CreateIndex
CREATE INDEX "RestaurantOrderItemSettlement_saleId_createdAt_idx" ON "RestaurantOrderItemSettlement"("saleId", "createdAt");
CREATE INDEX "RestaurantOrderItemSettlement_restaurantOrderItemId_createdAt_idx" ON "RestaurantOrderItemSettlement"("restaurantOrderItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_restaurantOrderId_fkey"
FOREIGN KEY ("restaurantOrderId") REFERENCES "RestaurantOrder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningArea"
ADD CONSTRAINT "DiningArea_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable"
ADD CONSTRAINT "RestaurantTable_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable"
ADD CONSTRAINT "RestaurantTable_diningAreaId_fkey"
FOREIGN KEY ("diningAreaId") REFERENCES "DiningArea"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_openedById_fkey"
FOREIGN KEY ("openedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_closedById_fkey"
FOREIGN KEY ("closedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder"
ADD CONSTRAINT "RestaurantOrder_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder"
ADD CONSTRAINT "RestaurantOrder_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder"
ADD CONSTRAINT "RestaurantOrder_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder"
ADD CONSTRAINT "RestaurantOrder_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem"
ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem"
ADD CONSTRAINT "RestaurantOrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemModifier"
ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "RestaurantOrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenStation"
ADD CONSTRAINT "KitchenStation_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket"
ADD CONSTRAINT "KitchenTicket_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket"
ADD CONSTRAINT "KitchenTicket_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicket"
ADD CONSTRAINT "KitchenTicket_stationId_fkey"
FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem"
ADD CONSTRAINT "KitchenTicketItem_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "KitchenTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenTicketItem"
ADD CONSTRAINT "KitchenTicketItem_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "RestaurantOrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe"
ADD CONSTRAINT "Recipe_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe"
ADD CONSTRAINT "Recipe_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient"
ADD CONSTRAINT "RecipeIngredient_recipeId_fkey"
FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient"
ADD CONSTRAINT "RecipeIngredient_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepBatch"
ADD CONSTRAINT "PrepBatch_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepBatch"
ADD CONSTRAINT "PrepBatch_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepBatchConsumption"
ADD CONSTRAINT "PrepBatchConsumption_prepBatchId_fkey"
FOREIGN KEY ("prepBatchId") REFERENCES "PrepBatch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrepBatchConsumption"
ADD CONSTRAINT "PrepBatchConsumption_restaurantOrderItemId_fkey"
FOREIGN KEY ("restaurantOrderItemId") REFERENCES "RestaurantOrderItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItemSettlement"
ADD CONSTRAINT "RestaurantOrderItemSettlement_restaurantOrderItemId_fkey"
FOREIGN KEY ("restaurantOrderItemId") REFERENCES "RestaurantOrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItemSettlement"
ADD CONSTRAINT "RestaurantOrderItemSettlement_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
