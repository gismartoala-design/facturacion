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
};
