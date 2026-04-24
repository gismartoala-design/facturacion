import { z } from "zod";

export const createSupplierPaymentSchema = z.object({
  payableId: z.string().uuid(),
  amount: z.number().positive().max(999999),
  paymentMethod: z.string().trim().min(2).max(40),
  externalReference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
  paidAt: z.coerce.date().optional(),
});

export const voidSupplierPaymentSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
