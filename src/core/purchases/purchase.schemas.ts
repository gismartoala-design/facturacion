import { z } from "zod";

const purchaseDocumentTypeSchema = z.enum([
  "FACTURA",
  "NOTA_VENTA",
  "LIQUIDACION",
  "OTRO",
]);

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid(),
  documentType: purchaseDocumentTypeSchema.default("FACTURA"),
  documentNumber: z.string().trim().min(3).max(60),
  authorizationNumber: z.string().trim().max(80).optional().or(z.literal("")),
  issuedAt: z.coerce.date(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        discount: z.number().min(0).default(0),
        taxRate: z.number().min(0).max(100).default(15),
      }),
    )
    .min(1, "La compra debe tener al menos un producto"),
});

export const voidPurchaseSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
