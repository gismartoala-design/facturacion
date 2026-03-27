import { Loader2, RefreshCcw, ShoppingCart } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type IdentificationTypeOption,
  type LineItem,
  type LinePreviewItem,
  type PaymentMethodOption,
} from "@/shared/dashboard/types";
import { DocumentWorkspaceHeader } from "@/shared/document-composer/components/document-workspace-header";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export type SalesCheckoutSectionProps = {
  mode: "sale" | "quote";
  checkout: CheckoutForm;
  setCheckout: Dispatch<SetStateAction<CheckoutForm>>;
  linePreview: LinePreviewItem[];
  checkoutSubtotal: number;
  checkoutTax: number;
  checkoutTotal: number;
  selectedIdentificationType?: IdentificationTypeOption;
  selectedPaymentMethod?: PaymentMethodOption;
  canPrintPdf: boolean;
  canPrintXml: boolean;
  canPrintQuote: boolean;
  canResetCheckout: boolean;
  saving: boolean;
  savingQuote: boolean;
  editingQuoteId: string | null;
  onPrintPdf: () => void;
  onPrintXml: () => void;
  onPrintQuote?: () => void;
  onCancelEdit?: () => void;
  onOpenQuotesModal?: () => void;
  onResetCheckout: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onOpenCustomerPicker: () => void;
  onOpenProductPicker: () => void;
  incrementLineQuantity: (productId: string, delta: number) => void;
  updateLineByProduct: (productId: string, patch: Partial<LineItem>) => void;
  removeLine: (productId: string) => void;
};

export function SalesCheckoutSection({
  mode,
  checkout,
  setCheckout,
  linePreview,
  checkoutSubtotal,
  checkoutTax,
  checkoutTotal,
  selectedIdentificationType,
  selectedPaymentMethod,
  canPrintPdf,
  canPrintXml,
  canPrintQuote,
  canResetCheckout,
  saving,
  savingQuote,
  editingQuoteId,
  onPrintPdf,
  onPrintXml,
  onPrintQuote,
  onCancelEdit,
  onOpenQuotesModal,
  onResetCheckout,
  onSubmit,
  onOpenCustomerPicker,
  onOpenProductPicker,
  incrementLineQuantity,
  updateLineByProduct,
  removeLine,
}: SalesCheckoutSectionProps) {
  const hasCustomerSelected = Boolean(
    checkout.identificacion.trim() && checkout.razonSocial.trim(),
  );
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

  return (
    <div className="space-y-6">
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
      <Card className="border-[#e8d5e5]/60">
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <section className="rounded-2xl border border-[#e8d5e5]/70 bg-white/80 p-4">
              <div className="flexs gap-4 flex-row xl:items-start xl:justify-between">
                <div className="flex flex-wrap gap-2 ">
                  <Button
                    disabled={primaryBusy || linePreview.length === 0}
                    type="submit"
                    className="bg-[#4a3c58] text-white hover:bg-[#3d3249]"
                  >
                    {primaryBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {processingLabel}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        {primaryLabel}
                      </>
                    )}
                  </Button>
                  {editingQuoteId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onCancelEdit}
                      disabled={saving || savingQuote}
                    >
                      Cancelar edicion
                    </Button>
                  ) : null}
                  {!isQuoteMode && onOpenQuotesModal ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenQuotesModal}
                      disabled={saving || savingQuote}
                    >
                      Cargar cotizacion abierta
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onResetCheckout}
                    disabled={saving || savingQuote || !canResetCheckout}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Resetear
                  </Button>
                  {!isQuoteMode ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canPrintPdf}
                        onClick={onPrintPdf}
                      >
                        Imprimir / Guardar PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canPrintXml}
                        onClick={onPrintXml}
                      >
                        Descargar XML
                      </Button>
                    </>
                  ) : canPrintQuote && onPrintQuote ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onPrintQuote}
                      disabled={savingQuote}
                    >
                      Descargar PDF cotizacion
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editingQuoteId ? (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                      Editando cotizacion
                    </span>
                  ) : null}
                </div>
                {!isQuoteMode && !canPrintPdf ? (
                  <p className="text-xs text-[#4a3c58]/50">
                    La impresion se habilita cuando la venta queda registrada.
                  </p>
                ) : !isQuoteMode && canPrintPdf && !canPrintXml ? (
                  <p className="text-xs text-[#4a3c58]/50">
                    La impresion local ya esta disponible. El XML se habilita
                    cuando la factura este autorizada.
                  </p>
                ) : isQuoteMode && !canPrintQuote ? (
                  <p className="text-xs text-[#4a3c58]/50">
                    El PDF se habilita cuando la cotizacion ya fue guardada.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="grid gap-4">
              <section className="rounded-xl border border-[#e8d5e5] bg-[#fdfcf5]/50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">
                      1. Documento y cliente
                    </p>
                    <p className="text-sm text-[#4a3c58]/70">
                      Completa los datos de emision y del comprador en un solo
                      bloque.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenCustomerPicker}
                  >
                    Buscar cliente
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <TextField
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
                  <TextField
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
                  <TextField
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
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method.code} value={method.code}>
                        {method.label} ({method.code})
                      </MenuItem>
                    ))}
                  </TextField>
                </div>

                {hasCustomerSelected ? (
                  <div className="mt-4 rounded-md border-[#e8d5e5] bg-[#b1a1c6]/10 px-3 py-2 text-sm text-[#4a3c58]">
                    Cliente activo:{" "}
                    <span className="font-semibold">
                      {checkout.razonSocial}
                    </span>{" "}
                    ({checkout.identificacion})
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Aun no has seleccionado cliente.
                  </p>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <TextField
                    id="identificacion"
                    label="Identificacion"
                    value={checkout.identificacion}
                    onChange={(e) =>
                      setCheckout((prev) => ({
                        ...prev,
                        identificacion: e.target.value,
                      }))
                    }
                    required
                  />
                  <TextField
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
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <TextField
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
                  <TextField
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
                  <TextField
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
                </div>
              </section>
            </div>

            <section className="space-y-2 rounded-xl border border-[#e8d5e5]/50 bg-[#fdfcf5]/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">
                    2. Detalle
                  </p>
                  <p className="text-sm text-[#4a3c58]/70">
                    Selecciona productos y ajusta cantidades/descuentos.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenProductPicker}
                >
                  Seleccionar productos
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Codigo</Th>
                      <Th>Producto</Th>
                      <Th>Precio</Th>
                      <Th>Cantidad</Th>
                      <Th>Descuento</Th>
                      <Th>Total</Th>
                      <Th>Accion</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {linePreview.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} className="text-[#4a3c58]/60">
                          Aun no hay productos en el detalle. Usa el boton
                          Seleccionar productos.
                        </Td>
                      </Tr>
                    ) : (
                      linePreview.map((line) => (
                        <Tr
                          key={line.productId}
                          className="hover:bg-[#fdfcf5] transition-colors"
                        >
                          <Td className="font-medium">{line.product.codigo}</Td>
                          <Td>{line.product.nombre}</Td>
                          <Td className="w-28">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={line.precioUnitario}
                              onChange={(e) =>
                                updateLineByProduct(line.productId, {
                                  precioUnitario:
                                    Number(e.target.value) || 0.01,
                                })
                              }
                              className="h-8 border-[#e8d5e5]/50 bg-white/80 px-2 text-right transition-all focus:bg-white"
                              required
                            />
                          </Td>
                          <Td className="w-44">
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  incrementLineQuantity(line.productId, -1)
                                }
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={line.cantidad}
                                onChange={(e) =>
                                  updateLineByProduct(line.productId, {
                                    cantidad: Number(e.target.value) || 0.001,
                                  })
                                }
                                className="h-9 w-20 text-center"
                                required
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  incrementLineQuantity(line.productId, 1)
                                }
                              >
                                +
                              </Button>
                            </div>
                          </Td>
                          <Td className="w-28">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.descuento}
                              onChange={(e) =>
                                updateLineByProduct(line.productId, {
                                  descuento: Number(e.target.value) || 0,
                                })
                              }
                              className="h-8 border-[#e8d5e5]/50 bg-white/80 px-2 text-right transition-all focus:bg-white"
                            />
                          </Td>
                          <Td className="font-semibold">
                            ${line.total.toFixed(2)}
                          </Td>
                          <Td>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removeLine(line.productId)}
                            >
                              Quitar
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8d5e5]/70 bg-white/80 p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.6fr_0.6fr_0.75fr]">
                <div className="rounded-xl border border-[#e8d5e5]/55 bg-[#fdfcf5]/70 p-4 text-sm text-[#4a3c58]/80">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">
                      Datos de emision
                    </p>
                    <p className="mt-3">Items: {linePreview.length}</p>
                    <p>
                      Identificacion:{" "}
                      {selectedIdentificationType?.label ?? "N/A"}
                    </p>
                    <p>Pago: {selectedPaymentMethod?.label ?? "N/A"}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#e8d5e5]/55 bg-[#fdfcf5]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">
                    Subtotal
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[#4a3c58]">
                    ${checkoutSubtotal.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#e8d5e5]/55 bg-[#fdfcf5]/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b1a1c6]">
                    IVA
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-[#4a3c58]">
                    ${checkoutTax.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#4a3c58]/10 bg-[#4a3c58] px-4 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    Total
                  </p>
                  <p className="mt-3 text-3xl font-semibold">
                    ${checkoutTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
