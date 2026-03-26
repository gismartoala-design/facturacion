import { z } from "zod";

export const openCashSessionSchema = z.object({
  openingAmount: z.number().min(0).max(999999),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export const closeCashSessionSchema = z.object({
  sessionId: z.string().uuid("El ID de sesion debe ser un UUID valido"),
  declaredAmount: z.number().min(0).max(999999),
  notes: z.string().trim().max(240).optional().or(z.literal("")),
});

export const registerMovementSchema = z.object({
  type: z.enum(["MANUAL_IN", "WITHDRAWAL", "REFUND_OUT"]),
  amount: z.number().positive().max(999999),
  description: z.string().trim().max(240).optional().or(z.literal("")),
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
export type RegisterMovementInput = z.infer<typeof registerMovementSchema>;
