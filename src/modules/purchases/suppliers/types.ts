export type Supplier = {
  id: string;
  businessId: string;
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  nombreComercial: string | null;
  contactoPrincipal: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  diasCredito: number;
  activo: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type SupplierForm = {
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  nombreComercial: string;
  contactoPrincipal: string;
  email: string;
  telefono: string;
  direccion: string;
  diasCredito: string;
};

export const SUPPLIER_IDENTIFICATION_TYPES = [
  { code: "04", label: "RUC" },
  { code: "05", label: "Cedula" },
  { code: "06", label: "Pasaporte" },
  { code: "08", label: "Identificacion del exterior" },
] as const;
