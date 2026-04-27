"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Slide from "@mui/material/Slide";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { TransitionProps } from "@mui/material/transitions";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  AlertCircle,
  Ban,
  Banknote,
  CreditCard,
  HandCoins,
  Loader2,
  Wallet,
  X,
} from "lucide-react";
import {
  forwardRef,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import { PAYMENT_METHODS } from "@/shared/dashboard/types";

import type { AccountsPayable, SupplierPayment, SupplierPaymentForm } from "../types";

type PayablesSectionProps = {
  payables: AccountsPayable[];
  onOpenPaymentDialog: (payable: AccountsPayable) => void;
  onOpenVoidPaymentDialog: (payable: AccountsPayable, payment: SupplierPayment) => void;
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

const PAPER_SX = {
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  backgroundColor: "#fff",
  p: 2.5,
} as const;

const SECTION_LABEL_SX = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const PAYABLES_PAGE_SIZE = 10;

type StatusFilter = "active" | "all" | "overdue" | "paid";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "overdue", label: "Vencidas" },
  { value: "paid", label: "Pagadas" },
  { value: "all", label: "Todas" },
];

function currency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function paymentMethodLabel(code: string) {
  return PAYMENT_METHODS.find((m) => m.code === code)?.label ?? code;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastMonthRange(): [string, string] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

function firstDayOfCurrentYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function daysLabel(dueAt: string | null): { text: string; color: string } {
  if (!dueAt) return { text: "Sin fecha", color: "#94a3b8" };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 1) return { text: `${diff}d`, color: diff <= 7 ? "#d97706" : "#64748b" };
  if (diff === 1) return { text: "Mañana", color: "#d97706" };
  if (diff === 0) return { text: "Hoy", color: "#d97706" };
  return { text: `+${Math.abs(diff)}d vencida`, color: "#ef4444" };
}

function statusChip(status: AccountsPayable["status"]) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    OPEN: { label: "Pendiente", color: "#075985", bg: "#e0f2fe", border: "#bae6fd" },
    PARTIALLY_PAID: { label: "Abonada", color: "#92400e", bg: "#fef3c7", border: "#fde68a" },
    PAID: { label: "Pagada", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
    OVERDUE: { label: "Vencida", color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
    CANCELLED: { label: "Cancelada", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
  };
  const c = config[status] ?? config.CANCELLED;
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{
        borderRadius: "999px",
        fontWeight: 800,
        color: c.color,
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
      }}
    />
  );
}

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  iconColor?: string;
};

function KpiCard({ icon, label, value, sub, iconColor = "#64748b" }: KpiCardProps) {
  return (
    <Paper elevation={0} sx={PAPER_SX}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ color: iconColor, width: 20, height: 20 }}
          >
            {icon}
          </Stack>
          <Typography sx={SECTION_LABEL_SX}>{label}</Typography>
        </Stack>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{sub}</Typography>
      </Stack>
    </Paper>
  );
}

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement<unknown> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function PayablesSection({
  payables,
  onOpenPaymentDialog,
  onOpenVoidPaymentDialog,
}: PayablesSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(firstDayOfCurrentMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  const kpis = useMemo(() => {
    const active = payables.filter((p) =>
      ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(p.status),
    );
    const overdue = payables.filter((p) => p.status === "OVERDUE");
    return {
      pendingTotal: active.reduce((sum, p) => sum + p.pendingAmount, 0),
      overdueTotal: overdue.reduce((sum, p) => sum + p.pendingAmount, 0),
      activeCount: active.length,
      overdueCount: overdue.length,
      paidTotal: payables.reduce((sum, p) => sum + p.paidAmount, 0),
    };
  }, [payables]);

  const filteredPayables = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const from = dateFrom || "0000-01-01";
    const to = dateTo || "9999-12-31";

    return payables.filter((p) => {
      const date = p.issuedAt.slice(0, 10);
      if (date < from || date > to) return false;

      if (statusFilter === "active" && !["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(p.status))
        return false;
      if (statusFilter === "overdue" && p.status !== "OVERDUE") return false;
      if (statusFilter === "paid" && p.status !== "PAID") return false;
      if (statusFilter === "all" && p.status === "CANCELLED") return false;

      if (q) {
        return (
          p.supplierName.toLowerCase().includes(q) ||
          p.supplierIdentification.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payables, statusFilter, supplierSearch, dateFrom, dateTo]);

  const columns = useMemo<GridColDef<AccountsPayable>[]>(
    () => [
      {
        field: "supplierName",
        headerName: "Proveedor",
        minWidth: 220,
        flex: 1.2,
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
        minWidth: 170,
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
        minWidth: 130,
        flex: 0.7,
        renderCell: (params) => {
          const { text, color } = daysLabel(params.row.dueAt);
          return (
            <Stack spacing={0.15}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>{text}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {formatDate(params.row.dueAt)}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "originalAmount",
        headerName: "Total",
        type: "number",
        minWidth: 115,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => currency(Number(value)),
      },
      {
        field: "paidAmount",
        headerName: "Pagado",
        type: "number",
        minWidth: 115,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => currency(Number(value)),
      },
      {
        field: "pendingAmount",
        headerName: "Saldo",
        type: "number",
        minWidth: 115,
        flex: 0.65,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
              color: params.row.status === "OVERDUE" ? "#ef4444" : "#0f172a",
            }}
          >
            {currency(params.row.pendingAmount)}
          </Typography>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 115,
        flex: 0.65,
        renderCell: (params) => statusChip(params.row.status),
      },
      {
        field: "actions",
        headerName: "Accion",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 110,
        flex: 0.6,
        renderCell: (params) => {
          const canPay = ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(params.row.status);
          return (
            <Button
              size="small"
              variant="outlined"
              disabled={!canPay}
              onClick={() => onOpenPaymentDialog(params.row)}
              startIcon={<HandCoins className="h-4 w-4" />}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
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
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<HandCoins className="h-4.5 w-4.5" />}
          title="Cuentas por pagar"
          description="Controla saldos pendientes con proveedores, identifica vencimientos y registra pagos con secuencial propio."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      {/* Filtros */}
      <Grid size={12}>
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Typography sx={SECTION_LABEL_SX}>Filtros</Typography>
            <Grid container spacing={1.5} alignItems="center">
              {/* Rango de fechas */}
              <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                <TextField
                  label="Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                <TextField
                  label="Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: "grow" }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {[
                    { label: "Este mes", action: () => { setDateFrom(firstDayOfCurrentMonth()); setDateTo(todayStr()); } },
                    { label: "Mes anterior", action: () => { const [f, t] = lastMonthRange(); setDateFrom(f); setDateTo(t); } },
                    { label: "Este año", action: () => { setDateFrom(firstDayOfCurrentYear()); setDateTo(todayStr()); } },
                    { label: "Todo", action: () => { setDateFrom(""); setDateTo(""); } },
                  ].map((p) => (
                    <Button
                      key={p.label}
                      size="small"
                      variant="outlined"
                      onClick={p.action}
                      sx={{ borderRadius: "999px", fontWeight: 700 }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </Stack>
              </Grid>
            </Grid>

            <Divider />

            {/* Estado y proveedor */}
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 12, sm: 5, md: 4 }}>
                <TextField
                  label="Buscar proveedor"
                  placeholder="Nombre o identificacion"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 7, md: "grow" }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {STATUS_FILTERS.map((f) => (
                    <Chip
                      key={f.value}
                      label={f.label}
                      onClick={() => setStatusFilter(f.value)}
                      color={statusFilter === f.value ? "primary" : "default"}
                      variant={statusFilter === f.value ? "filled" : "outlined"}
                      sx={{ borderRadius: "999px", fontWeight: 700, cursor: "pointer" }}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Grid>

      {/* Tabla */}
      <Grid size={12}>
        <Card className="rounded-[20px]">
          <CardContent>
            <DataGrid
              rows={filteredPayables}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[PAYABLES_PAGE_SIZE, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: PAYABLES_PAGE_SIZE },
                },
              }}
              localeText={{ noRowsLabel: "Sin cuentas en este estado." }}
              sx={{
                height: 480,
                "& .MuiDataGrid-cell": { fontSize: 13 },
                "& .MuiDataGrid-columnHeaderTitle": { fontSize: 13 },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<Wallet size={16} />}
          label="Por pagar"
          value={currency(kpis.pendingTotal)}
          sub={`${kpis.activeCount} cuenta${kpis.activeCount !== 1 ? "s" : ""} con saldo pendiente`}
          iconColor="#0ea5e9"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<AlertCircle size={16} />}
          label="Vencido"
          value={currency(kpis.overdueTotal)}
          sub={
            kpis.overdueCount === 0
              ? "Sin cuentas vencidas"
              : `${kpis.overdueCount} cuenta${kpis.overdueCount !== 1 ? "s" : ""} requieren atención`
          }
          iconColor={kpis.overdueCount > 0 ? "#ef4444" : "#94a3b8"}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<Banknote size={16} />}
          label="Pagado total"
          value={currency(kpis.paidTotal)}
          sub="Suma de todos los pagos aplicados"
          iconColor="#10b981"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<HandCoins size={16} />}
          label="Cuentas activas"
          value={String(kpis.activeCount)}
          sub={`${kpis.overdueCount} vencida${kpis.overdueCount !== 1 ? "s" : ""} de ${kpis.activeCount} activas`}
          iconColor="#8b5cf6"
        />
      </Grid>
    </Grid>
  );
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
      fullScreen
      open={payable !== null}
      onClose={saving ? undefined : onClose}
      TransitionComponent={SlideUp}
    >
      {/* Header fijo */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          py: 1.75,
          borderBottom: "1px solid rgba(226, 232, 240, 0.95)",
          backgroundColor: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={onClose} disabled={saving} size="small">
            <X size={20} />
          </IconButton>
          <Stack spacing={0.1}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
              Registrar pago
            </Typography>
            {payable ? (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {payable.supplierName} · saldo {currency(payable.pendingAmount)}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        <Button
          type="submit"
          form="supplier-payment-form"
          variant="contained"
          disabled={saving}
          startIcon={
            saving ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />
          }
          sx={{ borderRadius: "999px", fontWeight: 700 }}
        >
          {saving ? "Registrando..." : "Registrar pago"}
        </Button>
      </Box>

      {/* Contenido centrado */}
      <Box
        sx={{
          maxWidth: 760,
          mx: "auto",
          width: "100%",
          px: { xs: 2, sm: 3 },
          py: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <form id="supplier-payment-form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            {/* Cuenta a pagar */}
            {payable ? (
              <Paper elevation={0} sx={PAPER_SX}>
                <Stack spacing={1.5}>
                  <Typography sx={SECTION_LABEL_SX}>Cuenta a pagar</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                          Proveedor
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {payable.supplierName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          {payable.supplierIdentification}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                          Documento
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {payable.documentNumber}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                          Compra #{payable.purchaseNumber}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider />

                  <Grid container spacing={2}>
                    {[
                      ["Total", payable.originalAmount],
                      ["Pagado", payable.paidAmount],
                      ["Saldo pendiente", payable.pendingAmount],
                    ].map(([label, value]) => (
                      <Grid key={String(label)} size={{ xs: 4 }}>
                        <Stack spacing={0.25}>
                          <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                            {label}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: label === "Saldo pendiente" ? 18 : 14,
                              fontWeight: label === "Saldo pendiente" ? 900 : 700,
                              color:
                                label === "Saldo pendiente" ? "#0f172a" : "text.secondary",
                            }}
                          >
                            {currency(Number(value))}
                          </Typography>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            ) : null}

            {/* Monto y fecha */}
            <Paper elevation={0} sx={PAPER_SX}>
              <Stack spacing={2}>
                <Typography sx={SECTION_LABEL_SX}>Monto y fecha</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Monto a pagar"
                      type="number"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, amount: e.target.value }))
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
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, paidAt: e.target.value }))
                      }
                      required
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>

            {/* Forma de pago */}
            <Paper elevation={0} sx={PAPER_SX}>
              <Stack spacing={2}>
                <Typography sx={SECTION_LABEL_SX}>Forma de pago</Typography>
                <TextField
                  select
                  label="Metodo de pago"
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                  }
                  required
                  fullWidth
                >
                  {PAYMENT_METHODS.filter((m) => m.code !== "15").map((m) => (
                    <MenuItem key={m.code} value={m.code}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Referencia"
                  value={form.externalReference}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, externalReference: e.target.value }))
                  }
                  fullWidth
                  placeholder="Numero de transferencia, cheque o comprobante"
                />
              </Stack>
            </Paper>

            {/* Notas */}
            <Paper elevation={0} sx={PAPER_SX}>
              <Stack spacing={2}>
                <Typography sx={SECTION_LABEL_SX}>Notas</Typography>
                <TextField
                  label="Observaciones"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  multiline
                  minRows={3}
                  fullWidth
                  placeholder="Observaciones adicionales del pago"
                />
              </Stack>
            </Paper>
          </Stack>
        </form>
      </Box>
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
