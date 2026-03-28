"use client";

import { format } from "date-fns";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  Check,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Monitor,
  PauseCircle,
  Plus,
  Printer,
  RefreshCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  UserRoundSearch,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";
import NextLink from "next/link";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import {
  alpha,
  type SxProps,
  type Theme,
  useTheme,
} from "@mui/material/styles";

import {
  buildPosTicketHtml,
  type PosTicketData,
} from "@/lib/pos-ticket-template";
import {
  buildCashCloseTicketHtml,
  type CashCloseTicketData,
} from "@/lib/cash-close-ticket-template";
import { createLogger, startTimer, timerDurationMs } from "@/lib/logger";
import {
  extractScaleBarcodeWeight,
  findBestScaleBarcodeMatch,
  matchesScaleBarcodePrefix,
  roundMoney,
  resolveScaleBarcodeReference,
} from "@/lib/utils";
import { PosCashSessionDialog } from "@/modules/pos/components/pos-cash-session-dialog";
import { PosHeldSalesDialog } from "@/modules/pos/components/pos-held-sales-dialog";
import { useLocalPrintSocket } from "@/modules/pos/hooks/use-local-print-socket";
import type { BillingRuntime } from "@/modules/billing/policies/billing-runtime";
import type { PosRuntime } from "@/modules/pos/policies/pos-runtime";
import type { CashRuntime } from "@/modules/cash-management/policies/cash-runtime";
import { fetchJson } from "@/shared/dashboard/api";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type Customer,
  type LineItem,
  type Product,
} from "@/shared/dashboard/types";
import { buildPosTicketEscPos } from "@/lib/pos-ticket-pdf";
import { buildCashCloseTicketEscPos } from "@/lib/cash-close-ticket-pdf";

type PosAppProps = {
  initialSession: {
    name: string;
    role: "ADMIN" | "SELLER";
  };
  initialBootstrap: PosBootstrap | null;
  initialBootstrapError?: string | null;
};

type PosDocumentType = "NONE" | "INVOICE";

type PosCashSession = {
  id: string;
  status: "OPEN" | "CLOSED" | "PENDING_APPROVAL";
  openingAmount: number;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  // Legacy fields (PosCashSession)
  closingAmount?: number | null;
  salesCount?: number;
  salesTotal?: number;
  // New Cash Management fields (CashSession)
  declaredClosing?: number | null;
  expectedClosing?: number | null;
  difference?: number | null;
  salesCashTotal?: number;
  movementsTotal?: number;
};

type PosHeldSalePayload = {
  documentType: PosDocumentType;
  paymentMethod?: string;
  payments?: Array<{
    formaPago: string;
    total: number;
  }>;
  customer: {
    tipoIdentificacion: string;
    identificacion: string;
    razonSocial: string;
    direccion?: string;
    email?: string;
    telefono?: string;
  };
  items: LineItem[];
};

type PosHeldSale = {
  id: string;
  label: string;
  updatedAt: string;
  itemCount: number;
  total: number;
  payload: PosHeldSalePayload | null;
};

export type PosBootstrap = {
  business: {
    id: string;
    name: string;
    legalName?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  operator: {
    id: string;
    name: string;
    role: "ADMIN" | "SELLER";
  };
  billingRuntime: BillingRuntime;
  posRuntime: PosRuntime;
  cashRuntime?: CashRuntime;
  defaultDocumentType: PosDocumentType;
  defaultIssuerId: string;
  cashSession: PosCashSession | null;
  heldSales: PosHeldSale[];
  customers: Customer[];
  products: Product[];
};

type CheckoutResponse = {
  saleNumber: string;
  business?: {
    id: string;
    name: string;
    legalName?: string | null;
    ruc?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  document: {
    saleDocumentId: string;
    type: PosDocumentType;
    status: "NOT_REQUIRED" | "PENDING" | "ISSUED" | "ERROR" | "VOIDED";
    fullNumber: string | null;
    establishmentCode: string | null;
    emissionPointCode: string | null;
    sequenceNumber: number | null;
    issuedAt: string | null;
  };
  invoice: {
    sriInvoiceId: string;
    status: "DRAFT" | "AUTHORIZED" | "PENDING_SRI" | "ERROR";
    authorizationNumber: string | null;
    claveAcceso: string | null;
  } | null;
};

type MessageState = {
  tone: "success" | "error" | "info";
  text: string;
} | null;

type LinePreviewRow = LineItem & {
  product: Product;
  subtotal: number;
  iva: number;
  total: number;
};

type PosPaymentLine = {
  id: string;
  formaPago: string;
  total: string;
};

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CUSTOMERS: Customer[] = [];
const EMPTY_HELD_SALES: PosHeldSale[] = [];

const WALK_IN_CUSTOMER = {
  tipoIdentificacion: "07",
  identificacion: "9999999999999",
  razonSocial: "Consumidor final",
  direccion: "",
  email: "",
  telefono: "",
};

const posLogger = createLogger("POSApp");

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildDefaultCustomer() {
  return { ...WALK_IN_CUSTOMER };
}

function createPaymentLine(
  id: string,
  formaPago = "01",
  total = "0.00",
): PosPaymentLine {
  return {
    id,
    formaPago,
    total,
  };
}

function sanitizeDecimalInput(value: string, fractionDigits: number) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return "";
  }

  const [integerPartRaw = "", ...fractionParts] = normalized.split(".");
  const integerPart = integerPartRaw || "0";
  const fractionPart = fractionParts.join("").slice(0, fractionDigits);
  const hasDecimal = normalized.includes(".");

  if (!hasDecimal) {
    return integerPart;
  }

  return `${integerPart}.${fractionPart}`;
}

function parseDecimalInput(value: string, fallback = 0) {
  const normalized = sanitizeDecimalInput(value, 6);
  if (!normalized || normalized === ".") {
    return fallback;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDecimalInput(
  value: number,
  fractionDigits: number,
  trimTrailingZeros = false,
) {
  const fixed = value.toFixed(fractionDigits);
  if (!trimTrailingZeros) {
    return fixed;
  }

  return fixed.replace(/\.?0+$/, "");
}

type PosDecimalInputProps = {
  value: number;
  fractionDigits: number;
  min?: number;
  trimTrailingZeros?: boolean;
  sx?: SxProps<Theme>;
  onCommit: (value: number) => void;
};

function PosDecimalInput({
  value,
  fractionDigits,
  min = 0,
  trimTrailingZeros = false,
  sx,
  onCommit,
}: PosDecimalInputProps) {
  const [draft, setDraft] = useState(() =>
    formatDecimalInput(value, fractionDigits, trimTrailingZeros),
  );
  const inputId = useId();

  useEffect(() => {
    setDraft(formatDecimalInput(value, fractionDigits, trimTrailingZeros));
  }, [fractionDigits, trimTrailingZeros, value]);

  function commitDraft() {
    const parsed = Math.max(parseDecimalInput(draft, value), min);
    onCommit(parsed);
    setDraft(formatDecimalInput(parsed, fractionDigits, trimTrailingZeros));
  }

  return (
    <TextField
      id={inputId}
      type="text"
      size="small"
      value={draft}
      onChange={(event) =>
        setDraft(sanitizeDecimalInput(event.target.value, fractionDigits))
      }
      onFocus={(event) => event.target.select()}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          event.currentTarget.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(
            formatDecimalInput(value, fractionDigits, trimTrailingZeros),
          );
          event.currentTarget.blur();
        }
      }}
      slotProps={{
        htmlInput: {
          inputMode: "decimal",
          enterKeyHint: "done",
          style: { textAlign: "right" },
        },
      }}
      sx={sx}
    />
  );
}

function isEditableElement(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) return false;

  const tagName = element.tagName;
  return (
    element.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  );
}

export function PosApp({
  initialSession,
  initialBootstrap,
  initialBootstrapError = null,
}: PosAppProps) {
  const theme = useTheme();
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const identificationInputRef = useRef<HTMLInputElement | null>(null);
  const customerNameInputRef = useRef<HTMLInputElement | null>(null);
  const paymentLineSequenceRef = useRef(0);
  const [bootstrap, setBootstrap] = useState<PosBootstrap | null>(
    initialBootstrap,
  );
  const [bootLoading, setBootLoading] = useState(false);
  const [bootError, setBootError] = useState<string | null>(
    initialBootstrapError,
  );
  const [initialized, setInitialized] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [holding, setHolding] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [heldSalesDialogOpen, setHeldSalesDialogOpen] = useState(false);
  const [deletingHeldSaleId, setDeletingHeldSaleId] = useState<string | null>(
    null,
  );
  const [showExtraCustomerFields, setShowExtraCustomerFields] = useState(false);
  const [toolbarMenuAnchor, setToolbarMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [customer, setCustomer] = useState(buildDefaultCustomer);
  const [paymentLines, setPaymentLines] = useState<PosPaymentLine[]>(() => {
    paymentLineSequenceRef.current += 1;
    return [createPaymentLine(`pay-${paymentLineSequenceRef.current}`)];
  });
  const [paymentLinesTouched, setPaymentLinesTouched] = useState(false);
  const [cashReceived, setCashReceived] = useState("0.00");
  const [cashReceivedTouched, setCashReceivedTouched] = useState(false);
  const [documentType, setDocumentType] = useState<PosDocumentType>("NONE");
  const [heldLabel, setHeldLabel] = useState("");
  const [activeHeldSaleId, setActiveHeldSaleId] = useState<string | null>(null);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [lastTicketData, setLastTicketData] = useState<PosTicketData | null>(
    null,
  );
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [entryQuantity, setEntryQuantity] = useState("1");
  const {
    isConnected: isPrintServiceConnected,
    printers: localPrinters,
    selectedPrinter,
    setSelectedPrinter,
    loadPrinters,
    printDocumentBytes,
  } = useLocalPrintSocket();
  const [manualProduct, setManualProduct] = useState<Product | null>(null);

  const products = bootstrap?.products ?? EMPTY_PRODUCTS;
  const customers = bootstrap?.customers ?? EMPTY_CUSTOMERS;
  const heldSales = bootstrap?.heldSales ?? EMPTY_HELD_SALES;
  const cashSession = bootstrap?.cashSession ?? null;
  const desktopContentHeight = message
    ? "calc(100vh - 198px)"
    : "calc(100vh - 156px)";
  const isToolbarMenuOpen = Boolean(toolbarMenuAnchor);
  const subtleBorder = alpha(theme.palette.divider, 0.9);
  const subtleBorderSoft = alpha(theme.palette.divider, 0.55);
  const softPrimary = alpha(theme.palette.primary.light, 0.55);
  const softPrimaryAlt = alpha(theme.palette.primary.light, 0.35);
  const panelBg = alpha(theme.palette.background.paper, 0.96);
  const chipBg = alpha(theme.palette.primary.light, 0.9);
  const accentSoft = alpha(theme.palette.secondary.light, 0.72);
  const successSoft = alpha(theme.palette.success.main, 0.12);
  const headerOutline = alpha(theme.palette.common.white, 0.28);
  const totalGradient = `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`;
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const linePreview = useMemo<LinePreviewRow[]>(
    () =>
      lineItems
        .map((line) => {
          const product = productsById.get(line.productId);
          if (!product) return null;

          const subtotal = roundMoney(
            line.cantidad * line.precioUnitario - line.descuento,
          );
          const iva = roundMoney((subtotal * product.tarifaIva) / 100);

          return {
            ...line,
            product,
            subtotal,
            iva,
            total: roundMoney(subtotal + iva),
          };
        })
        .filter((line): line is LinePreviewRow => Boolean(line)),
    [lineItems, productsById],
  );

  function createNextPaymentLine(formaPago = "01", total = "0.00") {
    paymentLineSequenceRef.current += 1;
    return createPaymentLine(
      `pay-${paymentLineSequenceRef.current}`,
      formaPago,
      total,
    );
  }

  const totals = useMemo(
    () => ({
      subtotal: roundMoney(
        linePreview.reduce((acc, line) => acc + line.subtotal, 0),
      ),
      discount: roundMoney(
        linePreview.reduce((acc, line) => acc + line.descuento, 0),
      ),
      tax: roundMoney(linePreview.reduce((acc, line) => acc + line.iva, 0)),
      total: roundMoney(linePreview.reduce((acc, line) => acc + line.total, 0)),
    }),
    [linePreview],
  );

  const allocatedAmount = useMemo(
    () =>
      roundMoney(
        paymentLines.reduce(
          (acc, line) => acc + parseDecimalInput(line.total || "0"),
          0,
        ),
      ),
    [paymentLines],
  );

  const cashPaymentAllocated = useMemo(
    () =>
      roundMoney(
        paymentLines.reduce(
          (acc, line) =>
            acc +
            (line.formaPago === "01"
              ? parseDecimalInput(line.total || "0")
              : 0),
          0,
        ),
      ),
    [paymentLines],
  );

  const paymentDelta = useMemo(
    () => roundMoney(allocatedAmount - totals.total),
    [allocatedAmount, totals.total],
  );

  const receivedAmount = useMemo(
    () =>
      cashPaymentAllocated > 0
        ? roundMoney(parseDecimalInput(cashReceived || "0"))
        : allocatedAmount,
    [allocatedAmount, cashPaymentAllocated, cashReceived],
  );

  const remainingAmount = paymentDelta < 0 ? Math.abs(paymentDelta) : 0;
  const overAllocatedAmount = paymentDelta > 0 ? paymentDelta : 0;
  const changeAmount =
    cashPaymentAllocated > 0
      ? Math.max(roundMoney(receivedAmount - cashPaymentAllocated), 0)
      : 0;

  const paymentSummaryLabel = useMemo(() => {
    const nonZeroLines = paymentLines.filter(
      (line) => parseDecimalInput(line.total || "0") > 0,
    );

    if (nonZeroLines.length === 0) {
      return "Sin cobro cargado";
    }

    if (nonZeroLines.length === 1) {
      const method = PAYMENT_METHODS.find(
        (item) => item.code === nonZeroLines[0].formaPago,
      );
      return method?.label ?? nonZeroLines[0].formaPago;
    }

    return `${nonZeroLines.length} medios`;
  }, [paymentLines]);

  const checkoutPayments = useMemo(
    () =>
      paymentLines
        .map((line) => ({
          formaPago: line.formaPago,
          total: parseDecimalInput(line.total || "0"),
          plazo: 0,
          unidadTiempo: "DIAS",
        }))
        .filter((line) => line.total > 0),
    [paymentLines],
  );
  const billingRuntime = bootstrap?.billingRuntime;
  const posRuntime = bootstrap?.posRuntime;
  const cashRuntime = bootstrap?.cashRuntime;
  const billingEnabled = billingRuntime?.capabilities.electronicBilling ?? false;
  const inventoryTrackingEnabled =
    posRuntime?.operationalRules.trackInventoryOnSale ?? true;
  const useButcheryScaleBarcodeWeight =
    posRuntime?.capabilities.weightFromBarcode ?? false;

  const dataGridColumns = useMemo<GridColDef<LinePreviewRow>[]>(
    () => [
      {
        field: "codigo",
        headerName: "Codigo",
        minWidth: 116,
        flex: 0.8,
        sortable: false,
        valueGetter: (_, row) => row.product.codigo,
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}
          >
            {params.row.product.codigo}
          </Typography>
        ),
      },
      {
        field: "nombre",
        headerName: "Producto",
        minWidth: 210,
        flex: 1.4,
        sortable: false,
        valueGetter: (_, row) => row.product.nombre,
        renderCell: (params) => (
          <Stack spacing={0.15} justifyContent="center">
            <Typography
              variant="body2"
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.15,
              }}
            >
              {params.row.product.nombre}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: 10.5,
                color: "text.secondary",
                lineHeight: 1.1,
              }}
            >
              {params.row.product.tipoProducto === "BIEN"
                ? inventoryTrackingEnabled
                  ? `Stock ${params.row.product.stock.toFixed(2)}`
                  : "Sin control de stock"
                : "Servicio"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "cantidad",
        headerName: "Cantidad",
        minWidth: 132,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => (
          <PosDecimalInput
            value={params.row.cantidad}
            fractionDigits={3}
            min={0.001}
            trimTrailingZeros
            onCommit={(next) =>
              updateLine(params.row.productId, { cantidad: next })
            }
            sx={{
              minWidth: 88,
              "& .MuiInputBase-root": {
                height: 34,
                fontSize: 12,
                borderRadius: "10px",
                backgroundColor: "background.paper",
              },
              "& input": {
                px: 1,
                py: 0.4,
              },
            }}
          />
        ),
      },
      {
        field: "precioUnitario",
        headerName: "Precio",
        minWidth: 132,
        flex: 0.85,
        sortable: false,
        renderCell: (params) => (
          <PosDecimalInput
            value={params.row.precioUnitario}
            fractionDigits={2}
            onCommit={(next) =>
              updateLine(params.row.productId, {
                precioUnitario: next,
              })
            }
            sx={{
              minWidth: 88,
              "& .MuiInputBase-root": {
                height: 34,
                fontSize: 12,
                borderRadius: "10px",
                backgroundColor: "background.paper",
              },
              "& input": {
                px: 1,
                py: 0.4,
              },
            }}
          />
        ),
      },
      {
        field: "descuento",
        headerName: "Desc.",
        minWidth: 118,
        flex: 0.75,
        sortable: false,
        renderCell: (params) => (
          <PosDecimalInput
            value={params.row.descuento}
            fractionDigits={2}
            onCommit={(next) =>
              updateLine(params.row.productId, {
                descuento: next,
              })
            }
            sx={{
              minWidth: 84,
              "& .MuiInputBase-root": {
                height: 34,
                fontSize: 12,
                borderRadius: "10px",
                backgroundColor: "background.paper",
              },
              "& input": {
                px: 1,
                py: 0.4,
              },
            }}
          />
        ),
      },
      {
        field: "iva",
        headerName: "IVA",
        minWidth: 108,
        flex: 0.65,
        sortable: false,
        align: "right",
        headerAlign: "right",
        valueGetter: (_, row) => row.iva,
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 118,
        flex: 0.75,
        sortable: false,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => formatCurrency(Number(value)),
      },
      {
        field: "actions",
        headerName: "",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 70,
        flex: 0.35,
        renderCell: (params) => (
          <IconButton
            size="small"
            color="error"
            onClick={() => removeLine(params.row.productId)}
            sx={{ p: 0.5 }}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        ),
      },
    ],
    [inventoryTrackingEnabled],
  );

  function patchBootstrap(updater: (current: PosBootstrap) => PosBootstrap) {
    startTransition(() => {
      setBootstrap((current) => (current ? updater(current) : current));
    });
  }

  function setCashSessionInBootstrap(nextCashSession: PosCashSession | null) {
    patchBootstrap((current) => ({
      ...current,
      cashSession: nextCashSession,
    }));
  }

  function upsertHeldSaleInBootstrap(nextHeldSale: PosHeldSale) {
    patchBootstrap((current) => ({
      ...current,
      heldSales: [
        nextHeldSale,
        ...current.heldSales.filter((item) => item.id !== nextHeldSale.id),
      ].slice(0, 12),
    }));
  }

  function removeHeldSaleFromBootstrap(heldSaleId: string) {
    patchBootstrap((current) => ({
      ...current,
      heldSales: current.heldSales.filter((item) => item.id !== heldSaleId),
    }));
  }

  function applyCheckoutToBootstrap(
    nextCustomer: typeof customer,
    soldLines: LinePreviewRow[],
    saleTotal: number,
    heldSaleIdToRemove: string | null,
  ) {
    const purchasedAt = new Date().toISOString();
    const soldQtyByProduct = new Map<string, number>();

    for (const line of soldLines) {
      if (line.product.tipoProducto !== "BIEN") {
        continue;
      }

      soldQtyByProduct.set(
        line.productId,
        (soldQtyByProduct.get(line.productId) ?? 0) + line.cantidad,
      );
    }

    patchBootstrap((current) => {
      const existingCustomerIndex = current.customers.findIndex(
        (item) =>
          item.tipoIdentificacion === nextCustomer.tipoIdentificacion &&
          item.identificacion === nextCustomer.identificacion,
      );

      const nextCustomers =
        existingCustomerIndex >= 0
          ? current.customers.map((item, index) =>
              index === existingCustomerIndex
                ? {
                    ...item,
                    razonSocial: nextCustomer.razonSocial,
                    direccion: nextCustomer.direccion || null,
                    email: nextCustomer.email || null,
                    telefono: nextCustomer.telefono || null,
                    purchaseCount: item.purchaseCount + 1,
                    lastPurchaseAt: purchasedAt,
                  }
                : item,
            )
          : [
              {
                id: `local-${nextCustomer.tipoIdentificacion}-${nextCustomer.identificacion}`,
                tipoIdentificacion: nextCustomer.tipoIdentificacion,
                identificacion: nextCustomer.identificacion,
                razonSocial: nextCustomer.razonSocial,
                direccion: nextCustomer.direccion || null,
                email: nextCustomer.email || null,
                telefono: nextCustomer.telefono || null,
                purchaseCount: 1,
                lastPurchaseAt: purchasedAt,
              },
              ...current.customers,
            ].slice(0, 40);

      return {
        ...current,
        products:
          !current.posRuntime.operationalRules.trackInventoryOnSale ||
          soldQtyByProduct.size === 0
            ? current.products
            : current.products.map((product) => {
                const soldQty = soldQtyByProduct.get(product.id);
                if (!soldQty || product.tipoProducto !== "BIEN") {
                  return product;
                }

                return {
                  ...product,
                  stock: Number(
                    Math.max(product.stock - soldQty, 0).toFixed(3),
                  ),
                };
              }),
        customers: nextCustomers,
        cashSession: current.cashSession
          ? {
              ...current.cashSession,
              salesCount: (current.cashSession.salesCount ?? 0) + 1,
              salesTotal: Number(
                ((current.cashSession.salesTotal ?? 0) + saleTotal).toFixed(2),
              ),
            }
          : current.cashSession,
        heldSales: heldSaleIdToRemove
          ? current.heldSales.filter((item) => item.id !== heldSaleIdToRemove)
          : current.heldSales,
      };
    });
  }

  async function loadBootstrap() {
    const startedAt = startTimer();
    setBootLoading(true);
    setBootError(null);

    try {
      const data = await fetchJson<PosBootstrap>("/api/v1/pos/bootstrap");
      posLogger.info("bootstrap:loaded", {
        durationMs: timerDurationMs(startedAt),
        productCount: data.products.length,
        customerCount: data.customers.length,
        heldSalesCount: data.heldSales.length,
        hasCashSession: Boolean(data.cashSession),
      });
      startTransition(() => {
        setBootstrap(data);
        if (!data.billingRuntime.capabilities.electronicBilling) {
          setDocumentType("NONE");
        }
      });
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "No se pudo cargar POS";
      setBootError(nextMessage);
      setMessage({
        tone: "error",
        text: nextMessage,
      });
      posLogger.error("bootstrap:failed", {
        durationMs: timerDurationMs(startedAt),
        message: nextMessage,
      });
    } finally {
      setBootLoading(false);
    }
  }

  async function refreshLocalPrinters(showFeedback = true) {
    setLoadingPrinters(true);

    try {
      const printers = await loadPrinters();
      if (printers.length === 0) {
        setMessage({
          tone: "info",
          text: "El servicio local no devolvio impresoras disponibles",
        });
        return;
      }

      if (!selectedPrinter || !printers.includes(selectedPrinter)) {
        setSelectedPrinter(printers[0]);
      }

      if (showFeedback) {
        setMessage({
          tone: "success",
          text: `Impresoras detectadas: ${printers.length}`,
        });
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con la impresora local",
      });
    } finally {
      setLoadingPrinters(false);
    }
  }

  useEffect(() => {
    if (!bootstrap || initialized) {
      return;
    }

    setLineItems([]);
    setCustomer(buildDefaultCustomer());
    setPaymentLines([createNextPaymentLine("01", "0.00")]);
    setPaymentLinesTouched(false);
    setCashReceived("0.00");
    setCashReceivedTouched(false);
    setDocumentType(bootstrap.defaultDocumentType);
    setHeldLabel("");
    setActiveHeldSaleId(null);
    setBarcodeQuery("");
    setManualProduct(null);
    setEntryQuantity("1");
    setInitialized(true);
  }, [bootstrap, initialized]);

  useEffect(() => {
    if (!bootstrap || bootLoading || cashDialogOpen || heldSalesDialogOpen) {
      return;
    }

    focusBarcodeField();
  }, [bootstrap, bootLoading, cashDialogOpen, heldSalesDialogOpen]);

  useEffect(() => {
    if (paymentLinesTouched || paymentLines.length !== 1) {
      return;
    }

    const nextTotal = totals.total > 0 ? totals.total.toFixed(2) : "0.00";
    if (paymentLines[0]?.total === nextTotal) {
      return;
    }

    setPaymentLines((prev) => {
      if (prev.length !== 1) {
        return prev;
      }

      return [{ ...prev[0], total: nextTotal }];
    });
  }, [paymentLines, paymentLinesTouched, totals.total]);

  useEffect(() => {
    if (cashReceivedTouched) {
      return;
    }

    const nextValue =
      cashPaymentAllocated > 0 ? cashPaymentAllocated.toFixed(2) : "0.00";
    if (cashReceived === nextValue) {
      return;
    }

    setCashReceived(nextValue);
  }, [cashPaymentAllocated, cashReceived, cashReceivedTouched]);

  const handleGlobalShortcuts = useEffectEvent((event: KeyboardEvent) => {
    if (!bootstrap || bootLoading || cashDialogOpen || heldSalesDialogOpen) {
      return;
    }

    const editableTarget = isEditableElement(event.target);

    if ((event.ctrlKey || event.metaKey) && event.code === "KeyB") {
      event.preventDefault();
      focusBarcodeField(true);
      return;
    }

    if (
      editableTarget &&
      !event.code.startsWith("F") &&
      event.code !== "Escape"
    ) {
      return;
    }

    switch (event.code) {
      case "F1":
        event.preventDefault();
        resetSaleState(bootstrap.defaultDocumentType);
        focusBarcodeField(true);
        break;
      case "F2":
        event.preventDefault();
        applyWalkInCustomer();
        break;
      case "F4":
        event.preventDefault();
        setCashDialogOpen(true);
        break;
      case "F6":
        event.preventDefault();
        setHeldSalesDialogOpen(true);
        break;
      case "F8":
        event.preventDefault();
        if (!holding) {
          void saveHeldSale();
        }
        break;
      case "F9":
        event.preventDefault();
        if (lastTicketData) {
          void printTicket(lastTicketData);
        }
        break;
      case "F10":
        event.preventDefault();
        if (
          !submitting &&
          cashSession &&
          checkoutPayments.length > 0 &&
          remainingAmount <= 0 &&
          overAllocatedAmount <= 0
        ) {
          void checkoutSale();
        }
        break;
      case "Escape":
        event.preventDefault();
        focusBarcodeField(true);
        break;
      default:
        break;
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
    };
  }, []);

  function resetSaleState(nextDocumentType?: PosDocumentType) {
    setLineItems([]);
    setCustomer(buildDefaultCustomer());
    setPaymentLines([createNextPaymentLine("01", "0.00")]);
    setPaymentLinesTouched(false);
    setCashReceived("0.00");
    setCashReceivedTouched(false);
    setDocumentType(
      nextDocumentType ?? bootstrap?.defaultDocumentType ?? "NONE",
    );
    setHeldLabel("");
    setActiveHeldSaleId(null);
    setBarcodeQuery("");
    setManualProduct(null);
    setEntryQuantity("1");
    setShowExtraCustomerFields(false);
    focusBarcodeField();
  }

  function openToolbarMenu(event: MouseEvent<HTMLButtonElement>) {
    setToolbarMenuAnchor(event.currentTarget);
  }

  function closeToolbarMenu() {
    setToolbarMenuAnchor(null);
  }

  function focusBarcodeField(select = false) {
    window.requestAnimationFrame(() => {
      const input = barcodeInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      if (select) {
        input.select();
      }
    });
  }

  function focusIdentificationField(select = false) {
    window.requestAnimationFrame(() => {
      const input = identificationInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      if (select) {
        input.select();
      }
    });
  }

  function focusCustomerNameField(select = false) {
    window.requestAnimationFrame(() => {
      const input = customerNameInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      if (select) {
        input.select();
      }
    });
  }

  function updatePaymentLine(lineId: string, patch: Partial<PosPaymentLine>) {
    setPaymentLinesTouched(true);
    setPaymentLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  }

  function addPaymentLine() {
    setPaymentLinesTouched(true);
    setPaymentLines((prev) => [...prev, createNextPaymentLine("19", "0.00")]);
  }

  function removePaymentLine(lineId: string) {
    setPaymentLinesTouched(true);
    setPaymentLines((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], total: "0.00" }];
      }

      return prev.filter((line) => line.id !== lineId);
    });
  }

  function fillRemainingPayment() {
    setPaymentLinesTouched(true);
    setPaymentLines((prev) => {
      if (prev.length === 0) {
        return [createNextPaymentLine("01", totals.total.toFixed(2))];
      }

      const lastLine = prev.at(-1);
      if (!lastLine) {
        return prev;
      }

      const otherTotal = prev
        .slice(0, -1)
        .reduce((acc, line) => acc + parseDecimalInput(line.total || "0"), 0);
      const nextAmount = roundMoney(Math.max(totals.total - otherTotal, 0));

      return prev.map((line) =>
        line.id === lastLine.id
          ? { ...line, total: nextAmount.toFixed(2) }
          : line,
      );
    });
  }

  function normalizeHeldSalePayments(payload: PosHeldSalePayload) {
    if (payload.payments && payload.payments.length > 0) {
      return payload.payments.map((payment) =>
        createNextPaymentLine(
          payment.formaPago,
          parseDecimalInput(String(payment.total ?? 0)).toFixed(2),
        ),
      );
    }

    return [createNextPaymentLine(payload.paymentMethod ?? "01", "0.00")];
  }

  function resolveProductByCode(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;

    return (
      products.find((product) => product.codigo.toLowerCase() === normalized) ??
      products.find(
        (product) => (product.codigoBarras ?? "").toLowerCase() === normalized,
      ) ??
      findBestScaleBarcodeMatch(products, normalized) ??
      products.find(
        (product) => (product.sku ?? "").toLowerCase() === normalized,
      ) ??
      products.find((product) => product.nombre.toLowerCase() === normalized) ??
      products.find(
        (product) =>
          product.codigo.toLowerCase().includes(normalized) ||
          (product.codigoBarras ?? "").toLowerCase().includes(normalized) ||
          (product.sku ?? "").toLowerCase().includes(normalized) ||
          product.nombre.toLowerCase().includes(normalized),
      ) ??
      null
    );
  }

  function addProduct(product: Product, quantity = 1) {
    if (
      inventoryTrackingEnabled &&
      product.tipoProducto === "BIEN" &&
      product.stock <= 0
    ) {
      setMessage({
        tone: "error",
        text: `${product.nombre} no tiene stock disponible`,
      });
      return;
    }

    setLineItems((prev) => {
      const current = prev.find((item) => item.productId === product.id);
      if (current) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                cantidad: Number((item.cantidad + quantity).toFixed(3)),
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          cantidad: quantity,
          precioUnitario: product.precio,
          descuento: 0,
        },
      ];
    });
  }

  function updateLine(productId: string, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeLine(productId: string) {
    setLineItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  function selectCustomer(nextCustomer: Partial<typeof customer>) {
    setCustomer((prev) => ({
      ...prev,
      ...nextCustomer,
    }));
  }

  function applyExistingCustomer(nextCustomer: Customer) {
    selectCustomer({
      tipoIdentificacion: nextCustomer.tipoIdentificacion,
      identificacion: nextCustomer.identificacion,
      razonSocial: nextCustomer.razonSocial,
      direccion: nextCustomer.direccion ?? "",
      email: nextCustomer.email ?? "",
      telefono: nextCustomer.telefono ?? "",
    });
  }

  function searchCustomerByIdentification() {
    const query = customer.identificacion.trim().toLowerCase();

    if (!query) {
      setMessage({
        tone: "info",
        text: "Ingresa una identificacion para buscar un cliente existente",
      });
      return;
    }

    const existingCustomer =
      customers.find((item) => item.identificacion.toLowerCase() === query) ??
      customers.find((item) =>
        item.identificacion.toLowerCase().includes(query),
      );

    if (!existingCustomer) {
      setMessage({
        tone: "info",
        text: "No se encontro cliente con esa identificacion. Puedes completar los datos manualmente.",
      });
      focusCustomerNameField();
      return;
    }

    applyExistingCustomer(existingCustomer);
    setMessage({
      tone: "success",
      text: `Cliente ${existingCustomer.razonSocial} cargado`,
    });
    focusBarcodeField(true);
  }

  function applyWalkInCustomer() {
    setCustomer(buildDefaultCustomer());
    setDocumentType("NONE");
    setShowExtraCustomerFields(false);
    setMessage({
      tone: "info",
      text: "Cliente rapido aplicado como consumidor final",
    });
    focusBarcodeField(true);
  }

  function handleAddByCode() {
    const product = resolveProductByCode(barcodeQuery);
    const scaleBarcodeReference = product
      ? resolveScaleBarcodeReference(product, barcodeQuery)
      : null;
    const embeddedWeight =
      useButcheryScaleBarcodeWeight && product
        ? extractScaleBarcodeWeight(barcodeQuery, scaleBarcodeReference)
        : null;
    const quantity =
      embeddedWeight ?? parseDecimalInput(entryQuantity || "1", 1);

    if (!product) {
      setMessage({
        tone: "error",
        text: "No se encontro producto con ese codigo o descripcion",
      });
      return;
    }

    if (quantity <= 0) {
      setMessage({ tone: "error", text: "La cantidad debe ser mayor a cero" });
      return;
    }

    addProduct(product, quantity);
    if (embeddedWeight) {
      setMessage({
        tone: "success",
        text: `${product.nombre} agregado con peso ${formatDecimalInput(
          embeddedWeight,
          3,
          true,
        )}`,
      });
    }
    setBarcodeQuery("");
    setEntryQuantity("1");
    focusBarcodeField();
  }

  function handleAddManualProduct() {
    const quantity = parseDecimalInput(entryQuantity || "1", 1);

    if (!manualProduct) {
      setMessage({ tone: "error", text: "Selecciona un producto manualmente" });
      return;
    }

    if (quantity <= 0) {
      setMessage({ tone: "error", text: "La cantidad debe ser mayor a cero" });
      return;
    }

    addProduct(manualProduct, quantity);
    setManualProduct(null);
    setEntryQuantity("1");
    focusBarcodeField();
  }

  async function openCash() {
    setCashSubmitting(true);

    try {
      const useCashMgmt = cashRuntime?.enabled;
      const endpoint = useCashMgmt
        ? "/api/v1/cash-management/sessions"
        : "/api/v1/pos/cash-session";
      const body = {
        openingAmount: parseDecimalInput(openingAmount || "0"),
        notes: openingNotes,
      };

      const newSession = await fetchJson<PosCashSession>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setCashSessionInBootstrap(newSession);
      setMessage({ tone: "success", text: "Caja abierta correctamente" });
      setOpeningNotes("");
      setClosingAmount("");
      setClosingNotes("");
      setCashDialogOpen(false);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo abrir caja",
      });
    } finally {
      setCashSubmitting(false);
    }
  }

  async function closeCash() {
    setCashSubmitting(true);

    try {
      const useCashMgmt = cashRuntime?.enabled;
      let closedSession: PosCashSession | null = null;

      if (useCashMgmt && cashSession?.id) {
        closedSession = await fetchJson<PosCashSession>(
          `/api/v1/cash-management/sessions/${cashSession.id}/close`,
          {
            method: "POST",
            body: JSON.stringify({
              declaredAmount: parseDecimalInput(closingAmount || "0"),
              notes: closingNotes,
            }),
          },
        );
      } else {
        closedSession = await fetchJson<PosCashSession>("/api/v1/pos/cash-session", {
          method: "PATCH",
          body: JSON.stringify({
            closingAmount: parseDecimalInput(closingAmount || "0"),
            notes: closingNotes,
          }),
        });
      }

      if (bootstrap && closedSession) {
        const closeTicketData: CashCloseTicketData = {
          businessName: bootstrap.business.name,
          businessLegalName: bootstrap.business.legalName,
          businessRuc: bootstrap.business.ruc,
          businessAddress: bootstrap.business.address,
          businessPhone: bootstrap.business.phone,
          businessEmail: bootstrap.business.email,
          operatorName: bootstrap.operator.name,
          sessionId: closedSession.id,
          openedAt: formatDateTime(closedSession.openedAt),
          closedAt: formatDateTime(closedSession.closedAt ?? new Date()),
          openingAmount: closedSession.openingAmount,
          salesCashTotal: closedSession.salesCashTotal ?? 0,
          movementsTotal: closedSession.movementsTotal ?? 0,
          expectedClosing:
            closedSession.expectedClosing ??
            closedSession.openingAmount +
              (closedSession.salesCashTotal ?? 0) +
              (closedSession.movementsTotal ?? 0),
          declaredClosing:
            closedSession.declaredClosing ??
            closedSession.closingAmount ??
            parseDecimalInput(closingAmount || "0"),
          difference:
            closedSession.difference ??
            (closedSession.declaredClosing ??
              closedSession.closingAmount ??
              parseDecimalInput(closingAmount || "0")) -
              (closedSession.expectedClosing ??
                closedSession.openingAmount +
                  (closedSession.salesCashTotal ?? 0) +
                  (closedSession.movementsTotal ?? 0)),
          notes: closedSession.notes ?? closingNotes,
        };

        void printCashCloseTicket(closeTicketData);
      }

      setCashSessionInBootstrap(null);
      setMessage({ tone: "success", text: "Caja cerrada correctamente" });
      setClosingAmount("");
      setClosingNotes("");
      setCashDialogOpen(false);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo cerrar caja",
      });
    } finally {
      setCashSubmitting(false);
    }
  }

  async function saveHeldSale() {
    if (lineItems.length === 0) {
      setMessage({
        tone: "error",
        text: "Agrega productos antes de guardar una venta en espera",
      });
      return;
    }

    setHolding(true);

    try {
      const savedHeldSale = await fetchJson<PosHeldSale>(
        "/api/v1/pos/held-sales",
        {
          method: "POST",
          body: JSON.stringify({
            heldSaleId: activeHeldSaleId ?? undefined,
            label: heldLabel.trim() || `Espera ${format(new Date(), "HH:mm")}`,
            payload: {
              documentType,
              paymentMethod: paymentLines[0]?.formaPago ?? "01",
              payments: paymentLines.map((line) => ({
                formaPago: line.formaPago,
                total: parseDecimalInput(line.total || "0"),
              })),
              customer,
              items: lineItems,
            },
          }),
        },
      );

      upsertHeldSaleInBootstrap(savedHeldSale);
      setMessage({ tone: "success", text: "Venta en espera guardada" });
      resetSaleState(bootstrap?.defaultDocumentType);
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo guardar en espera",
      });
    } finally {
      setHolding(false);
    }
  }

  function loadHeldSale(heldSale: PosHeldSale) {
    if (!heldSale.payload) {
      setMessage({
        tone: "error",
        text: "La venta en espera no tiene un formato valido",
      });
      return;
    }

    const payload = heldSale.payload;

    startTransition(() => {
      setLineItems(payload.items);
      setCustomer({
        ...buildDefaultCustomer(),
        ...payload.customer,
      });
      setPaymentLines(normalizeHeldSalePayments(payload));
      setPaymentLinesTouched(true);
      setCashReceived("0.00");
      setCashReceivedTouched(false);
      setDocumentType(payload.documentType);
      setHeldLabel(heldSale.label);
      setActiveHeldSaleId(heldSale.id);
    });

    setMessage({
      tone: "info",
      text: `Venta en espera "${heldSale.label}" cargada`,
    });
    focusBarcodeField(true);
  }

  async function removeHeldSale(heldSaleId: string) {
    setDeletingHeldSaleId(heldSaleId);

    try {
      const removed = await fetchJson<{ id: string }>(
        `/api/v1/pos/held-sales/${heldSaleId}`,
        {
          method: "DELETE",
        },
      );

      if (activeHeldSaleId === heldSaleId) {
        setActiveHeldSaleId(null);
      }

      removeHeldSaleFromBootstrap(removed.id);
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo borrar la espera",
      });
    } finally {
      setDeletingHeldSaleId((current) =>
        current === heldSaleId ? null : current,
      );
    }
  }

  function validateCustomer() {
    if (documentType === "NONE") {
      return null;
    }

    const identification = customer.identificacion.trim();

    if (
      customer.tipoIdentificacion === "05" &&
      !/^\d{10}$/.test(identification)
    ) {
      return "La cedula debe tener 10 digitos";
    }

    if (
      customer.tipoIdentificacion === "04" &&
      !/^\d{13}$/.test(identification)
    ) {
      return "El RUC debe tener 13 digitos";
    }

    if (!customer.razonSocial.trim()) {
      return "La razon social es obligatoria para factura";
    }

    return null;
  }

  async function checkoutSale() {
    if (!bootstrap) return;
    const checkoutStartedAt = startTimer();

    if (!cashSession) {
      setMessage({
        tone: "error",
        text: "Abre caja antes de cobrar en el POS",
      });
      return;
    }

    if (linePreview.length === 0) {
      setMessage({
        tone: "error",
        text: "Agrega al menos un producto al detalle",
      });
      return;
    }

    const customerError = validateCustomer();
    if (customerError) {
      setMessage({ tone: "error", text: customerError });
      return;
    }

    if (checkoutPayments.length === 0) {
      setMessage({
        tone: "error",
        text: "Agrega al menos una linea de pago para procesar la venta",
      });
      return;
    }

    if (remainingAmount > 0) {
      setMessage({
        tone: "error",
        text: `Falta registrar ${formatCurrency(remainingAmount)} para completar el cobro`,
      });
      return;
    }

    if (overAllocatedAmount > 0) {
      setMessage({
        tone: "error",
        text: `Los pagos exceden el total por ${formatCurrency(overAllocatedAmount)}`,
      });
      return;
    }

    if (cashPaymentAllocated > 0 && receivedAmount < cashPaymentAllocated) {
      setMessage({
        tone: "error",
        text: "El recibido en efectivo no puede ser menor al valor cobrado en efectivo",
      });
      return;
    }

    setSubmitting(true);

    try {
      const heldSaleIdToRemove = activeHeldSaleId;
      const effectiveCustomer =
        documentType === "NONE"
          ? {
              ...WALK_IN_CUSTOMER,
              razonSocial:
                customer.razonSocial.trim() || WALK_IN_CUSTOMER.razonSocial,
            }
          : customer;

      const result = await fetchJson<CheckoutResponse>(
        "/api/v1/pos/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            documentType,
            issuerId: bootstrap.defaultIssuerId,
            fechaEmision: format(new Date(), "dd/MM/yyyy"),
            moneda: "USD",
            customer: {
              tipoIdentificacion: effectiveCustomer.tipoIdentificacion,
              identificacion: effectiveCustomer.identificacion.trim(),
              razonSocial: effectiveCustomer.razonSocial.trim(),
              direccion: effectiveCustomer.direccion ?? "",
              email: effectiveCustomer.email ?? "",
              telefono: effectiveCustomer.telefono ?? "",
            },
            items: linePreview.map((line) => ({
              productId: line.productId,
              productCode: line.product.codigo,
              cantidad: line.cantidad,
              descuento: line.descuento,
              precioUnitario: line.precioUnitario,
              tarifaIva: line.product.tarifaIva,
            })),
            payments: checkoutPayments,
            infoAdicional: {
              origin: "POS",
            },
          }),
        },
      );

      posLogger.info("checkout:completed", {
        saleNumber: result.saleNumber,
        documentType: result.document.type,
        documentStatus: result.document.status,
        invoiceStatus: result.invoice?.status ?? null,
        durationMs: timerDurationMs(checkoutStartedAt),
      });

      const ticketData: PosTicketData = {
        businessName: result.business?.name ?? bootstrap.business.name,
        businessLegalName:
          result.business?.legalName ?? bootstrap.business.legalName,
        businessRuc: result.business?.ruc ?? bootstrap.business.ruc,
        businessAddress:
          result.business?.address ?? bootstrap.business.address,
        businessPhone: result.business?.phone ?? bootstrap.business.phone,
        businessEmail: result.business?.email ?? bootstrap.business.email,
        accountingRequired:
          bootstrap.billingRuntime.operationalRules.accountingRequired,
        environment: bootstrap.billingRuntime.environment,
        operatorName: bootstrap.operator.name,
        saleNumber: result.saleNumber,
        documentType: result.document.type,
        documentNumber: result.document.fullNumber,
        createdAt: formatDateTime(new Date()),
        customerName: effectiveCustomer.razonSocial,
        customerIdentification: effectiveCustomer.identificacion,
        customerEmail: effectiveCustomer.email ?? "",
        customerPhone: effectiveCustomer.telefono ?? "",
        customerAddress: effectiveCustomer.direccion ?? "",
        paymentMethodLabel: paymentSummaryLabel,
        documentLabel:
          result.document.type === "INVOICE"
            ? "FACTURA"
            : "COMPROBANTE DE VENTA",
        authorizationNumber: result.invoice?.authorizationNumber ?? null,
        accessKey: result.invoice?.claveAcceso ?? null,
        subtotal: result.totals.subtotal,
        discountTotal: result.totals.discountTotal,
        taxTotal: result.totals.taxTotal,
        total: result.totals.total,
        lines: linePreview.map((line) => ({
          quantity: line.cantidad,
          name: line.product.nombre,
          unitPrice: line.precioUnitario,
          total: line.total,
        })),
      };

      setLastTicketData(ticketData);
      void printTicket(ticketData);
      applyCheckoutToBootstrap(
        effectiveCustomer,
        linePreview,
        result.totals.total,
        heldSaleIdToRemove,
      );

      if (heldSaleIdToRemove) {
        void fetchJson<{ id: string }>(
          `/api/v1/pos/held-sales/${heldSaleIdToRemove}`,
          {
            method: "DELETE",
          },
        )
          .then(() => {
            posLogger.info("held-sale:removed-after-checkout", {
              heldSaleId: heldSaleIdToRemove,
            });
          })
          .catch((error) => {
            posLogger.warn("held-sale:remove-after-checkout-failed", {
              heldSaleId: heldSaleIdToRemove,
              message:
                error instanceof Error ? error.message : "Error desconocido",
            });
          });
      }

      setMessage({
        tone: "success",
        text:
          result.invoice?.status === "AUTHORIZED"
            ? result.document.fullNumber
              ? `Venta #${result.saleNumber} cobrada. Factura ${result.document.fullNumber} autorizada`
              : `Venta #${result.saleNumber} cobrada y factura autorizada`
            : result.document.fullNumber
              ? `Venta #${result.saleNumber} cobrada. Documento ${result.document.fullNumber} generado`
              : `Venta #${result.saleNumber} cobrada correctamente`,
      });
      resetSaleState(bootstrap.defaultDocumentType);
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "No se pudo cobrar la venta",
      });
      posLogger.error("checkout:failed", {
        durationMs: timerDurationMs(checkoutStartedAt),
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function printHtmlDocument(html: string, blockedMessage: string) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, "_blank", "width=420,height=720");
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      setMessage({
        tone: "error",
        text: blockedMessage,
      });
      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60_000);
  }

  async function printTicket(ticketData: PosTicketData) {
    const printStartedAt = startTimer();
    if (!selectedPrinter) {
      printHtmlDocument(
        buildPosTicketHtml(ticketData, {
          autoPrint: false,
          autoClose: false,
        }),
        "El navegador bloqueo la ventana de impresion",
      );
      posLogger.info("print:browser-fallback", {
        saleNumber: ticketData.saleNumber,
        durationMs: timerDurationMs(printStartedAt),
        reason: "no-selected-printer",
      });
      return;
    }

    try {
      const ticket = buildPosTicketEscPos(ticketData);
      await printDocumentBytes(selectedPrinter, ticket.bytes);
      posLogger.info("print:completed", {
        saleNumber: ticketData.saleNumber,
        printerName: selectedPrinter,
        durationMs: timerDurationMs(printStartedAt),
      });
      setMessage({
        tone: "success",
        text: `Ticket enviado a ${selectedPrinter}`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? `${error.message}. Se abrira la impresion del navegador como respaldo.`
            : "No se pudo imprimir por la impresora local. Se abrira el navegador como respaldo.",
      });
      posLogger.warn("print:fallback", {
        saleNumber: ticketData.saleNumber,
        printerName: selectedPrinter,
        durationMs: timerDurationMs(printStartedAt),
        message: error instanceof Error ? error.message : "Error desconocido",
      });
      printHtmlDocument(
        buildPosTicketHtml(ticketData, {
          autoPrint: false,
          autoClose: false,
        }),
        "El navegador bloqueo la ventana de impresion",
      );
    }
  }

  async function printCashCloseTicket(ticketData: CashCloseTicketData) {
    const printStartedAt = startTimer();

    if (!selectedPrinter) {
      printHtmlDocument(
        buildCashCloseTicketHtml(ticketData, {
          autoPrint: false,
          autoClose: false,
        }),
        "El navegador bloqueo la ventana de impresion del cierre",
      );
      posLogger.info("cash-close-print:browser-fallback", {
        sessionId: ticketData.sessionId,
        durationMs: timerDurationMs(printStartedAt),
        reason: "no-selected-printer",
      });
      return;
    }

    try {
      const ticket = buildCashCloseTicketEscPos(ticketData);
      await printDocumentBytes(selectedPrinter, ticket.bytes);
      posLogger.info("cash-close-print:completed", {
        sessionId: ticketData.sessionId,
        printerName: selectedPrinter,
        durationMs: timerDurationMs(printStartedAt),
      });
    } catch (error) {
      posLogger.warn("cash-close-print:fallback", {
        sessionId: ticketData.sessionId,
        printerName: selectedPrinter,
        durationMs: timerDurationMs(printStartedAt),
        message: error instanceof Error ? error.message : "Error desconocido",
      });
      printHtmlDocument(
        buildCashCloseTicketHtml(ticketData, {
          autoPrint: false,
          autoClose: false,
        }),
        "El navegador bloqueo la ventana de impresion del cierre",
      );
    }
  }

  function buildLegacyCashCloseTicketData(session: {
    id: string;
    openingAmount: number;
    closingAmount?: number | null;
    openedAt: string;
    closedAt?: string | null;
    notes?: string | null;
    salesCount?: number;
    salesTotal?: number;
  }): CashCloseTicketData | null {
    if (!bootstrap) return null;

    return {
      businessName: bootstrap.business.name,
      businessLegalName: bootstrap.business.legalName,
      businessRuc: bootstrap.business.ruc,
      businessAddress: bootstrap.business.address,
      businessPhone: bootstrap.business.phone,
      businessEmail: bootstrap.business.email,
      operatorName: bootstrap.operator.name,
      sessionId: session.id,
      openedAt: formatDateTime(session.openedAt),
      closedAt: formatDateTime(session.closedAt ?? new Date()),
      openingAmount: session.openingAmount,
      salesCashTotal: session.salesTotal ?? 0,
      salesLabel: "Total vendido",
      salesCount: session.salesCount ?? 0,
      declaredClosing: session.closingAmount ?? 0,
      declaredClosingLabel: "Cierre registrado",
      notes: session.notes,
    };
  }

  function handleSnackbarClose(_: Event | SyntheticEvent, reason?: string) {
    if (reason === "clickaway") {
      return;
    }

    setMessage(null);
  }

  if (bootLoading && !bootstrap) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          backgroundColor: "background.default",
        }}
      >
        <Paper sx={{ px: 4, py: 3, borderRadius: "24px" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <Typography>Cargando modulo POS...</Typography>
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (!bootstrap) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          backgroundColor: "background.default",
          p: 3,
        }}
      >
        <Paper sx={{ maxWidth: 520, p: 4, borderRadius: "24px" }}>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              No se pudo abrir el POS
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>
              {bootError ??
                "Revisa que el negocio tenga el modulo POS activo y que la sesion siga vigente."}
            </Typography>
            <Button
              variant="contained"
              onClick={() => void loadBootstrap()}
              startIcon={<RefreshCcw className="h-4 w-4" />}
            >
              Reintentar
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: { md: "100vh" },
        p: { xs: 1.5, md: 2 },
      }}
    >
      <Stack spacing={1.5} sx={{ height: { md: "100%" } }}>
        <Paper
          sx={{
            borderRadius: "22px",
            overflow: "hidden",
            borderColor: subtleBorder,
            backgroundColor: alpha(theme.palette.background.paper, 0.98),
          }}
        >
          <Box
            sx={{
              px: { xs: 1.5, md: 2.25 },
              py: 1.25,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      opacity: 0.8,
                    }}
                  >
                    Punto de venta
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ mt: 0.25, fontWeight: 800, lineHeight: 1.1 }}
                  >
                    {bootstrap.business.name}
                  </Typography>
                  <Typography sx={{ mt: 0.25, opacity: 0.78, fontSize: 13 }}>
                    Operador: {initialSession.name}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.75}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    label={cashSession ? "Caja abierta" : "Sin caja abierta"}
                    color={cashSession ? "success" : "default"}
                    size="small"
                    sx={{
                      borderRadius: "999px",
                      backgroundColor: cashSession
                        ? successSoft
                        : alpha(theme.palette.common.white, 0.16),
                      color: cashSession
                        ? theme.palette.success.dark
                        : theme.palette.common.white,
                    }}
                  />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  color="inherit"
                  size="small"
                  onClick={() => resetSaleState(bootstrap.defaultDocumentType)}
                >
                  Nueva · F1
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={
                    submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )
                  }
                  onClick={() => void checkoutSale()}
                  disabled={
                    submitting ||
                    !cashSession ||
                    checkoutPayments.length === 0 ||
                    remainingAmount > 0 ||
                    overAllocatedAmount > 0
                  }
                >
                  Procesar · F10
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={<Wallet className="h-4 w-4" />}
                  onClick={() => setCashDialogOpen(true)}
                >
                  {cashSession ? "Caja · F4" : "Caja · F4"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={
                    holding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PauseCircle className="h-4 w-4" />
                    )
                  }
                  onClick={() => void saveHeldSale()}
                  disabled={holding}
                >
                  Espera · F8
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  onClick={() => setHeldSalesDialogOpen(true)}
                >
                  Esperas ({heldSales.length}) · F6
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: headerOutline }}
                  startIcon={<Printer className="h-4 w-4" />}
                  onClick={() =>
                    lastTicketData && void printTicket(lastTicketData)
                  }
                  disabled={!lastTicketData}
                >
                  Reimprimir · F9
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: headerOutline,
                    minWidth: 42,
                    px: 1.1,
                  }}
                  onClick={openToolbarMenu}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        <Menu
          anchorEl={toolbarMenuAnchor}
          open={isToolbarMenuOpen}
          onClose={closeToolbarMenu}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                width: 320,
                maxHeight: "85vh",
                overflowY: "auto",
                borderRadius: "22px",
                border: `1px solid ${subtleBorder}`,
                backgroundColor: alpha(theme.palette.background.paper, 0.98),
                boxShadow: "0 22px 54px rgba(15, 23, 42, 0.18)",
                backdropFilter: "blur(14px)",
              },
            },
          }}
        >
          <Box sx={{ p: 1.2 }}>
            <Paper
              sx={{
                p: 1.25,
                borderRadius: "18px",
                backgroundColor: chipBg,
                borderColor: subtleBorder,
                boxShadow: "none",
              }}
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  spacing={0.85}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={0.85} alignItems="center">
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: alpha(
                          theme.palette.common.white,
                          0.82,
                        ),
                        color: "primary.main",
                      }}
                    >
                      <Printer className="h-4 w-4" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                        Impresion local
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11.5, color: "text.secondary" }}
                      >
                        {selectedPrinter || "Usando navegador como respaldo"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    size="small"
                    icon={
                      isPrintServiceConnected ? (
                        <Wifi className="h-3.5 w-3.5" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )
                    }
                    label={isPrintServiceConnected ? "Conectado" : "Offline"}
                    sx={{
                      height: 26,
                      borderRadius: "999px",
                      backgroundColor: isPrintServiceConnected
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.text.primary, 0.08),
                      color: isPrintServiceConnected
                        ? "success.dark"
                        : "text.secondary",
                      "& .MuiChip-icon": {
                        color: "inherit",
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Paper>
          </Box>
          <Divider sx={{ borderColor: subtleBorderSoft }} />
          <MenuItem
            onClick={() => {
              void refreshLocalPrinters();
            }}
            disabled={loadingPrinters}
            sx={{ minHeight: 42, mx: 0.75, mt: 0.75, borderRadius: "14px" }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {loadingPrinters ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  {loadingPrinters
                    ? "Buscando impresoras..."
                    : isPrintServiceConnected
                      ? "Actualizar impresoras"
                      : "Conectar impresora local"}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  Detecta equipos y sincroniza la seleccion.
                </Typography>
              </Box>
            </Stack>
          </MenuItem>
          <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Impresoras disponibles
            </Typography>
          </Box>
          <Box sx={{ maxHeight: 280, overflowY: "auto", px: 0.75, pb: 0.5 }}>
            {localPrinters.length === 0 ? (
              <MenuItem
                disabled
                sx={{ minHeight: 40, mx: 0, borderRadius: "14px" }}
              >
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  Sin impresoras detectadas
                </Typography>
              </MenuItem>
            ) : null}
            {localPrinters.map((printerName) => (
              <MenuItem
                key={printerName}
                selected={printerName === selectedPrinter}
                onClick={() => {
                  setSelectedPrinter(printerName);
                  closeToolbarMenu();
                  setMessage({
                    tone: "success",
                    text: `Impresora seleccionada: ${printerName}`,
                  });
                }}
                sx={{
                  minHeight: 44,
                  mx: 0,
                  borderRadius: "14px",
                  mb: 0.25,
                  "&.Mui-selected": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                  "&.Mui-selected:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.14),
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ width: "100%" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                      {printerName}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                      {printerName === selectedPrinter
                        ? "Impresora activa para tickets"
                        : "Disponible para seleccionar"}
                    </Typography>
                  </Box>
                  {printerName === selectedPrinter ? (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "999px",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        color: "primary.main",
                        flexShrink: 0,
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Box>
                  ) : null}
                </Stack>
              </MenuItem>
            ))}
          </Box>
          {selectedPrinter ? (
            <MenuItem
              onClick={() => {
                setSelectedPrinter(null);
                closeToolbarMenu();
                setMessage({
                  tone: "info",
                  text: "Impresion local desactivada. Se usara el navegador.",
                });
              }}
              sx={{ minHeight: 42, mx: 0.75, mt: 0.25, borderRadius: "14px" }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Monitor className="h-4 w-4" />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  Usar navegador para imprimir
                </Typography>
              </Stack>
            </MenuItem>
          ) : null}
          <Divider sx={{ my: 0.75, borderColor: subtleBorderSoft }} />
          <MenuItem
            onClick={() => {
              closeToolbarMenu();
              void loadBootstrap();
            }}
            sx={{ minHeight: 42, mx: 0.75, borderRadius: "14px" }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <RefreshCcw className="h-4 w-4" />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Recargar POS
              </Typography>
            </Stack>
          </MenuItem>
          {bootstrap.operator.role === "ADMIN" ? (
            <MenuItem
              component={NextLink}
              href="/overview"
              onClick={closeToolbarMenu}
              sx={{ minHeight: 42, mx: 0.75, borderRadius: "14px" }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <LayoutDashboard className="h-4 w-4" />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  Ir al panel
                </Typography>
              </Stack>
            </MenuItem>
          ) : null}
          <MenuItem
            onClick={() => {
              closeToolbarMenu();
              void logout();
            }}
            sx={{
              minHeight: 42,
              mx: 0.75,
              mb: 0.75,
              borderRadius: "14px",
              color: "error.main",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <LogOut className="h-4 w-4" />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Salir
              </Typography>
            </Stack>
          </MenuItem>
        </Menu>

        <Snackbar
          open={Boolean(message)}
          autoHideDuration={4200}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {message ? (
            <Alert
              onClose={handleSnackbarClose}
              severity={
                message.tone === "error"
                  ? "error"
                  : message.tone === "success"
                    ? "success"
                    : "info"
              }
              variant="filled"
              sx={{ py: 0, borderRadius: "16px", minWidth: 320 }}
            >
              {message.text}
            </Alert>
          ) : undefined}
        </Snackbar>

        <Grid
          container
          spacing={{ xs: 1, md: 1.5 }}
          columns={{ xs: 12, md: 10, xl: 20 }}
          sx={{
            alignItems: "start",
            minHeight: 0,
            height: { md: desktopContentHeight },
          }}
        >
          <Grid
            size={{ xs: 12, md: 7, xl: 16 }}
            sx={{
              minHeight: 0,
              minWidth: 0,
              overflow: { md: "hidden" },
              display: "flex",
            }}
          >
            <Stack
              spacing={{ xs: 1, md: 1.5 }}
              sx={{ minHeight: 0, minWidth: 0, flex: 1 }}
            >
              <Paper
                sx={{
                  borderRadius: "22px",
                  p: { xs: 1.25, md: 2 },
                  flexShrink: 0,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ md: "center" }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800, color: "text.primary" }}
                      >
                        Cliente, venta y captura
                      </Typography>
                      <Typography
                        sx={{ color: "text.secondary", fontSize: 12.5 }}
                      >
                        Enter agrega, Ctrl+B enfoca codigo y F10 procesa la
                        venta.
                      </Typography>
                    </Box>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={0.75}
                      sx={{ width: { xs: "100%", sm: "auto" } }}
                    >
                      <Button
                        fullWidth={false}
                        size="small"
                        variant="outlined"
                        startIcon={<UserRoundSearch className="h-4 w-4" />}
                        onClick={applyWalkInCustomer}
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                      >
                        Consumidor final · F2
                      </Button>
                      <Button
                        fullWidth={false}
                        size="small"
                        variant="text"
                        onClick={() =>
                          setShowExtraCustomerFields((prev) => !prev)
                        }
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                      >
                        {showExtraCustomerFields
                          ? "Ocultar extras"
                          : "Mas datos"}
                      </Button>
                    </Stack>
                  </Stack>

                  <Grid container spacing={1} sx={{ minWidth: 0 }}>
                    <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          p: 1.1,
                          borderRadius: "18px",
                          border: `1px solid ${subtleBorder}`,
                          backgroundColor: softPrimary,
                          height: "100%",
                          minWidth: 0,
                        }}
                      >
                        <Stack spacing={1}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "text.secondary",
                            }}
                          >
                            Documento
                          </Typography>
                          <TextField
                            fullWidth
                            label="Fecha"
                            size="small"
                            value={format(new Date(), "dd/MM/yyyy")}
                            InputProps={{
                              readOnly: true,
                            }}
                          />
                          <TextField
                            select
                            fullWidth
                            label="Documento"
                            size="small"
                            value={documentType}
                            onChange={(e) =>
                              setDocumentType(e.target.value as PosDocumentType)
                            }
                          >
                            <MenuItem value="NONE">
                              Comprobante de venta
                            </MenuItem>
                            <MenuItem
                              value="INVOICE"
                              disabled={!billingEnabled}
                            >
                              Factura
                            </MenuItem>
                          </TextField>
                        </Stack>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          p: 1.1,
                          borderRadius: "18px",
                          border: `1px solid ${subtleBorder}`,
                          backgroundColor: panelBg,
                          minWidth: 0,
                        }}
                      >
                        <Stack spacing={1}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "text.secondary",
                            }}
                          >
                            Cliente
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
                              <TextField
                                fullWidth
                                select
                                label="Tipo ID"
                                size="small"
                                value={customer.tipoIdentificacion}
                                onChange={(e) => {
                                  selectCustomer({
                                    tipoIdentificacion: e.target.value,
                                  });
                                  focusIdentificationField(true);
                                }}
                              >
                                {IDENTIFICATION_TYPES.map((type) => (
                                  <MenuItem key={type.code} value={type.code}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 8, md: 4.5 }}>
                              <TextField
                                fullWidth
                                label="Identificacion"
                                size="small"
                                inputRef={identificationInputRef}
                                value={customer.identificacion}
                                onChange={(e) =>
                                  selectCustomer({
                                    identificacion: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    searchCustomerByIdentification();
                                  }
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        size="small"
                                        edge="end"
                                        onClick={searchCustomerByIdentification}
                                      >
                                        <Search className="h-4 w-4" />
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                }}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 5 }}>
                              <TextField
                                fullWidth
                                label="Nombre / razon social"
                                size="small"
                                inputRef={customerNameInputRef}
                                value={customer.razonSocial}
                                onChange={(e) =>
                                  selectCustomer({
                                    razonSocial: e.target.value,
                                  })
                                }
                              />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <TextField
                                fullWidth
                                label="Email"
                                size="small"
                                value={customer.email}
                                onChange={(e) =>
                                  selectCustomer({ email: e.target.value })
                                }
                              />
                            </Grid>
                          </Grid>
                          {activeHeldSaleId ? (
                            <Stack
                              direction="row"
                              spacing={0.6}
                              flexWrap="wrap"
                              useFlexGap
                            >
                              <Chip
                                size="small"
                                label="Venta en espera"
                                sx={{
                                  borderRadius: "999px",
                                  backgroundColor: accentSoft,
                                  color: "secondary.dark",
                                }}
                              />
                            </Stack>
                          ) : null}
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>

                  <Collapse in={showExtraCustomerFields}>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Direccion"
                          size="small"
                          value={customer.direccion}
                          onChange={(e) =>
                            selectCustomer({ direccion: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          label="Telefono"
                          size="small"
                          value={customer.telefono}
                          onChange={(e) =>
                            selectCustomer({ telefono: e.target.value })
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                        <TextField
                          fullWidth
                          label="Etiqueta espera"
                          size="small"
                          value={heldLabel}
                          onChange={(e) => setHeldLabel(e.target.value)}
                          placeholder="Mesa 2"
                        />
                      </Grid>
                    </Grid>
                  </Collapse>

                  <Paper
                    sx={{
                      p: 1.1,
                      borderRadius: "18px",
                      border: `1px solid ${subtleBorder}`,
                      backgroundColor: panelBg,
                      minWidth: 0,
                    }}
                  >
                    <Stack spacing={0.9}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        alignItems={{ md: "center" }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "text.secondary",
                            }}
                          >
                            Ingreso rapido de producto
                          </Typography>
                          <Typography
                            sx={{ color: "text.secondary", fontSize: 12.5 }}
                          >
                            Primero codigo, despues busqueda manual si hace
                            falta.
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label="Ctrl+B vuelve a codigo"
                          sx={{
                            alignSelf: "flex-start",
                            borderRadius: "999px",
                            backgroundColor: chipBg,
                            color: "primary.main",
                          }}
                        />
                      </Stack>

                      <Grid
                        container
                        spacing={1}
                        columns={{ xs: 12, md: 20 }}
                        sx={{ minWidth: 0 }}
                      >
                        <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                          <TextField
                            fullWidth
                            label="Codigo / barra"
                            size="small"
                            inputRef={barcodeInputRef}
                            value={barcodeQuery}
                            onChange={(e) => setBarcodeQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddByCode();
                              }
                            }}
                            placeholder="Escanear o escribir codigo o barra"
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    size="small"
                                    edge="end"
                                    onClick={handleAddByCode}
                                  >
                                    <ScanLine className="h-4 w-4" />
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 12 }} sx={{ minWidth: 0 }}>
                          <Autocomplete
                            options={products}
                            value={manualProduct}
                            onChange={(_, value) => setManualProduct(value)}
                            filterOptions={(options, state) => {
                              const normalized = state.inputValue
                                .trim()
                                .toLowerCase();
                              if (!normalized) {
                                return options;
                              }

                              return options.filter(
                                (option) =>
                                  option.codigo
                                    .toLowerCase()
                                    .includes(normalized) ||
                                  (option.codigoBarras ?? "")
                                    .toLowerCase()
                                    .includes(normalized) ||
                                  matchesScaleBarcodePrefix(
                                    normalized,
                                    option.codigoBarras ??
                                      option.codigo ??
                                      option.sku,
                                  ) ||
                                  (option.sku ?? "")
                                    .toLowerCase()
                                    .includes(normalized) ||
                                  option.nombre
                                    .toLowerCase()
                                    .includes(normalized),
                              );
                            }}
                            getOptionLabel={(option) =>
                              `${option.codigo}${
                                option.codigoBarras
                                  ? ` · ${option.codigoBarras}`
                                  : ""
                              } · ${option.nombre}`
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                label="Agregar manualmente"
                                size="small"
                                placeholder="Buscar por nombre, codigo o barra"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && manualProduct) {
                                    e.preventDefault();
                                    handleAddManualProduct();
                                  }
                                }}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <InputAdornment position="start">
                                        <Search className="h-4 w-4" />
                                      </InputAdornment>
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                            renderOption={(props, option) => {
                              const { key, ...optionProps } = props;

                              return (
                                <Box component="li" key={key} {...optionProps}>
                                  <Stack spacing={0.2} sx={{ width: "100%" }}>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {option.nombre}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "text.secondary" }}
                                    >
                                      {option.codigo} ·{" "}
                                      {option.codigoBarras
                                        ? `${option.codigoBarras} · `
                                        : ""}
                                      {formatCurrency(option.precio)} ·{" "}
                                      {option.tipoProducto === "BIEN"
                                        ? inventoryTrackingEnabled
                                          ? `Stock ${option.stock.toFixed(3)}`
                                          : "Sin control de stock"
                                        : "Servicio"}
                                    </Typography>
                                  </Stack>
                                </Box>
                              );
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                          <TextField
                            fullWidth
                            label="Cant."
                            type="text"
                            size="small"
                            value={entryQuantity}
                            onChange={(e) =>
                              setEntryQuantity(
                                sanitizeDecimalInput(e.target.value, 3),
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            onBlur={(e) =>
                              setEntryQuantity(
                                formatDecimalInput(
                                  Math.max(
                                    parseDecimalInput(e.target.value, 1),
                                    0.001,
                                  ),
                                  3,
                                  true,
                                ),
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") {
                                return;
                              }

                              e.preventDefault();
                              if (barcodeQuery.trim()) {
                                handleAddByCode();
                                return;
                              }

                              if (manualProduct) {
                                handleAddManualProduct();
                              }
                            }}
                            slotProps={{
                              htmlInput: {
                                inputMode: "decimal",
                                enterKeyHint: "done",
                                style: { textAlign: "right" },
                              },
                            }}
                          />
                        </Grid>
                        {/* <Grid size={{ xs: 12, sm: 8, md: 2 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="contained"
                            startIcon={<Plus className="h-4 w-4" />}
                            onClick={handleAddManualProduct}
                            sx={{ minHeight: 40 }}
                          >
                            Agregar
                          </Button>
                        </Grid> */}
                      </Grid>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>

              <Paper
                sx={{
                  borderRadius: "22px",
                  p: { xs: 1.25, md: 2 },
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  minWidth: 0,
                }}
              >
                <Stack
                  spacing={1.25}
                  sx={{ flex: 1, minHeight: 0, minWidth: 0 }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800, color: "text.primary" }}
                      >
                        Detalle de productos
                      </Typography>
                      {/* <Typography
                        sx={{ color: "text.secondary", fontSize: 12.5 }}
                      >
                        Tabla rapida para editar cantidades, precio y descuento.
                      </Typography> */}
                    </Box>
                    <Chip
                      label={`${linePreview.length} item${linePreview.length === 1 ? "" : "s"}`}
                      size="small"
                      sx={{ alignSelf: "flex-start", borderRadius: "999px" }}
                    />
                  </Stack>

                  <Box
                    sx={
                      {
                        // overflowX: "auto",
                        // overflowY: "hidden",
                        // borderRadius: "18px",
                        // border: `1px solid ${subtleBorder}`,
                        // flex: 1,
                        // minHeight: 0,
                        // minWidth: 0,
                      }
                    }
                  >
                    <DataGrid
                      rows={linePreview}
                      columns={dataGridColumns}
                      getRowId={(row) => row.productId}
                      disableRowSelectionOnClick
                      disableColumnMenu
                      hideFooterSelectedRowCount
                      hideFooter
                      density="compact"
                      columnHeaderHeight={34}
                      rowHeight={68}
                      localeText={{
                        noRowsLabel: "Todavia no hay productos agregados.",
                      }}
                      sx={{
                        height: "100%",
                        minWidth: { xs: 860, md: 0 },
                        border: "none",
                        "& .MuiDataGrid-columnHeaders": {
                          minHeight: "34px !important",
                          maxHeight: "34px !important",
                          backgroundColor: softPrimaryAlt,
                          borderBottom: `1px solid ${subtleBorder}`,
                        },
                        "& .MuiDataGrid-cell": {
                          fontSize: 12,
                          alignItems: "center",
                          px: 0.75,
                          py: 0.25,
                          borderColor: subtleBorderSoft,
                        },
                        "& .MuiDataGrid-columnHeader": {
                          px: 0.75,
                          py: 0,
                          minHeight: "34px !important",
                        },
                        "& .MuiDataGrid-columnHeaderTitle": {
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        },
                        "& .MuiDataGrid-columnSeparator": {
                          display: "none",
                        },
                        "& .MuiDataGrid-row": {
                          backgroundColor: alpha(
                            theme.palette.background.paper,
                            0.95,
                          ),
                        },
                        "& .MuiDataGrid-row:hover": {
                          backgroundColor: alpha(
                            theme.palette.primary.light,
                            0.46,
                          ),
                        },
                        "& .MuiDataGrid-cellContent": {
                          lineHeight: 1.15,
                        },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                          {
                            outline: "none",
                          },
                      }}
                    />
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          <Grid
            size={{ xs: 12, md: 3, xl: 4 }}
            sx={{ minHeight: 0, minWidth: 0, display: "flex" }}
          >
            <Stack spacing={1.5} sx={{ minHeight: 0, minWidth: 0, flex: 1 }}>
              <Paper
                sx={{
                  borderRadius: "22px",
                  p: { xs: 1.25, md: 2 },
                  height: { md: "100%" },
                  display: "flex",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <Stack
                  spacing={1.5}
                  sx={{ flex: 1, minHeight: 0, minWidth: 0 }}
                >
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, color: "text.primary" }}
                    >
                      Resumen de cobro
                    </Typography>
                    {/* <Typography
                      sx={{ color: "text.secondary", fontSize: 12.5 }}
                    >
                      Total, desglose y medios de pago.
                    </Typography> */}
                  </Box>

                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: "20px",
                      background: totalGradient,
                      color: "common.white",
                      borderColor: alpha(theme.palette.primary.dark, 0.24),
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    <Stack spacing={1} alignItems="center">
                      <Typography
                        sx={{
                          fontSize: 12,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          opacity: 0.82,
                        }}
                      >
                        Total a pagar
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: 28, sm: 34, xl: 40 },
                          fontWeight: 900,
                          lineHeight: 1,
                          textAlign: "center",
                          width: "100%",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatCurrency(totals.total)}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          documentType === "INVOICE" ? "Factura" : "Ticket"
                        }
                        sx={{
                          borderRadius: "999px",
                          backgroundColor: alpha(
                            theme.palette.common.white,
                            0.14,
                          ),
                          color: "common.white",
                          border: `1px solid ${alpha(
                            theme.palette.common.white,
                            0.16,
                          )}`,
                        }}
                      />
                    </Stack>
                  </Paper>

                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: "18px",
                      backgroundColor: softPrimary,
                      borderColor: subtleBorder,
                      minWidth: 0,
                    }}
                  >
                    <Stack spacing={0.85}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "text.secondary",
                        }}
                      >
                        Desglose
                      </Typography>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary" variant="body2">
                          Subtotal
                        </Typography>
                        <Typography fontWeight={700} variant="body2">
                          {formatCurrency(totals.subtotal)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary" variant="body2">
                          Descuento
                        </Typography>
                        <Typography fontWeight={700} variant="body2">
                          {formatCurrency(totals.discount)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary" variant="body2">
                          IVA
                        </Typography>
                        <Typography fontWeight={700} variant="body2">
                          {formatCurrency(totals.tax)}
                        </Typography>
                      </Stack>
                      <Divider />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          Neto
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800, color: "primary.main" }}
                        >
                          {formatCurrency(totals.total)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: "18px",
                      backgroundColor: panelBg,
                      borderColor: subtleBorder,
                      minWidth: 0,
                    }}
                  >
                    <Stack spacing={1} sx={{ minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "text.secondary",
                        }}
                      >
                        Medios de pago
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Plus className="h-4 w-4" />}
                          onClick={addPaymentLine}
                        >
                          Agregar
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          onClick={fillRemainingPayment}
                        >
                          Completar
                        </Button>
                      </Stack>

                      <Stack
                        spacing={0.85}
                        sx={{
                          overflowY: { xs: "visible", md: "auto" },
                          pt: 0.8,
                          pr: { md: 0.25 },
                          minWidth: 0,
                        }}
                      >
                        {paymentLines.map((line) => (
                          <Stack
                            key={line.id}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={0.75}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{ minWidth: 0 }}
                          >
                            <TextField
                              select
                              size="small"
                              label="Medio"
                              value={line.formaPago}
                              onChange={(e) =>
                                updatePaymentLine(line.id, {
                                  formaPago: e.target.value,
                                })
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            >
                              {PAYMENT_METHODS.map((method) => (
                                <MenuItem key={method.code} value={method.code}>
                                  {method.label}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              size="small"
                              label="Valor"
                              type="text"
                              value={line.total}
                              onChange={(e) =>
                                updatePaymentLine(line.id, {
                                  total: sanitizeDecimalInput(
                                    e.target.value,
                                    2,
                                  ),
                                })
                              }
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) =>
                                updatePaymentLine(line.id, {
                                  total: formatDecimalInput(
                                    parseDecimalInput(e.target.value, 0),
                                    2,
                                  ),
                                })
                              }
                              slotProps={{
                                htmlInput: {
                                  inputMode: "decimal",
                                  enterKeyHint: "done",
                                  style: { textAlign: "right" },
                                },
                              }}
                              sx={{ width: { xs: "100%", sm: 106 } }}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    $
                                  </InputAdornment>
                                ),
                              }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removePaymentLine(line.id)}
                              disabled={paymentLines.length === 1}
                              sx={{
                                alignSelf: { xs: "flex-end", sm: "center" },
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </Stack>
                        ))}
                      </Stack>

                      <TextField
                        size="small"
                        label="Recibido en efectivo"
                        type="text"
                        value={cashReceived}
                        onChange={(e) => {
                          setCashReceivedTouched(true);
                          setCashReceived(
                            sanitizeDecimalInput(e.target.value, 2),
                          );
                        }}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) =>
                          setCashReceived(
                            formatDecimalInput(
                              parseDecimalInput(e.target.value, 0),
                              2,
                            ),
                          )
                        }
                        slotProps={{
                          htmlInput: {
                            inputMode: "decimal",
                            enterKeyHint: "done",
                            style: { textAlign: "right" },
                          },
                        }}
                        disabled={cashPaymentAllocated <= 0}
                        helperText={
                          cashPaymentAllocated > 0
                            ? "Se usa para calcular vuelto del efectivo."
                            : "Activa una linea en efectivo para calcular vuelto."
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">$</InputAdornment>
                          ),
                        }}
                      />

                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary" variant="body2">
                            Registrado
                          </Typography>
                          <Typography fontWeight={700} variant="body2">
                            {formatCurrency(allocatedAmount)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary" variant="body2">
                            Pendiente
                          </Typography>
                          <Typography
                            fontWeight={700}
                            variant="body2"
                            color={
                              remainingAmount > 0 ? "primary.main" : "inherit"
                            }
                          >
                            {formatCurrency(remainingAmount)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography color="text.secondary" variant="body2">
                            Vuelto
                          </Typography>
                          <Typography fontWeight={700} variant="body2">
                            {formatCurrency(changeAmount)}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <PosCashSessionDialog
        open={cashDialogOpen}
        submitting={cashSubmitting}
        cashSession={cashSession}
        cashRuntime={cashRuntime}
        openingAmount={openingAmount}
        openingNotes={openingNotes}
        closingAmount={closingAmount}
        closingNotes={closingNotes}
        onOpeningAmountChange={(value) =>
          setOpeningAmount(sanitizeDecimalInput(value, 2))
        }
        onOpeningNotesChange={setOpeningNotes}
        onClosingAmountChange={(value) =>
          setClosingAmount(sanitizeDecimalInput(value, 2))
        }
        onClosingNotesChange={setClosingNotes}
        onOpenCash={() => void openCash()}
        onCloseCash={() => void closeCash()}
        onReprintClosedSession={(session) => {
          const ticketData = buildLegacyCashCloseTicketData(session);
          if (!ticketData) {
            setMessage({
              tone: "error",
              text: "No se pudo preparar la reimpresion del cierre",
            });
            return;
          }
          void printCashCloseTicket(ticketData);
        }}
        onClose={() => setCashDialogOpen(false)}
      />
      <PosHeldSalesDialog
        open={heldSalesDialogOpen}
        heldSales={heldSales}
        activeHeldSaleId={activeHeldSaleId}
        deletingHeldSaleId={deletingHeldSaleId}
        onClose={() => setHeldSalesDialogOpen(false)}
        onLoadHeldSale={(heldSaleId) => {
          const heldSale = heldSales.find((item) => item.id === heldSaleId);
          if (!heldSale) {
            return;
          }
          setHeldSalesDialogOpen(false);
          loadHeldSale(heldSale);
        }}
        onDeleteHeldSale={(heldSaleId) => {
          void removeHeldSale(heldSaleId);
        }}
      />
    </Box>
  );
}
