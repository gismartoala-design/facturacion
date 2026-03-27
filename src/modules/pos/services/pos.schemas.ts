import { z } from "zod";

import { checkoutDocumentTypeSchema } from "@/core/sales/schemas";

export const openCashSessionSchema = z.object({
  openingAmount: z.number().min(0).max(999999),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export const closeCashSessionSchema = z.object({
  closingAmount: z.number().min(0).max(999999),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export const heldSalePayloadSchema = z.object({
  documentType: checkoutDocumentTypeSchema.default("NONE"),
  paymentMethod: z.string().trim().min(2).max(4).default("01"),
  payments: z.array(z.object({
    formaPago: z.string().trim().min(2).max(4),
    total: z.number().min(0),
  })).min(1).optional(),
  customer: z.object({
    tipoIdentificacion: z.string().trim().max(2).default("07"),
    identificacion: z.string().trim().max(20).default("9999999999999"),
    razonSocial: z.string().trim().max(200).default("Consumidor final"),
    direccion: z.string().trim().max(250).optional().or(z.literal("")),
    email: z.string().trim().max(160).optional().or(z.literal("")),
    telefono: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  items: z.array(z.object({
    productId: z.string().uuid(),
    cantidad: z.number().positive(),
    precioUnitario: z.number().positive(),
    descuento: z.number().min(0).default(0),
  })).min(1),
});

export const holdSaleSchema = z.object({
  heldSaleId: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(80),
  payload: heldSalePayloadSchema,
});

export type HoldSalePayload = z.infer<typeof heldSalePayloadSchema>;
