import { z } from "zod";

const dbUuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid database UUID",
  );

export const createCollectionDraftSchema = z.object({
  businessId: dbUuidSchema,
  customerId: z.string().uuid(),
  cashSessionId: z.string().uuid().optional().nullable(),
  amount: z.number().positive().max(999999),
  paymentMethod: z.string().trim().min(2).max(40),
  affectsCashDrawer: z.boolean().default(false),
  requiresBankReconciliation: z.boolean().default(false),
  externalReference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(240).optional().nullable(),
  registeredById: z.string().uuid().optional().nullable(),
  collectedAt: z.coerce.date().optional(),
});

export const createCollectionSchema = createCollectionDraftSchema.extend({
  status: z
    .enum(["PENDING", "APPLIED", "VOIDED", "REVERSED", "REFUNDED"])
    .default("APPLIED"),
});

export const applyCollectionSchema = z
  .object({
    collectionId: z.string().uuid(),
    saleId: z.string().uuid().optional().nullable(),
    receivableId: z.string().uuid().optional().nullable(),
    appliedAmount: z.number().positive().max(999999),
    notes: z.string().trim().max(240).optional().nullable(),
    createdById: z.string().uuid().optional().nullable(),
    appliedAt: z.coerce.date().optional(),
  })
  .refine((value) => Boolean(value.saleId || value.receivableId), {
    message: "Debes indicar una venta o una cuenta por cobrar",
    path: ["saleId"],
  });

export const reverseCollectionApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  notes: z.string().trim().max(240).optional().nullable(),
});

export const createReceivableSchema = z.object({
  businessId: dbUuidSchema,
  customerId: z.string().uuid(),
  saleId: z.string().uuid().optional().nullable(),
  documentType: z.string().trim().min(2).max(40),
  documentId: z.string().uuid().optional().nullable(),
  currency: z.string().trim().min(2).max(10).default("USD"),
  issuedAt: z.coerce.date(),
  dueAt: z.coerce.date().optional().nullable(),
  originalAmount: z.number().positive().max(999999),
  appliedAmount: z.number().min(0).max(999999).default(0),
  pendingAmount: z.number().min(0).max(999999),
  notes: z.string().trim().max(240).optional().nullable(),
});

export type CreateCollectionDraftInput = z.infer<
  typeof createCollectionDraftSchema
>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type ApplyCollectionInput = z.infer<typeof applyCollectionSchema>;
export type ReverseCollectionApplicationInput = z.infer<
  typeof reverseCollectionApplicationSchema
>;
export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;
