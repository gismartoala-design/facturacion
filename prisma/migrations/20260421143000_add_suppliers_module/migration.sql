-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "contactoPrincipal" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_businessId_tipoIdentificacion_identificacion_key" ON "Supplier"("businessId", "tipoIdentificacion", "identificacion");

-- CreateIndex
CREATE INDEX "Supplier_businessId_activo_razonSocial_idx" ON "Supplier"("businessId", "activo", "razonSocial");

-- AddForeignKey
ALTER TABLE "Supplier"
ADD CONSTRAINT "Supplier_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
