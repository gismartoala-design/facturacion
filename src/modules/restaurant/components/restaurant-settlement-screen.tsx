"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowLeft, CreditCard, Plus, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import { useRestaurantNotifier } from "@/shared/notifications/notifier-presets";
import { PAYMENT_METHODS } from "@/shared/dashboard/types";
import type {
  RestaurantBootstrap,
  RestaurantOrderDetail,
} from "@/modules/restaurant/components/restaurant-operations-types";
import {
  formatCurrency,
  statusColor,
  statusLabel,
} from "@/modules/restaurant/components/restaurant-operations-utils";

type RestaurantSettlementScreenProps = {
  initialBootstrap: RestaurantBootstrap | null;
  initialBootstrapError?: string | null;
  orderId: string;
};

type SettlementSelectionDraft = {
  selected: boolean;
  quantity: string;
};

type SettlementPaymentDraft = {
  formaPago: string;
  total: string;
  plazo: string;
  unidadTiempo: string;
};

type SettlementResponse = {
  saleId: string;
  saleNumber: string;
  saleStatus: string;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  document: {
    id?: string;
    type: "NONE" | "INVOICE";
    status: string;
    fullNumber?: string | null;
  } | null;
  receivable:
    | {
        id: string;
        pendingAmount: number;
        dueAt: string | null;
        status: string;
      }
    | null;
  order: RestaurantOrderDetail | null;
};

function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) {
    return "";
  }

  const [integerPartRaw = "", ...fractionParts] = normalized.split(".");
  const integerPart = integerPartRaw || "0";
  const fractionPart = fractionParts.join("").slice(0, 2);

  return fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? roundMoney(parsed) : 0;
}

export function RestaurantSettlementScreen({
  initialBootstrap,
  initialBootstrapError = null,
  orderId,
}: RestaurantSettlementScreenProps) {
  const { apiError, error, info, success } = useRestaurantNotifier();
  const [order, setOrder] = useState<RestaurantOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bootError, setBootError] = useState<string | null>(initialBootstrapError);
  const [documentType, setDocumentType] = useState<"NONE" | "INVOICE">("NONE");
  const [notes, setNotes] = useState("");
  const [payments, setPayments] = useState<SettlementPaymentDraft[]>([
    {
      formaPago: "01",
      total: "0.00",
      plazo: "0",
      unidadTiempo: "DIAS",
    },
  ]);
  const [selectionState, setSelectionState] = useState<
    Record<string, SettlementSelectionDraft>
  >({});

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<RestaurantOrderDetail>(
        `/api/v1/restaurant/orders/${orderId}`,
      );
      setOrder(data);
      setSelectionState(
        Object.fromEntries(
          data.items
            .filter((item) => item.remainingQuantity > 0)
            .map((item) => [
              item.id,
              {
                selected: true,
                quantity: String(item.remainingQuantity),
              },
            ]),
        ),
      );
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "No se pudo cargar la orden para liquidar";
      setBootError(nextMessage);
      apiError(error, "No se pudo cargar la orden para liquidar");
    } finally {
      setLoading(false);
    }
  }, [apiError, orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const selectableItems = useMemo(
    () => order?.items.filter((item) => item.remainingQuantity > 0) ?? [],
    [order],
  );

  const settlementItems = useMemo(() => {
    return selectableItems.flatMap((item) => {
      const draft = selectionState[item.id];
      if (!draft?.selected) return [];

      const quantity = Number(draft.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return [];

      const maxQuantity = item.remainingQuantity;
      const normalizedQuantity = Math.min(quantity, maxQuantity);
      const divisor = maxQuantity || 1;

      return [
        {
          orderItemId: item.id,
          productName: item.productName,
          quantity: normalizedQuantity,
          subtotal: roundMoney((item.openTotals.subtotal / divisor) * normalizedQuantity),
          taxTotal: roundMoney((item.openTotals.taxTotal / divisor) * normalizedQuantity),
          total: roundMoney((item.openTotals.total / divisor) * normalizedQuantity),
        },
      ];
    });
  }, [selectableItems, selectionState]);

  const selectionTotals = useMemo(() => {
    return settlementItems.reduce(
      (acc, item) => ({
        subtotal: roundMoney(acc.subtotal + item.subtotal),
        taxTotal: roundMoney(acc.taxTotal + item.taxTotal),
        total: roundMoney(acc.total + item.total),
      }),
      { subtotal: 0, taxTotal: 0, total: 0 },
    );
  }, [settlementItems]);

  const paymentTotal = useMemo(
    () => roundMoney(payments.reduce((acc, payment) => acc + parsePositiveNumber(payment.total), 0)),
    [payments],
  );

  useEffect(() => {
    if (payments.length !== 1) {
      return;
    }

    setPayments((current) =>
      current.map((payment, index) =>
        index === 0
          ? {
              ...payment,
              total: selectionTotals.total > 0 ? selectionTotals.total.toFixed(2) : "0.00",
            }
          : payment,
      ),
    );
  }, [payments.length, selectionTotals.total]);

  async function handleSubmit() {
    if (!order) {
      return;
    }

    if (settlementItems.length === 0) {
      info("Selecciona al menos un item para liquidar");
      return;
    }

    if (roundMoney(paymentTotal) !== roundMoney(selectionTotals.total)) {
      error("La suma de pagos debe ser igual al total seleccionado");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        documentType,
        notes,
        items: settlementItems.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
        payments: payments
          .map((payment) => ({
            formaPago: payment.formaPago,
            total: parsePositiveNumber(payment.total),
            plazo: Number(payment.plazo) || 0,
            unidadTiempo: payment.unidadTiempo || "DIAS",
          }))
          .filter((payment) => payment.total > 0),
      };

      const result = await fetchJson<SettlementResponse>(
        `/api/v1/restaurant/orders/${orderId}/settlements`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      success(`Liquidación registrada en venta ${result.saleNumber}`);

      if (result.order) {
        setOrder(result.order);
        setSelectionState(
          Object.fromEntries(
            result.order.items
              .filter((item) => item.remainingQuantity > 0)
              .map((item) => [
                item.id,
                {
                  selected: true,
                  quantity: String(item.remainingQuantity),
                },
              ]),
          ),
        );
      }

      if (result.order?.table?.id) {
        setTimeout(() => {
          window.location.href = `/restaurant/tables/${result.order?.table?.id}`;
        }, 900);
      }
    } catch (error) {
      apiError(error, "No se pudo liquidar la orden");
    } finally {
      setSubmitting(false);
    }
  }

  if (bootError && !initialBootstrap) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          px: 3,
        }}
      >
        <Alert severity="error" variant="outlined">
          {bootError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        backgroundColor: "#f4efe7",
      }}
    >
      <Stack spacing={2.25}>
        <Paper
          sx={{
            px: 2,
            py: 1.75,
            borderRadius: "22px",
            backgroundColor: "#fbf7f1",
            border: "1px solid",
            borderColor: "rgba(205, 191, 173, 0.72)",
          }}
        >
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Stack spacing={0.7}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Receipt size={20} />
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#8a654a",
                  }}
                >
                  Liquidación
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", color: "#2d241e" }}>
                {initialBootstrap?.business.name ?? "Restaurante"}
              </Typography>
              <Typography sx={{ color: "#6c5a4f", maxWidth: 760, fontSize: 13.5 }}>
                Cierra total o parcialmente la orden. Cada liquidación genera su
                propia `Sale` y documento si corresponde.
              </Typography>
            </Stack>

            <Button
              component={Link}
              href={order?.table?.id ? `/restaurant/tables/${order.table.id}` : "/restaurant/floor"}
              variant="outlined"
              startIcon={<ArrowLeft size={16} />}
              sx={{
                color: "#6c4f3e",
                borderColor: "rgba(205, 191, 173, 0.72)",
                "&:hover": {
                  borderColor: "rgba(205, 191, 173, 0.88)",
                  backgroundColor: "#fffdf9",
                },
              }}
            >
              Volver a operación
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 4, borderRadius: "24px" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={700}>Cargando orden para liquidar...</Typography>
            </Stack>
          </Paper>
        ) : order ? (
          <Stack spacing={2.25}>
            <Paper sx={{ p: 2, borderRadius: "24px" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} flexWrap="wrap">
                <Chip label={`Orden ${statusLabel(order.status)}`} color={statusColor(order.status)} />
                {order.table ? <Chip label={`Mesa ${order.table.name}`} /> : null}
                <Chip label={`Canal ${order.channel}`} />
                <Chip label={`Pendiente ${formatCurrency(order.totals.openTotal)}`} />
              </Stack>
            </Paper>

            <Stack direction={{ xs: "column", xl: "row" }} spacing={2.25} alignItems="stretch">
              <Paper sx={{ p: 2, borderRadius: "24px", flex: 1.2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>
                    Ítems a liquidar
                  </Typography>
                  <Typography color="text.secondary" fontSize={13}>
                    Puedes cerrar toda la orden o solo una parte para dividir cuenta.
                  </Typography>
                  <Divider />

                  <Stack spacing={1}>
                    {selectableItems.length === 0 ? (
                      <Typography color="text.secondary">
                        No quedan ítems pendientes por liquidar.
                      </Typography>
                    ) : (
                      selectableItems.map((item) => {
                        const draft = selectionState[item.id] ?? {
                          selected: false,
                          quantity: "",
                        };

                        return (
                          <Paper
                            key={item.id}
                            variant="outlined"
                            sx={{ p: 1.25, borderRadius: "18px" }}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox
                                  checked={draft.selected}
                                  onChange={(event) =>
                                    setSelectionState((current) => ({
                                      ...current,
                                      [item.id]: {
                                        selected: event.target.checked,
                                        quantity:
                                          current[item.id]?.quantity ??
                                          String(item.remainingQuantity),
                                      },
                                    }))
                                  }
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography fontWeight={800}>{item.productName}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Disponible para liquidar: {item.remainingQuantity} · total abierto {formatCurrency(item.openTotals.total)}
                                  </Typography>
                                </Box>
                                <TextField
                                  label="Cantidad"
                                  size="small"
                                  type="number"
                                  value={draft.quantity}
                                  disabled={!draft.selected}
                                  onChange={(event) =>
                                    setSelectionState((current) => ({
                                      ...current,
                                      [item.id]: {
                                        selected: current[item.id]?.selected ?? true,
                                        quantity: event.target.value,
                                      },
                                    }))
                                  }
                                  inputProps={{
                                    min: 0,
                                    max: item.remainingQuantity,
                                    step: 1,
                                  }}
                                  sx={{ width: 120 }}
                                />
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })
                    )}
                  </Stack>
                </Stack>
              </Paper>

              <Paper sx={{ p: 2, borderRadius: "24px", flex: 0.9 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>
                    Cierre financiero
                  </Typography>

                  <TextField
                    select
                    label="Documento"
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(event.target.value as "NONE" | "INVOICE")
                    }
                  >
                    <MenuItem value="NONE">Sin documento</MenuItem>
                    <MenuItem value="INVOICE">Factura</MenuItem>
                  </TextField>

                  <TextField
                    label="Notas de liquidación"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    multiline
                    minRows={2}
                  />

                  <Divider />

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Subtotal</Typography>
                      <Typography>{formatCurrency(selectionTotals.subtotal)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">IVA</Typography>
                      <Typography>{formatCurrency(selectionTotals.taxTotal)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={800}>Total a liquidar</Typography>
                      <Typography fontWeight={900}>
                        {formatCurrency(selectionTotals.total)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={800}>
                        Pagos
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Plus size={14} />}
                        onClick={() =>
                          setPayments((current) => [
                            ...current,
                            {
                              formaPago: "01",
                              total: "0.00",
                              plazo: "0",
                              unidadTiempo: "DIAS",
                            },
                          ])
                        }
                      >
                        Agregar pago
                      </Button>
                    </Stack>

                    {payments.map((payment, index) => (
                      <Paper key={`${payment.formaPago}-${index}`} variant="outlined" sx={{ p: 1.25, borderRadius: "18px" }}>
                        <Stack spacing={1}>
                          <TextField
                            select
                            label="Forma de pago"
                            size="small"
                            value={payment.formaPago}
                            onChange={(event) =>
                              setPayments((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? { ...entry, formaPago: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <MenuItem key={method.code} value={method.code}>
                                {method.label}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            label="Monto"
                            size="small"
                            value={payment.total}
                            onChange={(event) =>
                              setPayments((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? { ...entry, total: sanitizeDecimalInput(event.target.value) }
                                    : entry,
                                ),
                              )
                            }
                          />

                          {payment.formaPago === "15" ? (
                            <Stack direction="row" spacing={1}>
                              <TextField
                                label="Plazo"
                                size="small"
                                value={payment.plazo}
                                onChange={(event) =>
                                  setPayments((current) =>
                                    current.map((entry, currentIndex) =>
                                      currentIndex === index
                                        ? { ...entry, plazo: event.target.value.replace(/[^\d]/g, "") }
                                        : entry,
                                    ),
                                  )
                                }
                              />
                              <TextField
                                select
                                label="Unidad"
                                size="small"
                                value={payment.unidadTiempo}
                                onChange={(event) =>
                                  setPayments((current) =>
                                    current.map((entry, currentIndex) =>
                                      currentIndex === index
                                        ? { ...entry, unidadTiempo: event.target.value }
                                        : entry,
                                    ),
                                  )
                                }
                              >
                                <MenuItem value="DIAS">Días</MenuItem>
                                <MenuItem value="MESES">Meses</MenuItem>
                                <MenuItem value="ANIOS">Años</MenuItem>
                              </TextField>
                            </Stack>
                          ) : null}

                          {payments.length > 1 ? (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Trash2 size={14} />}
                              onClick={() =>
                                setPayments((current) =>
                                  current.filter((_, currentIndex) => currentIndex !== index),
                                )
                              }
                            >
                              Quitar
                            </Button>
                          ) : null}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Paper
                    sx={{
                      p: 1.35,
                      borderRadius: "18px",
                      bgcolor:
                        roundMoney(paymentTotal) === roundMoney(selectionTotals.total)
                          ? alpha("#e7f4ea", 0.9)
                          : alpha("#fff4e5", 0.92),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack spacing={0.2}>
                        <Typography fontWeight={800}>Pagos registrados</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deben cuadrar exactamente con el total seleccionado.
                        </Typography>
                      </Stack>
                      <Typography fontWeight={900}>
                        {formatCurrency(paymentTotal)}
                      </Typography>
                    </Stack>
                  </Paper>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CreditCard size={16} />}
                    disabled={submitting || settlementItems.length === 0}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? "Liquidando..." : "Confirmar liquidación"}
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
