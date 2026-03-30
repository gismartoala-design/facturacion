export type ProductType = "BIEN" | "SERVICIO";

export type Product = {
  id: string;
  codigo: string;
  sku: string | null;
  codigoBarras: string | null;
  tipoProducto: ProductType;
  nombre: string;
  descripcion: string | null;
  precio: number;
  tarifaIva: number;
  activo: boolean;
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
  externalInvoiceId?: string | null;
  secuencial?: string | null;
  documentFullNumber?: string | null;
  createdAt?: string;
  authorizedAt?: string | null;
  saleStatus?: "COMPLETED" | "CANCELLED";
  saleNumber: string;
  status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  retryCount: number;
  lastError?: string | null;
};

export type LineItem = {
  productId: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
};

export type LinePreviewItem = {
  productId: string;
  precioUnitario: number;
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
    id: string;
    status: "COMPLETED" | "CANCELLED";
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
  documentFullNumber?: string | null;
  claveAcceso?: string | null;
  authorizationNumber?: string | null;
  sriReceptionStatus?: string | null;
  sriAuthorizationStatus?: string | null;
};

export type QuoteStatus = "OPEN" | "CONVERTED" | "CANCELLED";

export type Quote = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  issuerId: string;
  fechaEmision: string;
  moneda: string;
  formaPago: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  convertedSaleId?: string | null;
  customerName: string;
  customerIdentification: string;
  createdAt: string;
  updatedAt: string;
};

export type QuoteDetailItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tarifaIva: number;
  subtotal: number;
  valorIva: number;
  total: number;
};

export type QuoteConvertedInvoice = {
  sriInvoiceId: string;
  externalInvoiceId?: string | null;
  status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
  secuencial?: string | null;
};

export type QuoteDetail = Quote & {
  customer: {
    id: string;
    tipoIdentificacion: string;
    identificacion: string;
    razonSocial: string;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  items: QuoteDetailItem[];
  convertedInvoice?: QuoteConvertedInvoice | null;
};

export type SectionKey = "overview" | "products" | "inventory" | "checkout" | "quotes" | "sri";

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
  { code: "15", label: "Credito / saldo pendiente" },
];

export const PRODUCT_TYPE_OPTIONS: Array<{
  code: ProductType;
  label: string;
}> = [
  { code: "BIEN", label: "Bien" },
  { code: "SERVICIO", label: "Servicio" },
];

export type NewProductForm = {
  nombre: string;
  sku: string;
  codigoBarras: string;
  tipoProducto: ProductType;
  precio: string;
  tarifaIva: string;
  stockInicial: string;
  minStock: string;
};

export type EditProductForm = {
  nombre: string;
  sku: string;
  codigoBarras: string;
  tipoProducto: ProductType;
  precio: string;
  tarifaIva: string;
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
  paymentAmount: string;
  paymentTermDays: string;
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
