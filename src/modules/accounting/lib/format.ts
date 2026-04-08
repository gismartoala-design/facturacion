export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-EC", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export const ACCOUNTING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  POSTED: "Posteado",
  REVERSED: "Reversado",
};

export const ACCOUNTING_STATUS_TONES: Record<
  string,
  "default" | "success" | "warning" | "error"
> = {
  DRAFT: "warning",
  POSTED: "success",
  REVERSED: "error",
};

export const ACCOUNTING_SOURCE_LABELS: Record<string, string> = {
  SALE: "Venta",
  COLLECTION: "Cobro",
  CASH_MOVEMENT: "Movimiento de caja",
  REFUND: "Devolucion",
  ADJUSTMENT: "Ajuste",
};

export const ACCOUNTING_GROUP_TONES: Record<
  string,
  "primary" | "success" | "warning" | "error"
> = {
  ASSET: "primary",
  LIABILITY: "warning",
  INCOME: "success",
  EXPENSE: "error",
};
