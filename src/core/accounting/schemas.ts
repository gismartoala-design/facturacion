import { z } from "zod";

const dbUuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid database UUID",
  );

export const accountingEntryLineSchema = z.object({
  accountCode: z.string().trim().min(1).max(40),
  debit: z.number().min(0).max(999999).default(0),
  credit: z.number().min(0).max(999999).default(0),
  memo: z.string().trim().max(240).optional().nullable(),
});

export const createDraftEntrySchema = z.object({
  businessId: dbUuidSchema,
  sourceType: z.enum(["SALE", "COLLECTION", "CASH_MOVEMENT", "REFUND", "ADJUSTMENT"]),
  sourceId: z.string().uuid(),
  lines: z.array(accountingEntryLineSchema).min(1),
});

export const postEntrySchema = z.object({
  entryId: z.string().uuid(),
});

export const reverseEntrySchema = z.object({
  entryId: z.string().uuid(),
});

export const listAccountingEntriesFiltersSchema = z.object({
  status: z
    .enum(["DRAFT", "POSTED", "REVERSED"])
    .optional(),
  sourceType: z
    .enum(["SALE", "COLLECTION", "CASH_MOVEMENT", "REFUND", "ADJUSTMENT"])
    .optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const createManualAdjustmentEntrySchema = z.object({
  autoPost: z.boolean().default(true),
  lines: z.array(accountingEntryLineSchema).min(2),
});

export type CreateDraftEntryInput = z.infer<typeof createDraftEntrySchema>;
export type PostEntryInput = z.infer<typeof postEntrySchema>;
export type ReverseEntryInput = z.infer<typeof reverseEntrySchema>;
export type ListAccountingEntriesFilters = z.infer<
  typeof listAccountingEntriesFiltersSchema
>;
export type CreateManualAdjustmentEntryInput = z.infer<
  typeof createManualAdjustmentEntrySchema
>;
