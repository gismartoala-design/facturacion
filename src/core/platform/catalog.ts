import type {
  CapabilityKey,
  EditionKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";

export const MODULE_CATALOG: Record<ModuleKey, { label: string }> = {
  POS: { label: "POS" },
  BILLING: { label: "Facturacion" },
  QUOTES: { label: "Cotizaciones" },
  REPORTS: { label: "Reportes" },
  ACCOUNTS_RECEIVABLE: { label: "Cuentas por cobrar" },
  CASH_MANAGEMENT: { label: "Gestion de caja" },
};

export const EDITION_CATALOG: Record<EditionKey, { label: string }> = {
  STARTER: { label: "Starter" },
  GROWTH: { label: "Growth" },
  ENTERPRISE: { label: "Enterprise" },
};

export const POLICY_PACK_CATALOG: Record<PolicyPackKey, { label: string }> = {
  POS_GENERIC: { label: "POS Generico" },
  POS_BUTCHERY: { label: "POS Carniceria" },
  POS_RESTAURANT: { label: "POS Restaurante" },
};

export const CAPABILITY_CATALOG: Record<CapabilityKey, { label: string }> = {
  POS_SCALE_BARCODES: { label: "Codigos de balanza" },
  POS_WEIGHT_FROM_BARCODE: { label: "Peso desde codigo de barras" },
  POS_TRACK_INVENTORY_ON_SALE: { label: "Controlar inventario al vender" },
  POS_TABLE_SERVICE: { label: "Servicio en mesas" },
  POS_KITCHEN_TICKETS: { label: "Tickets de cocina" },
  AUDIT_LOG: { label: "Bitacora de auditoria" },
  APPROVAL_FLOWS: { label: "Flujos de aprobacion" },
  CASH_SESSION_REQUIRED: { label: "Apertura de caja obligatoria" },
  CASH_DECLARED_CLOSING: { label: "Cierre con monto declarado" },
  CASH_WITHDRAWALS: { label: "Retiros de caja" },
  CASH_DEPOSITS: { label: "Aportes de caja" },
  CASH_SHIFT_RECONCILIATION: { label: "Arqueo por denominacion" },
  CASH_BLIND_CLOSE: { label: "Cierre ciego" },
  CASH_APPROVAL_CLOSE: { label: "Cierre con aprobacion" },
};
