export type Product = {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  tarifaIva: number;
  stock: number;
  minStock: number;
};

export type StockItem = {
  productId: string;
  productName: string;
  codigo: string;
  quantity: number;
  minQuantity: number;
  lowStock: boolean;
};

export type Customer = {
  id: string;
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  purchaseCount: number;
  lastPurchaseAt?: string | null;
};

export type SriInvoice = {
  id: string;
  saleNumber: string;
  status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  retryCount: number;
  lastError?: string | null;
};

export type LineItem = {
  productId: string;
  cantidad: number;
  descuento: number;
};

export type LinePreviewItem = {
  productId: string;
  cantidad: number;
  descuento: number;
  product: Product;
  subtotal: number;
  iva: number;
  total: number;
};

export type SaleItemDetail = {
  id: string;
  productId: string;
  product: Product;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  valorIva: number;
  total: number;
};

export type SalePaymentDetail = {
  id: string;
  formaPago: string;
  amount: number;
  plazo: number;
  unidadTiempo: string;
};

export type SriInvoiceDetail = SriInvoice & {
  sale: {
    customer: Customer;
    items: SaleItemDetail[];
    payments: SalePaymentDetail[];
    subtotal: number;
    taxTotal: number;
    total: number;
  };
  documents?: {
    xmlSignedPath?: string | null;
    xmlAuthorizedPath?: string | null;
    ridePdfPath?: string | null;
  } | null;
  claveAcceso?: string | null;
  authorizationNumber?: string | null;
  sriReceptionStatus?: string | null;
  sriAuthorizationStatus?: string | null;
};

export type SectionKey = "overview" | "products" | "inventory" | "checkout" | "sri";

export type IdentificationTypeOption = {
  code: string;
  label: string;
};

export type PaymentMethodOption = {
  code: string;
  label: string;
};

export const IDENTIFICATION_TYPES: IdentificationTypeOption[] = [
  { code: "04", label: "RUC" },
  { code: "05", label: "Cedula" },
  { code: "06", label: "Pasaporte" },
  { code: "07", label: "Consumidor final" },
  { code: "08", label: "Identificacion del exterior" },
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { code: "01", label: "Sin utilizacion del sistema financiero" },
  { code: "16", label: "Tarjeta de debito" },
  { code: "19", label: "Tarjeta de credito" },
  { code: "20", label: "Otros con utilizacion del sistema financiero" },
  { code: "15", label: "Compensacion de deudas" },
];

export type NewProductForm = {
  nombre: string;
  sku: string;
  precio: string;
  tarifaIva: string;
  stockInicial: string;
  minStock: string;
};

export type StockAdjustmentForm = {
  productId: string;
  movementType: "IN" | "OUT" | "ADJUSTMENT";
  quantity: string;
};

export type CheckoutForm = {
  issuerId: string;
  fechaEmision: string;
  tipoIdentificacion: string;
  identificacion: string;
  razonSocial: string;
  direccion: string;
  email: string;
  telefono: string;
  formaPago: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: PaginationMeta;
};
