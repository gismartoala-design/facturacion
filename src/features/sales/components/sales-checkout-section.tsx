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
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import {
  IDENTIFICATION_TYPES,
  PAYMENT_METHODS,
  type CheckoutForm,
  type IdentificationTypeOption,
  type LineItem,
  type LinePreviewItem,
  type PaymentMethodOption,
} from "@/components/mvp-dashboard-types";
import { DocumentWorkspaceHeader } from "@/features/shared/document-composer/components/document-workspace-header";

export type SalesCheckoutSectionProps = {
  checkout: CheckoutForm;
  setCheckout: Dispatch<SetStateAction<CheckoutForm>>;
  linePreview: LinePreviewItem[];
  checkoutSubtotal: number;
  checkoutTax: number;
  checkoutTotal: number;
  selectedIdentificationType?: IdentificationTypeOption;
  selectedPaymentMethod?: PaymentMethodOption;
  canPrintDocuments: boolean;
  canResetCheckout: boolean;
  saving: boolean;
  savingQuote: boolean;
  editingQuoteId: string | null;
  onPrintRide: () => void;
  onPrintXml: () => void;
  onSaveQuote: () => void;
  onCancelEdit: () => void;
  onOpenQuotesModal: () => void;
  onResetCheckout: () => void;
  onCheckout: (e: FormEvent<HTMLFormElement>) => void;
  onOpenCustomerPicker: () => void;
  onOpenProductPicker: () => void;
  incrementLineQuantity: (productId: string, delta: number) => void;
  updateLineByProduct: (productId: string, patch: Partial<LineItem>) => void;
  removeLine: (productId: string) => void;
};

export function SalesCheckoutSection({
  checkout,
  setCheckout,
  linePreview,
  checkoutSubtotal,
  checkoutTax,
  checkoutTotal,
  selectedIdentificationType,
  selectedPaymentMethod,
  canPrintDocuments,
  canResetCheckout,
  saving,
  savingQuote,
  editingQuoteId,
  onPrintRide,
  onPrintXml,
  onSaveQuote,
  onCancelEdit,
  onOpenQuotesModal,
  onResetCheckout,
  onCheckout,
  onOpenCustomerPicker,
  onOpenProductPicker,
  incrementLineQuantity,
  updateLineByProduct,
  removeLine,
}: SalesCheckoutSectionProps) {
  const hasCustomerSelected = Boolean(
    checkout.identificacion.trim() && checkout.razonSocial.trim(),
  );

  return (
    <div className="space-y-6">
      <DocumentWorkspaceHeader
        title="Facturar Venta"
        description="Registrar la venta, validar cliente y emitir factura en un solo paso."
      />
      <Card className="border-[#e8d5e5]/60">
        <CardContent>
          <form className="space-y-5" onSubmit={onCheckout}>
            <section className="rounded-2xl border border-[#e8d5e5]/70 bg-white/80 p-4">
              <div className="flexs gap-4 flex-row xl:items-start xl:justify-between">
                <div className="flex flex-wrap gap-2 ">
                  <Button
                    disabled={saving || linePreview.length === 0}
                    type="submit"
                    className="bg-[#4a3c58] text-white hover:bg-[#3d3249]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        Registrar venta
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveQuote}
                    disabled={saving || savingQuote || linePreview.length === 0}
                  >
                    {savingQuote ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {editingQuoteId
                          ? "Actualizando cotizacion..."
                          : "Guardando cotizacion..."}
                      </>
                    ) : editingQuoteId ? (
                      "Actualizar cotizacion"
                    ) : (
                      "Guardar cotizacion"
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenQuotesModal}
                    disabled={saving || savingQuote}
                  >
                    Ver cotizaciones
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onResetCheckout}
                    disabled={saving || savingQuote || !canResetCheckout}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Resetear
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canPrintDocuments}
                    onClick={onPrintRide}
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canPrintDocuments}
                    onClick={onPrintXml}
                  >
                    Descargar XML
                  </Button>
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
                {!canPrintDocuments ? (
                  <p className="text-xs text-[#4a3c58]/50">
                    Los documentos de impresion se habilitan cuando la factura
                    este autorizada.
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
                  <div>
                    <Label htmlFor="fecha">Fecha emision</Label>
                    <Input
                      id="fecha"
                      value={checkout.fechaEmision}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          fechaEmision: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipoId">Tipo identificacion</Label>
                    <select
                      id="tipoId"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      value={checkout.tipoIdentificacion}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          tipoIdentificacion: e.target.value,
                        }))
                      }
                    >
                      {IDENTIFICATION_TYPES.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.label} ({type.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="formaPago">Forma pago</Label>
                    <select
                      id="formaPago"
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      value={checkout.formaPago}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          formaPago: e.target.value,
                        }))
                      }
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.code} value={method.code}>
                          {method.label} ({method.code})
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <Label htmlFor="identificacion">Identificacion</Label>
                    <Input
                      id="identificacion"
                      value={checkout.identificacion}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          identificacion: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="razon">Razon social</Label>
                    <Input
                      id="razon"
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
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <Label htmlFor="direccion">Direccion</Label>
                    <Input
                      id="direccion"
                      value={checkout.direccion}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          direccion: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={checkout.email}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Telefono</Label>
                    <Input
                      id="telefono"
                      value={checkout.telefono}
                      onChange={(e) =>
                        setCheckout((prev) => ({
                          ...prev,
                          telefono: e.target.value,
                        }))
                      }
                    />
                  </div>
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
