"use client";

import { Button, Grid } from "@mui/material";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Ban, CreditCard, HandCoins, Loader2, X } from "lucide-react";
import { useMemo, type Dispatch, type FormEvent, type SetStateAction } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import { PAYMENT_METHODS } from "@/shared/dashboard/types";

import type {
  AccountsPayable,
  SupplierPayment,
  SupplierPaymentForm,
} from "../types";

type PayablesSectionProps = {
  payables: AccountsPayable[];
  summary: {
    openCount: number;
    pendingTotal: number;
    overdueTotal: number;
  };
  onOpenPaymentDialog: (payable: AccountsPayable) => void;
  onOpenVoidPaymentDialog: (
    payable: AccountsPayable,
    payment: SupplierPayment,
  ) => void;
};

type PaymentDialogProps = {
  payable: AccountsPayable | null;
  form: SupplierPaymentForm;
  setForm: Dispatch<SetStateAction<SupplierPaymentForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type VoidPaymentDialogProps = {
  voidingPayment: {
    payable: AccountsPayable;
    payment: SupplierPayment;
  } | null;
  reason: string;
  saving: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const PAYABLES_PAGE_SIZE = 10;

function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function statusChip(status: AccountsPayable["status"]) {
  const config = {
    OPEN: {
      label: "Pendiente",
      color: "#075985",
      bg: "#e0f2fe",
      border: "#bae6fd",
    },
    PARTIALLY_PAID: {
      label: "Abonada",
      color: "#92400e",
      bg: "#fef3c7",
      border: "#fde68a",
    },
    PAID: {
      label: "Pagada",
      color: "#047857",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    },
    OVERDUE: {
      label: "Vencida",
      color: "#991b1b",
      bg: "#fef2f2",
      border: "#fecaca",
    },
    CANCELLED: {
      label: "Cancelada",
      color: "#475569",
      bg: "#f1f5f9",
      border: "#cbd5e1",
    },
  }[status];

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        borderRadius: "999px",
        fontWeight: 800,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
      }}
    />
  );
}

export function PayablesSection({
  payables,
  summary,
  onOpenPaymentDialog,
  onOpenVoidPaymentDialog,
}: PayablesSectionProps) {
  const columns = useMemo<GridColDef<AccountsPayable>[]>(
    () => [
      {
        field: "supplierName",
        headerName: "Proveedor",
        minWidth: 250,
        flex: 1.35,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
              {params.row.supplierName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {params.row.supplierIdentification}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        minWidth: 180,
        flex: 0.9,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {params.row.documentNumber}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Compra #{params.row.purchaseNumber}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "dueAt",
        headerName: "Vence",
        minWidth: 120,
        flex: 0.65,
        valueFormatter: (value) => formatDate(value ? String(value) : null),
      },
      {
        field: "originalAmount",
        headerName: "Total",
        type: "number",
        minWidth: 120,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => currency(Number(value)),
      },
      {
        field: "paidAmount",
        headerName: "Pagado",
        type: "number",
        minWidth: 120,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => currency(Number(value)),
      },
      {
        field: "pendingAmount",
        headerName: "Saldo",
        type: "number",
        minWidth: 120,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => currency(Number(value)),
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 120,
        flex: 0.65,
        renderCell: (params) => statusChip(params.row.status),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 140,
        flex: 0.7,
        renderCell: (params) => {
          const canPay = ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(
            params.row.status,
          );

          return (
            <Button
              size="small"
              variant="outlined"
              disabled={!canPay}
              onClick={() => onOpenPaymentDialog(params.row)}
              startIcon={<HandCoins className="h-4 w-4" />}
            >
              Pagar
            </Button>
          );
        },
      },
    ],
    [onOpenPaymentDialog],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<HandCoins className="h-4.5 w-4.5" />}
          title="Cuentas por Pagar"
          description="Controla saldos pendientes con proveedores y registra pagos con secuencial propio."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid size={12}>
        <Grid container spacing={1.5}>
          {[
            ["Pendientes", summary.openCount.toString()],
            ["Saldo total", currency(summary.pendingTotal)],
            ["Vencido", currency(summary.overdueTotal)],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 12, md: 4 }}>
              <Card className="rounded-[16px]">
                <CardContent>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 900 }}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      <Grid size={12}>
        <Card className="rounded-[20px]">
          <CardContent>
            <DataGrid
              rows={payables}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[PAYABLES_PAGE_SIZE, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: PAYABLES_PAGE_SIZE,
                  },
                },
              }}
              localeText={{
                noRowsLabel: "Sin cuentas por pagar registradas.",
              }}
              sx={{
                height: 560,
                "& .MuiDataGrid-cell": {
                  fontSize: 13,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 13,
                },
              }}
            />

            <Stack spacing={1.25} sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#23313b" }}>
                Pagos recientes
              </Typography>
              {payables.flatMap((payable) =>
                payable.payments.slice(0, 3).map((payment) => ({
                  payable,
                  payment,
                })),
              ).length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  Sin pagos registrados todavía.
                </Typography>
              ) : (
                payables.flatMap((payable) =>
                  payable.payments.slice(0, 3).map((payment) => (
                    <Stack
                      key={payment.id}
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        border: "1px solid rgba(148, 163, 184, 0.28)",
                        backgroundColor:
                          payment.status === "VOIDED"
                            ? "#f8fafc"
                            : "rgba(248, 250, 252, 0.85)",
                      }}
                    >
                      <Stack spacing={0.2}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                          Pago #{payment.supplierPaymentNumber} ·{" "}
                          {currency(payment.amount)}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          {payable.supplierName} · {formatDate(payment.paidAt)} ·{" "}
                          {paymentMethodLabel(payment.paymentMethod)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={
                            payment.status === "VOIDED" ? "Anulado" : "Aplicado"
                          }
                          size="small"
                          sx={{
                            borderRadius: "999px",
                            fontWeight: 800,
                            color:
                              payment.status === "VOIDED" ? "#991b1b" : "#047857",
                            backgroundColor:
                              payment.status === "VOIDED" ? "#fef2f2" : "#ecfdf5",
                            border:
                              payment.status === "VOIDED"
                                ? "1px solid #fecaca"
                                : "1px solid #a7f3d0",
                          }}
                        />
                        <Tooltip
                          title={
                            payment.status === "VOIDED"
                              ? payment.voidReason || "Pago anulado"
                              : "Anular pago"
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={payment.status === "VOIDED"}
                              onClick={() =>
                                onOpenVoidPaymentDialog(payable, payment)
                              }
                              sx={{
                                border: "1px solid rgba(254, 202, 202, 1)",
                                borderRadius: "10px",
                              }}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  )),
                )
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function paymentMethodLabel(code: string) {
  return PAYMENT_METHODS.find((method) => method.code === code)?.label ?? code;
}

export function SupplierPaymentDialog({
  payable,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: PaymentDialogProps) {
  return (
    <Dialog
      open={payable !== null}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(35, 49, 59, 0.30)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogTitle>Registrar Pago</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            {payable
              ? `${payable.supplierName} · saldo ${currency(payable.pendingAmount)}`
              : ""}
          </Typography>

          <form id="supplier-payment-form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Monto"
                    type="number"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        amount: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                    slotProps={{
                      htmlInput: {
                        min: 0.01,
                        max: payable?.pendingAmount ?? undefined,
                        step: "0.01",
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    value={form.paidAt}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        paidAt: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>

              <TextField
                select
                label="Metodo de pago"
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value,
                  }))
                }
                required
                fullWidth
              >
                {PAYMENT_METHODS.filter((method) => method.code !== "15").map(
                  (method) => (
                    <MenuItem key={method.code} value={method.code}>
                      {method.label}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Referencia"
                value={form.externalReference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    externalReference: event.target.value,
                  }))
                }
                fullWidth
                placeholder="Transferencia, cheque o comprobante"
              />

              <TextField
                label="Notas"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </form>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          startIcon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          form="supplier-payment-form"
          variant="contained"
          disabled={saving}
          startIcon={
            saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )
          }
        >
          {saving ? "Registrando..." : "Registrar pago"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function VoidSupplierPaymentDialog({
  voidingPayment,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: VoidPaymentDialogProps) {
  const canConfirm = reason.trim().length >= 5;

  return (
    <Dialog
      open={voidingPayment !== null}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(35, 49, 59, 0.30)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogTitle>Anular Pago</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            {voidingPayment
              ? `Pago #${voidingPayment.payment.supplierPaymentNumber} · ${voidingPayment.payable.supplierName} · ${currency(voidingPayment.payment.amount)}`
              : ""}
          </Typography>

          <TextField
            label="Motivo de anulación"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            required
            multiline
            minRows={3}
            autoFocus
            fullWidth
            helperText="El saldo pendiente de la cuenta se recalculará automáticamente."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          startIcon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={saving || !canConfirm}
          startIcon={
            saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )
          }
        >
          {saving ? "Anulando..." : "Anular pago"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
