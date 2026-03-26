export const MODULE_KEYS = [
  "POS",
  "BILLING",
  "QUOTES",
  "REPORTS",
  "ACCOUNTS_RECEIVABLE",
  "CASH_MANAGEMENT",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const EDITION_KEYS = [
  "STARTER",
  "GROWTH",
  "ENTERPRISE",
] as const;

export type EditionKey = (typeof EDITION_KEYS)[number];

export const POLICY_PACK_KEYS = [
  "POS_GENERIC",
  "POS_BUTCHERY",
  "POS_RESTAURANT",
] as const;

export type PolicyPackKey = (typeof POLICY_PACK_KEYS)[number];

export const CAPABILITY_KEYS = [
  "POS_SCALE_BARCODES",
  "POS_WEIGHT_FROM_BARCODE",
  "POS_TRACK_INVENTORY_ON_SALE",
  "POS_TABLE_SERVICE",
  "POS_KITCHEN_TICKETS",
  "AUDIT_LOG",
  "APPROVAL_FLOWS",
  "CASH_SESSION_REQUIRED",
  "CASH_DECLARED_CLOSING",
  "CASH_WITHDRAWALS",
  "CASH_DEPOSITS",
  "CASH_SHIFT_RECONCILIATION",
  "CASH_BLIND_CLOSE",
  "CASH_APPROVAL_CLOSE",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
