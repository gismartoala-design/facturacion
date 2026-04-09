import type {
  AccountGroupKey,
  AccountNature,
  AccountRow,
} from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";

export type AccountFormState = {
  code: string;
  name: string;
  groupKey: AccountGroupKey;
  defaultNature: AccountNature;
  parentId: string | null;
  acceptsPostings: boolean;
  active: boolean;
  description: string;
};

export type SnackbarState =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

export const GROUP_OPTIONS: Array<{ value: AccountGroupKey; label: string }> = [
  { value: "ASSET", label: "Activo" },
  { value: "LIABILITY", label: "Pasivo" },
  { value: "EQUITY", label: "Patrimonio" },
  { value: "INCOME", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
];

export const NATURE_OPTIONS: Array<{ value: AccountNature; label: string }> = [
  { value: "DEBIT", label: "Debito" },
  { value: "CREDIT", label: "Credito" },
];

export const DEFAULT_NATURE_BY_GROUP: Record<AccountGroupKey, AccountNature> = {
  ASSET: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  INCOME: "CREDIT",
  EXPENSE: "DEBIT",
};

export function createEmptyForm(): AccountFormState {
  return {
    code: "",
    name: "",
    groupKey: "ASSET",
    defaultNature: "DEBIT",
    parentId: null,
    acceptsPostings: true,
    active: true,
    description: "",
  };
}

export function mapAccountToForm(account: AccountRow): AccountFormState {
  return {
    code: account.code,
    name: account.name,
    groupKey: account.groupKey,
    defaultNature: account.defaultNature,
    parentId: account.parentId,
    acceptsPostings: account.acceptsPostings,
    active: account.active,
    description: account.description ?? "",
  };
}

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}
