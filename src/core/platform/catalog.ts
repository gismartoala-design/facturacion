import type {
  CapabilityKey,
  EditionKey,
  ModuleKey,
  PolicyPackKey,
} from "@/core/platform/contracts";

export const MODULE_CATALOG: Record<
  ModuleKey,
  { label: string; description: string }
> = {
  POS: { label: "POS", description: "Terminal de venta y flujos de mostrador." },
  BILLING: { label: "Facturacion", description: "Documentos, SRI y emision comercial." },
  QUOTES: { label: "Cotizaciones", description: "Proformas, conversion y seguimiento." },
  REPORTS: { label: "Reportes", description: "Analitica y lectura operativa del negocio." },
  ACCOUNTS_RECEIVABLE: { label: "Cuentas por cobrar", description: "Ventas a credito y cartera." },
  CASH_MANAGEMENT: { label: "Gestion de caja", description: "Apertura, cierre y movimientos de caja." },
};

export const EDITION_CATALOG: Record<EditionKey, { label: string }> = {
  STARTER: { label: "Starter" },
  GROWTH: { label: "Growth" },
  ENTERPRISE: { label: "Enterprise" },
};

export const POLICY_PACK_CATALOG: Record<
  PolicyPackKey,
  { label: string; description: string; requiresModules: ModuleKey[] }
> = {
  POS_GENERIC: {
    label: "Generico",
    description: "Base operativa estandar para experiencias de venta.",
    requiresModules: ["POS"],
  },
  POS_BUTCHERY: {
    label: "Carniceria",
    description: "Composicion orientada a balanza, peso y cantidades variables.",
    requiresModules: ["POS"],
  },
  POS_RESTAURANT: {
    label: "Restaurante",
    description: "Composicion para mesas, cocina y tiempos de servicio.",
    requiresModules: ["POS"],
  },
};

export const CAPABILITY_CATALOG: Record<
  CapabilityKey,
  { label: string; description: string; requiresModules: ModuleKey[] }
> = {
  POS_SCALE_BARCODES: {
    label: "Codigos de balanza",
    description: "Permite interpretar codigos emitidos por balanza.",
    requiresModules: ["POS"],
  },
  POS_WEIGHT_FROM_BARCODE: {
    label: "Peso desde codigo de barras",
    description: "Convierte el peso codificado en cantidad de venta.",
    requiresModules: ["POS"],
  },
  POS_TRACK_INVENTORY_ON_SALE: {
    label: "Controlar inventario al vender",
    description: "Descuenta stock al confirmar ventas operativas.",
    requiresModules: ["POS"],
  },
  POS_TABLE_SERVICE: {
    label: "Servicio en mesas",
    description: "Habilita gestion de mesas y consumo por atencion.",
    requiresModules: ["POS"],
  },
  POS_KITCHEN_TICKETS: {
    label: "Tickets de cocina",
    description: "Genera salidas separadas para preparacion interna.",
    requiresModules: ["POS"],
  },
  AUDIT_LOG: {
    label: "Bitacora de auditoria",
    description: "Aumenta trazabilidad operativa y control interno.",
    requiresModules: ["BILLING"],
  },
  APPROVAL_FLOWS: {
    label: "Flujos de aprobacion",
    description: "Agrega controles previos a operaciones sensibles.",
    requiresModules: ["BILLING"],
  },
  CASH_SESSION_REQUIRED: {
    label: "Apertura de caja obligatoria",
    description: "Exige sesion de caja activa para operar.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_DECLARED_CLOSING: {
    label: "Cierre con monto declarado",
    description: "Solicita valor declarado al cierre de caja.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_WITHDRAWALS: {
    label: "Retiros de caja",
    description: "Permite registrar egresos manuales de caja.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_DEPOSITS: {
    label: "Aportes de caja",
    description: "Permite registrar ingresos manuales de caja.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_SHIFT_RECONCILIATION: {
    label: "Arqueo por denominacion",
    description: "Desglosa el cierre por billetes y monedas.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_BLIND_CLOSE: {
    label: "Cierre ciego",
    description: "Oculta montos esperados hasta finalizar el cierre.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
  CASH_APPROVAL_CLOSE: {
    label: "Cierre con aprobacion",
    description: "Requiere validacion adicional para confirmar el cierre.",
    requiresModules: ["CASH_MANAGEMENT"],
  },
};
