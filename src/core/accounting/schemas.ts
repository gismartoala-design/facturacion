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

export const accountLedgerFiltersSchema = z.object({
  accountCode: z.string().trim().min(1).max(40),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const accountTrialBalanceFiltersSchema = z.object({
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  onlyPostable: z.coerce.boolean().default(true),
  includeZeroBalances: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false),
});

export const balanceSheetFiltersSchema = z.object({
  to: z.string().trim().min(1).optional(),
  includeZeroBalances: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false),
});

export const incomeStatementFiltersSchema = z.object({
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  includeZeroBalances: z.coerce.boolean().default(false),
  includeInactive: z.coerce.boolean().default(false),
});

export const createManualAdjustmentEntrySchema = z.object({
  autoPost: z.boolean().default(true),
  lines: z.array(accountingEntryLineSchema).min(2),
});

export const accountingAccountBaseSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  groupKey: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  defaultNature: z.enum(["DEBIT", "CREDIT"]),
  parentId: z.string().uuid().nullable().optional(),
  acceptsPostings: z.boolean(),
  active: z.boolean().default(true),
  description: z.string().trim().max(240).nullable().optional(),
});

export const importAccountingAccountRowSchema = accountingAccountBaseSchema.extend({
  parentCode: z.string().trim().min(1).max(40).nullable().optional(),
});

export const importAccountingAccountsSchema = z.object({
  overwriteExisting: z.boolean().default(true),
  rows: z.array(importAccountingAccountRowSchema).min(1),
});

export const createAccountingAccountSchema = accountingAccountBaseSchema;

export const updateAccountingAccountSchema = accountingAccountBaseSchema.extend({
  id: z.string().uuid(),
});

export type CreateDraftEntryInput = z.infer<typeof createDraftEntrySchema>;
export type PostEntryInput = z.infer<typeof postEntrySchema>;
export type ReverseEntryInput = z.infer<typeof reverseEntrySchema>;
export type ListAccountingEntriesFilters = z.infer<
  typeof listAccountingEntriesFiltersSchema
>;
export type AccountLedgerFilters = z.infer<typeof accountLedgerFiltersSchema>;
export type AccountTrialBalanceFilters = z.infer<
  typeof accountTrialBalanceFiltersSchema
>;
export type BalanceSheetFilters = z.infer<typeof balanceSheetFiltersSchema>;
export type IncomeStatementFilters = z.infer<typeof incomeStatementFiltersSchema>;
export type CreateManualAdjustmentEntryInput = z.infer<
  typeof createManualAdjustmentEntrySchema
>;
export type CreateAccountingAccountInput = z.infer<
  typeof createAccountingAccountSchema
>;
export type UpdateAccountingAccountInput = z.infer<
  typeof updateAccountingAccountSchema
>;
export type ImportAccountingAccountRowInput = z.infer<
  typeof importAccountingAccountRowSchema
>;
export type ImportAccountingAccountsInput = z.infer<
  typeof importAccountingAccountsSchema
>;
