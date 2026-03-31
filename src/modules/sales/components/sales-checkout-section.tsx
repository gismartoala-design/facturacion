import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  Loader2,
  Plus,
  RefreshCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  UserRoundSearch,
} from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { matchesScaleBarcodePrefix } from "@/lib/utils";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type Customer,
  type IdentificationTypeOption,
  type LineItem,
  type LinePreviewItem,
  type PaymentMethodOption,
  type Product,
} from "@/shared/dashboard/types";

export type SalesCheckoutSectionProps = {
  mode: "sale" | "quote";
  products: Product[];
  customers: Customer[];
  checkout: CheckoutForm;
  setCheckout: Dispatch<SetStateAction<CheckoutForm>>;
  linePreview: LinePreviewItem[];
  checkoutSubtotal: number;
  checkoutTax: number;
  checkoutTotal: number;
  inventoryTrackingEnabled: boolean;
  selectedIdentificationType?: IdentificationTypeOption;
  selectedPaymentMethod?: PaymentMethodOption;
  canPrintPdf: boolean;
  canPrintQuote: boolean;
  canResetCheckout: boolean;
  saving: boolean;
  savingQuote: boolean;
  editingQuoteId: string | null;
  onPrintPdf: () => void;
  onPrintQuote?: () => void;
  onCancelEdit?: () => void;
  onOpenQuotesModal?: () => void;
  onResetCheckout: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSearchCustomerByIdentification: () => void;
  onApplyWalkInCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  customerSearch: string;
  setCustomerSearch: Dispatch<SetStateAction<string>>;
  customerLoading: boolean;
  barcodeQuery: string;
  setBarcodeQuery: Dispatch<SetStateAction<string>>;
  entryQuantity: string;
  setEntryQuantity: Dispatch<SetStateAction<string>>;
  manualProduct: Product | null;
  setManualProduct: Dispatch<SetStateAction<Product | null>>;
  onAddByCode: () => void;
  onAddManualProduct: () => void;
  updateLineByProduct: (productId: string, patch: Partial<LineItem>) => void;
  removeLine: (productId: string) => void;
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function cardShell() {
  return {
    borderRadius: "24px",
    // border: "1px solid rgba(232, 213, 229, 0.72)",
    // backgroundColor: "rgba(255,255,255,0.96)",
    boxShadow: "none",
  } as const;
}

function sectionShell() {
  return {
    px: 0,
    py: 0.5,
  } as const;
}

export function SalesCheckoutSection({
  mode,
  products,
  customers,
  checkout,
  setCheckout,
  linePreview,
  checkoutSubtotal,
  checkoutTax,
  checkoutTotal,
  inventoryTrackingEnabled,
  selectedIdentificationType,
  selectedPaymentMethod,
  canPrintPdf,
  canPrintQuote,
  canResetCheckout,
  saving,
  savingQuote,
  editingQuoteId,
  onPrintPdf,
  onPrintQuote,
  onCancelEdit,
  onOpenQuotesModal,
  onResetCheckout,
  onSubmit,
  onSearchCustomerByIdentification,
  onApplyWalkInCustomer,
  onSelectCustomer,
  customerSearch,
  setCustomerSearch,
  customerLoading,
  barcodeQuery,
  setBarcodeQuery,
  entryQuantity,
  setEntryQuantity,
  manualProduct,
  setManualProduct,
  onAddByCode,
  onAddManualProduct,
  updateLineByProduct,
  removeLine,
}: SalesCheckoutSectionProps) {
  const theme = useTheme();
  const hasCustomerSelected = Boolean(
    checkout.identificacion.trim() && checkout.razonSocial.trim(),
  );
  const checkoutDiscount = linePreview.reduce((acc, line) => acc + line.descuento, 0);
  const isQuoteMode = mode === "quote";
  const primaryBusy = isQuoteMode ? savingQuote : saving;
  const primaryLabel = isQuoteMode
    ? editingQuoteId
      ? "Actualizar cotizacion"
      : "Guardar cotizacion"
    : "Registrar venta";
  const processingLabel = isQuoteMode
    ? editingQuoteId
      ? "Actualizando cotizacion..."
      : "Guardando cotizacion..."
    : "Procesando...";
  const subtleBorder = alpha(theme.palette.divider, 0.9);
  const subtleBorderSoft = alpha(theme.palette.divider, 0.55);
  const softPrimaryAlt = alpha(theme.palette.primary.light, 0.35);
  const chipBg = alpha(theme.palette.primary.light, 0.9);
  const dataGridColumns: GridColDef<LinePreviewItem>[] = [
    {
      field: "product",
      headerName: "Producto",
      flex: 1.25,
      minWidth: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack spacing={0.15} sx={{ py: 0.25, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} noWrap>
            {row.product.nombre}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary" }} noWrap>
            {row.product.codigo}
            {row.product.codigoBarras ? ` · ${row.product.codigoBarras}` : ""}
            {row.product.sku ? ` · ${row.product.sku}` : ""}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "precioUnitario",
      headerName: "Precio",
      width: 118,
      sortable: false,
      renderCell: ({ row }) => (
        <TextField
          fullWidth
          size="small"
          type="number"
          inputProps={{ min: 0.01, step: 0.01, style: { textAlign: "right" } }}
          value={row.precioUnitario}
          onChange={(event) =>
            updateLineByProduct(row.productId, {
              precioUnitario: Number(event.target.value) || 0.01,
            })
          }
          sx={{
            "& .MuiInputBase-root": {
              height: 34,
              fontSize: 12,
            },
          }}
        />
      ),
    },
    {
      field: "cantidad",
      headerName: "Cant.",
      width: 96,
      sortable: false,
      renderCell: ({ row }) => (
        <TextField
          fullWidth
          size="small"
          type="number"
          inputProps={{ min: 0.001, step: 0.001, style: { textAlign: "right" } }}
          value={row.cantidad}
          onChange={(event) =>
            updateLineByProduct(row.productId, {
              cantidad: Number(event.target.value) || 0.001,
            })
          }
          sx={{
            "& .MuiInputBase-root": {
              height: 34,
              fontSize: 12,
            },
          }}
        />
      ),
    },
    {
      field: "discountPercent",
      headerName: "% Desc.",
      width: 92,
      sortable: false,
      valueGetter: (_, row) => {
        const gross = row.cantidad * row.precioUnitario;
        if (gross <= 0 || row.descuento <= 0) {
          return 0;
        }
        return Number(((row.descuento / gross) * 100).toFixed(2));
      },
      renderCell: ({ row }) => {
        const gross = row.cantidad * row.precioUnitario;
        const percent = gross > 0 ? Number(((row.descuento / gross) * 100).toFixed(2)) : 0;
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01, style: { textAlign: "right" } }}
            value={percent}
            onChange={(event) => {
              const nextPercent = Math.min(Math.max(Number(event.target.value) || 0, 0), 100);
              updateLineByProduct(row.productId, {
                descuento: Number(((gross * nextPercent) / 100).toFixed(2)),
              });
            }}
            sx={{
              "& .MuiInputBase-root": {
                height: 34,
                fontSize: 12,
              },
            }}
          />
        );
      },
    },
    {
      field: "descuento",
      headerName: "Desc. $",
      width: 108,
      sortable: false,
      renderCell: ({ row }) => (
        <TextField
          fullWidth
          size="small"
          type="number"
          inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
          value={row.descuento}
          onChange={(event) =>
            updateLineByProduct(row.productId, {
              descuento: Math.max(Number(event.target.value) || 0, 0),
            })
          }
          sx={{
            "& .MuiInputBase-root": {
              height: 34,
              fontSize: 12,
            },
          }}
        />
      ),
    },
    {
      field: "total",
      headerName: "Total",
      width: 104,
      sortable: false,
      renderCell: ({ row }) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
          {formatCurrency(row.total)}
        </Typography>
      ),
    },
    {
      field: "accion",
      headerName: "",
      width: 58,
      sortable: false,
      renderCell: ({ row }) => (
        <IconButton
          size="small"
          color="error"
          onClick={() => removeLine(row.productId)}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={0.75}>
          <Typography
            variant="h5"
            sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
          >
            {isQuoteMode ? "Gestionar Cotización" : "Facturar Venta"}
          </Typography>
          <Typography
            sx={{
              maxWidth: 720,
              color: "rgba(74, 60, 88, 0.68)",
              fontSize: 14,
            }}
          >
            {isQuoteMode
              ? "Arma la propuesta, ajusta productos y guarda la cotizacion sin afectar inventario."
              : "Registrar la venta, validar cliente y emitir factura en un solo paso."}
          </Typography>
        </Stack>
      </Box>

      <Paper sx={{ ...cardShell(), p: 2.25 }}>
        <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2.25 }}>
          <Box
            sx={{
              ...sectionShell(),
              pb: 1.75,
              borderBottom: `1px solid ${subtleBorderSoft}`,
            }}
          >
            <Stack spacing={1.5}>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.25,
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  pb: 0.5,
                  "& > *": {
                    flexShrink: 0,
                  },
                }}
              >
                <Button
                  disabled={primaryBusy || linePreview.length === 0}
                  type="submit"
                  variant="contained"
                  sx={{ backgroundColor: "#4a3c58", "&:hover": { backgroundColor: "#3d3249" } }}
                  startIcon={
                    primaryBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )
                  }
                >
                  {primaryBusy ? processingLabel : primaryLabel}
                </Button>
                {editingQuoteId ? (
                  <Button
                    type="button"
                    variant="outlined"
                    color="warning"
                    onClick={onCancelEdit}
                    disabled={saving || savingQuote}
                  >
                    Cancelar edicion
                  </Button>
                ) : null}
                {!isQuoteMode && onOpenQuotesModal ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={onOpenQuotesModal}
                    disabled={saving || savingQuote}
                  >
                    Cargar cotizacion abierta
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onResetCheckout}
                  disabled={saving || savingQuote || !canResetCheckout}
                  startIcon={<RefreshCcw className="h-4 w-4" />}
                >
                  Resetear
                </Button>
                {!isQuoteMode ? (
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={!canPrintPdf}
                    onClick={onPrintPdf}
                  >
                    Imprimir
                  </Button>
                ) : canPrintQuote && onPrintQuote ? (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={onPrintQuote}
                    disabled={savingQuote}
                  >
                    Descargar PDF cotizacion
                  </Button>
                ) : null}
              </Box>

              <Stack spacing={1}>
                {editingQuoteId ? (
                  <Chip
                    label="Editando cotizacion"
                    color="warning"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start", fontWeight: 600 }}
                  />
                ) : null}
              </Stack>
            </Stack>
          </Box>

          <Box
            sx={{
              ...sectionShell(),
              pt: 2,
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
                spacing={1.5}
              >
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b1a1c6" }}>
                    1. Documento y cliente
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: "rgba(74, 60, 88, 0.72)" }}>
                    Completa los datos de emision y del comprador en un solo bloque.
                  </Typography>
                </Box>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<UserRoundSearch className="h-4 w-4" />}
                  onClick={onApplyWalkInCustomer}
                >
                  Consumidor final
                </Button>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    id="fecha"
                    label="Fecha emision"
                    value={checkout.fechaEmision}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        fechaEmision: e.target.value,
                      }))
                    }
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    id="tipoId"
                    label="Tipo identificacion"
                    value={checkout.tipoIdentificacion}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        tipoIdentificacion: e.target.value,
                      }))
                    }
                  >
                    {IDENTIFICATION_TYPES.map((type) => (
                      <MenuItem key={type.code} value={type.code}>
                        {type.label} ({type.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    id="formaPago"
                    label="Forma pago"
                    value={checkout.formaPago}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        formaPago: e.target.value,
                      }))
                    }
                    helperText={
                      isQuoteMode
                        ? undefined
                        : "Dato informativo para la factura. El cobro se registrara despues."
                    }
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method.code} value={method.code}>
                        {method.label} ({method.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              <Autocomplete
                options={customers}
                value={null}
                inputValue={customerSearch}
                onChange={(_, value) => {
                  if (!value) return;
                  onSelectCustomer(value);
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === "reset") {
                    setCustomerSearch("");
                    return;
                  }

                  setCustomerSearch(value);
                }}
                loading={customerLoading}
                filterOptions={(options) => options}
                getOptionLabel={(option) =>
                  `${option.identificacion} · ${option.razonSocial}`
                }
                noOptionsText={
                  customerSearch.trim().length < 2
                    ? "Escribe al menos 2 caracteres"
                    : "No se encontraron clientes"
                }
                sx={{
                  "& .MuiInputBase-root": {
                    minHeight: 40,
                    height: 40,
                    alignItems: "center",
                  },
                  "& .MuiAutocomplete-input": {
                    minWidth: 0,
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Buscar cliente"
                    size="small"
                    placeholder="Buscar por identificacion, nombre, email o telefono"
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
                      endAdornment: (
                        <>
                          {customerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
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
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {option.razonSocial}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {option.identificacion}
                          {option.email ? ` · ${option.email}` : ""}
                          {option.telefono ? ` · ${option.telefono}` : ""}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                }}
              />

              {hasCustomerSelected ? (
                <Box
                  sx={{
                    borderRadius: "14px",
                    border: "1px solid rgba(232, 213, 229, 0.72)",
                    backgroundColor: "rgba(177, 161, 198, 0.10)",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: "#4a3c58" }}>
                    Cliente activo: <strong>{checkout.razonSocial}</strong> ({checkout.identificacion})
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    borderRadius: "14px",
                    border: "1px solid #fde68a",
                    backgroundColor: "#fffbeb",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: 14, color: "#b45309" }}>
                    Aun no has seleccionado cliente.
                  </Typography>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    id="identificacion"
                    label="Identificacion"
                    value={checkout.identificacion}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        identificacion: e.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSearchCustomerByIdentification();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={onSearchCustomerByIdentification}
                          >
                            <Search className="h-4 w-4" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    id="razon"
                    label="Razon social"
                    value={checkout.razonSocial}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        razonSocial: e.target.value,
                      }))
                    }
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    id="direccion"
                    label="Direccion"
                    value={checkout.direccion}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        direccion: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    id="email"
                    label="Email"
                    type="email"
                    value={checkout.email}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    id="telefono"
                    label="Telefono"
                    type="tel"
                    value={checkout.telefono}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        telefono: e.target.value,
                      }))
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          </Box>

          <Box
            sx={{
              ...sectionShell(),
              pt: 1.5,
              borderTop: `1px solid ${subtleBorderSoft}`,
            }}
          >
            <Stack spacing={1.5}>
              <Box
                sx={{
                  minWidth: 0,
                  py: 0.25,
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
                      <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                        Primero codigo, despues busqueda manual si hace falta.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label="Venta directa"
                        sx={{
                          alignSelf: "flex-start",
                          borderRadius: "999px",
                          backgroundColor: chipBg,
                          color: "primary.main",
                        }}
                      />
                    </Stack>
                  </Stack>

                  <Grid
                    container
                    spacing={1}
                    columns={{ xs: 12, md: 22 }}
                    sx={{ minWidth: 0 }}
                  >
                    <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                      <TextField
                        fullWidth
                        label="Codigo / barra"
                        size="small"
                        value={barcodeQuery}
                        onChange={(event) => setBarcodeQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onAddByCode();
                          }
                        }}
                        placeholder="Escanear o escribir codigo o barra"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton size="small" edge="end" onClick={onAddByCode}>
                                <ScanLine className="h-4 w-4" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 10 }} sx={{ minWidth: 0 }}>
                      <Autocomplete
                        options={products}
                        value={manualProduct}
                        onChange={(_, value) => setManualProduct(value)}
                        sx={{
                          "& .MuiInputBase-root": {
                            minHeight: 40,
                            height: 42,
                            alignItems: "center",
                          },
                          "& .MuiAutocomplete-input": {
                            minWidth: 0,
                          },
                        }}
                        filterOptions={(options, state) => {
                          const normalized = state.inputValue.trim().toLowerCase();
                          if (!normalized) {
                            return options;
                          }

                          return options.filter(
                            (option) =>
                              option.codigo.toLowerCase().includes(normalized) ||
                              (option.codigoBarras ?? "").toLowerCase().includes(normalized) ||
                              matchesScaleBarcodePrefix(
                                normalized,
                                option.codigoBarras ?? option.codigo ?? option.sku,
                              ) ||
                              (option.sku ?? "").toLowerCase().includes(normalized) ||
                              option.nombre.toLowerCase().includes(normalized),
                          );
                        }}
                        getOptionLabel={(option) =>
                          `${option.codigo}${option.codigoBarras ? ` · ${option.codigoBarras}` : ""} · ${option.nombre}`
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Agregar manualmente"
                            size="small"
                            placeholder="Buscar por nombre, codigo o barra"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && manualProduct) {
                                event.preventDefault();
                                onAddManualProduct();
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
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {option.nombre}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                  {option.codigo} ·{" "}
                                  {option.codigoBarras ? `${option.codigoBarras} · ` : ""}
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
                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Cant."
                        type="number"
                        size="small"
                        value={entryQuantity}
                        onChange={(event) => setEntryQuantity(event.target.value)}
                        onFocus={(event) => event.target.select()}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") {
                            return;
                          }

                          event.preventDefault();
                          if (barcodeQuery.trim()) {
                            onAddByCode();
                            return;
                          }

                          if (manualProduct) {
                            onAddManualProduct();
                          }
                        }}
                        inputProps={{
                          min: 0.001,
                          step: 0.001,
                          inputMode: "decimal",
                          style: { textAlign: "right" },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8, md: 3 }}>
                      <Button
                        fullWidth
                        type="button"
                        size="small"
                        variant="contained"
                        startIcon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                          if (barcodeQuery.trim()) {
                            onAddByCode();
                            return;
                          }

                          onAddManualProduct();
                        }}
                        sx={{ minHeight: 40 }}
                      >
                        Agregar
                      </Button>
                    </Grid>
                  </Grid>
                </Stack>
              </Box>

              <Box
                sx={{
                  minHeight: 0,
                  minWidth: 0,
                  pt: 0.5,
                }}
              >
                <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
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
                    </Box>
                    <Chip
                      label={`${linePreview.length} item${linePreview.length === 1 ? "" : "s"}`}
                      size="small"
                      sx={{ alignSelf: "flex-start", borderRadius: "999px" }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      // overflowX: "auto",
                      // maxHeight: 320,
                      // height: Math.min(Math.max(linePreview.length, 1) * 68 + 64, 420),
                      height: 320,
                    }}
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
                      rowHeight={56}
                      localeText={{
                        noRowsLabel: "Todavia no hay productos agregados.",
                      }}
                      sx={{
                        height: "100%",
                        minWidth: { xs: 980, md: 0 },
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
                          backgroundColor: alpha(theme.palette.background.paper, 0.95),
                        },
                        "& .MuiDataGrid-row:hover": {
                          backgroundColor: alpha(theme.palette.primary.light, 0.46),
                        },
                        "& .MuiDataGrid-cellContent": {
                          lineHeight: 1.15,
                        },
                        "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                          outline: "none",
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              ...sectionShell(),
              pt: 1.75,
              borderTop: `1px solid ${subtleBorderSoft}`,
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box
                  sx={{
                    borderRadius: "18px",
                    border: "1px solid rgba(232, 213, 229, 0.55)",
                    backgroundColor: "rgba(253, 252, 245, 0.7)",
                    p: 2,
                    height: "100%",
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b1a1c6" }}>
                    Subtotal
                  </Typography>
                  <Typography sx={{ mt: 2, fontSize: 30, fontWeight: 700, color: "#4a3c58" }}>
                    ${checkoutSubtotal.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box
                  sx={{
                    borderRadius: "18px",
                    border: "1px solid rgba(232, 213, 229, 0.55)",
                    backgroundColor: "rgba(253, 252, 245, 0.7)",
                    p: 2,
                    height: "100%",
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b1a1c6" }}>
                    Descuento
                  </Typography>
                  <Typography sx={{ mt: 2, fontSize: 30, fontWeight: 700, color: "#4a3c58" }}>
                    ${checkoutDiscount.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box
                  sx={{
                    borderRadius: "18px",
                    border: "1px solid rgba(232, 213, 229, 0.55)",
                    backgroundColor: "rgba(253, 252, 245, 0.7)",
                    p: 2,
                    height: "100%",
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b1a1c6" }}>
                    IVA
                  </Typography>
                  <Typography sx={{ mt: 2, fontSize: 30, fontWeight: 700, color: "#4a3c58" }}>
                    ${checkoutTax.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box
                  sx={{
                    borderRadius: "18px",
                    border: "1px solid rgba(74, 60, 88, 0.12)",
                    backgroundColor: "#4a3c58",
                    p: 2,
                    color: "#fff",
                    height: "100%",
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                    Total
                  </Typography>
                  <Typography sx={{ mt: 2, fontSize: 36, fontWeight: 700 }}>
                    ${checkoutTotal.toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Stack>
  );
}
