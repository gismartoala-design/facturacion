import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  productCode: z.string().trim().min(1).max(40).optional(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().positive().optional(),
  descuento: z.number().min(0).default(0),
  tarifaIva: z.number().min(0).max(100).optional(),
});

const paymentSchema = z.object({
  formaPago: z.string().trim().min(2).max(4),
  total: z.number().positive(),
  plazo: z.number().int().min(0).default(0),
  unidadTiempo: z.string().trim().min(2).max(20).default("DIAS"),
});

export const checkoutSchema = z.object({
  issuerId: z.string().uuid(),
  fechaEmision: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  moneda: z.string().default("USD"),
  customer: z.object({
    tipoIdentificacion: z.string().trim().min(2).max(2),
    identificacion: z.string().trim().min(5).max(20),
    razonSocial: z.string().trim().min(2).max(200),
    direccion: z.string().trim().max(250).optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
    telefono: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  infoAdicional: z.record(z.string(), z.unknown()).optional().default({}),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
