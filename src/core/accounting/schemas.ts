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

export type CreateDraftEntryInput = z.infer<typeof createDraftEntrySchema>;
export type PostEntryInput = z.infer<typeof postEntrySchema>;
export type ReverseEntryInput = z.infer<typeof reverseEntrySchema>;
