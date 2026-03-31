"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { alpha } from "@mui/material/styles";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  PauseCircle,
  PlayCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { CashRuntime } from "@/modules/cash-management/policies/cash-runtime";
import { fetchJson } from "@/shared/dashboard/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type CashMovementType =
  | "OPENING_FLOAT"
  | "MANUAL_IN"
  | "WITHDRAWAL"
  | "REFUND_OUT"
  | "CLOSING_ADJUSTMENT";

type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  description: string | null;
  saleId: string | null;
  createdAt: string;
};

type CashSessionInfo = {
  id: string;
  status?: "OPEN" | "CLOSED" | "PENDING_APPROVAL";
  openingAmount: number;
  openedAt: string;
  closingAmount?: number | null;
  closedAt?: string | null;
  notes?: string | null;
  // Legacy
  salesCount?: number;
  salesTotal?: number;
  // New
  declaredClosing?: number | null;
  salesCashTotal?: number;
  movementsTotal?: number;
  expectedClosing?: number | null;
  difference?: number | null;
};

type PosCashSessionDialogProps = {
  open: boolean;
  submitting: boolean;
  cashSession: CashSessionInfo | null;
  cashRuntime?: CashRuntime;
  openingAmount: string;
  openingNotes: string;
  closingAmount: string;
  closingNotes: string;
  onOpeningAmountChange: (value: string) => void;
  onOpeningNotesChange: (value: string) => void;
  onClosingAmountChange: (value: string) => void;
  onClosingNotesChange: (value: string) => void;
  onOpenCash: () => void;
  onCloseCash: () => void;
  onReprintClosedSession: (session: CashSessionInfo) => void;
  onClose: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateYmd(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

const MOVEMENT_LABELS: Record<CashMovementType, string> = {
  OPENING_FLOAT: "Fondo inicial",
  MANUAL_IN: "Aporte",
  WITHDRAWAL: "Retiro",
  REFUND_OUT: "Devolucion",
  CLOSING_ADJUSTMENT: "Ajuste cierre",
};

const MOVEMENT_SIGN: Record<CashMovementType, 1 | -1> = {
  OPENING_FLOAT: 1,
  MANUAL_IN: 1,
  WITHDRAWAL: -1,
  REFUND_OUT: -1,
  CLOSING_ADJUSTMENT: -1,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SessionSummary({ cashSession, cashRuntime }: {
  cashSession: CashSessionInfo;
  cashRuntime?: CashRuntime;
}) {
  const salesDisplay = cashSession.salesCashTotal ?? cashSession.salesTotal;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "16px",
        p: 2.5,
        backgroundColor: "#fbf7f1",
        border: "1px solid rgba(205, 191, 173, 0.7)",
      }}
    >
      <Stack spacing={1}>
        <Typography
          variant="subtitle2"
          sx={{ color: "#6e5642", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 11 }}
        >
          Resumen de caja
        </Typography>
        <Divider sx={{ borderColor: "rgba(205, 191, 173, 0.5)" }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">Apertura</Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatCurrency(cashSession.openingAmount)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">Abierta desde</Typography>
          <Typography variant="body2" fontWeight={600}>
            {formatDateTime(cashSession.openedAt)}
          </Typography>
        </Stack>
        {salesDisplay !== undefined && (
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
              Ventas en efectivo
            </Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">
              {formatCurrency(salesDisplay)}
            </Typography>
          </Stack>
        )}
        {cashSession.salesCount !== undefined && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Ventas registradas</Typography>
            <Typography variant="body2" fontWeight={600}>
              {cashSession.salesCount}
            </Typography>
          </Stack>
        )}
        {cashSession.movementsTotal !== undefined && cashSession.movementsTotal !== 0 && (
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Movimientos netos</Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={cashSession.movementsTotal >= 0 ? "success.main" : "error.main"}
            >
              {cashSession.movementsTotal >= 0 ? "+" : ""}
              {formatCurrency(cashSession.movementsTotal)}
            </Typography>
          </Stack>
        )}
        {cashSession.expectedClosing != null && (
          <>
            <Divider sx={{ borderColor: "rgba(205, 191, 173, 0.5)" }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Esperado en caja</Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {formatCurrency(cashSession.expectedClosing)}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}

function CloseForm({
  cashRuntime,
  cashSession,
  closingAmount,
  closingNotes,
  onClosingAmountChange,
  onClosingNotesChange,
}: {
  cashRuntime?: CashRuntime;
  cashSession: CashSessionInfo | null;
  closingAmount: string;
  closingNotes: string;
  onClosingAmountChange: (value: string) => void;
  onClosingNotesChange: (value: string) => void;
}) {
  const showDeclared = cashRuntime?.capabilities.declaredClosing;
  const declared = parseFloat(closingAmount || "0");
  const expected = cashSession?.expectedClosing ?? null;
  const difference = expected != null ? declared - expected : null;

  return (
    <Stack spacing={2}>
      <TextField
        label={showDeclared ? "Monto contado (declarado)" : "Valor de cierre"}
        type="text"
        value={closingAmount}
        onChange={(e) => onClosingAmountChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        slotProps={{
          htmlInput: {
            inputMode: "decimal",
            enterKeyHint: "done",
            style: { textAlign: "right" },
          },
        }}
      />

      {showDeclared && expected != null && closingAmount && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "12px",
            border: "1px solid",
            borderColor: difference === 0
              ? "success.light"
              : (difference ?? 0) > 0
              ? "warning.light"
              : "error.light",
            backgroundColor: difference === 0
              ? alpha("#2e7d32", 0.05)
              : (difference ?? 0) > 0
              ? alpha("#ed6c02", 0.05)
              : alpha("#d32f2f", 0.05),
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Esperado</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(expected)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Declarado</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatCurrency(declared)}
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600}>Diferencia</Typography>
              <Chip
                size="small"
                icon={
                  difference === 0
                    ? undefined
                    : (difference ?? 0) > 0
                    ? <TrendingUp className="h-3.5 w-3.5" />
                    : <TrendingDown className="h-3.5 w-3.5" />
                }
                label={`${(difference ?? 0) >= 0 ? "+" : ""}${formatCurrency(difference ?? 0)}`}
                color={difference === 0 ? "success" : (difference ?? 0) > 0 ? "warning" : "error"}
              />
            </Stack>
          </Stack>
        </Paper>
      )}

      <TextField
        label="Notas de cierre"
        value={closingNotes}
        onChange={(e) => onClosingNotesChange(e.target.value)}
        placeholder="Diferencias, novedades, observaciones..."
        multiline
        rows={2}
      />
    </Stack>
  );
}

function MovementsTab({ sessionId }: { sessionId: string }) {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"WITHDRAWAL" | "MANUAL_IN">("WITHDRAWAL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<CashMovement[]>(
        `/api/v1/cash-management/sessions/${sessionId}/movements`,
      );
      setMovements(data);
    } catch {
      setError("No se pudieron cargar los movimientos");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  async function handleRegister() {
    const parsedAmount = parseFloat(amount.replace(",", ".") || "0");
    if (!parsedAmount || parsedAmount <= 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(
        `/api/v1/cash-management/sessions/${sessionId}/movements`,
        {
          method: "POST",
          body: JSON.stringify({ type, amount: parsedAmount, description: description || undefined }),
        },
      );
      setAmount("");
      setDescription("");
      await loadMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el movimiento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      {/* Formulario nuevo movimiento */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "14px",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            Registrar movimiento
          </Typography>
          <TextField
            select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            size="small"
          >
            <MenuItem value="WITHDRAWAL">Retiro de caja</MenuItem>
            <MenuItem value="MANUAL_IN">Aporte / depósito</MenuItem>
          </TextField>
          <TextField
            label="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            size="small"
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
                style: { textAlign: "right" },
              },
            }}
          />
          <TextField
            label="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            placeholder="Motivo, referencia..."
          />
          <Button
            variant="contained"
            size="small"
            disabled={submitting || !amount || parseFloat(amount || "0") <= 0}
            onClick={() => void handleRegister()}
            startIcon={
              submitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : type === "WITHDRAWAL"
                ? <ArrowUpCircle className="h-3.5 w-3.5" />
                : <ArrowDownCircle className="h-3.5 w-3.5" />
            }
            color={type === "WITHDRAWAL" ? "secondary" : "primary"}
          >
            {type === "WITHDRAWAL" ? "Registrar retiro" : "Registrar aporte"}
          </Button>
        </Stack>
      </Paper>

      {/* Lista de movimientos */}
      {error && (
        <Typography variant="body2" color="error">{error}</Typography>
      )}
      {loading ? (
        <Stack alignItems="center" py={2}>
          <CircularProgress size={24} />
        </Stack>
      ) : movements.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={1}>
          Sin movimientos registrados
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {movements.map((m) => {
            const sign = MOVEMENT_SIGN[m.type];
            return (
              <Stack
                key={m.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: "10px",
                  backgroundColor: sign > 0
                    ? alpha("#2e7d32", 0.05)
                    : alpha("#d32f2f", 0.05),
                }}
              >
                <Stack>
                  <Typography variant="body2" fontWeight={600}>
                    {MOVEMENT_LABELS[m.type]}
                  </Typography>
                  {m.description && (
                    <Typography variant="caption" color="text.secondary">
                      {m.description}
                    </Typography>
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={sign > 0 ? "success.main" : "error.main"}
                >
                  {sign > 0 ? "+" : "-"}{formatCurrency(m.amount)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

function HistoryTab({
  open,
  onReprint,
}: {
  open: boolean;
  onReprint: (session: CashSessionInfo) => void;
}) {
  const [rows, setRows] = useState<CashSessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<CashSessionInfo[]>("/api/v1/pos/cash-session");
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
  }, [loadHistory, open]);

  const columns: GridColDef<CashSessionInfo>[] = [
    {
      field: "openedAt",
      headerName: "Apertura",
      flex: 1.2,
      minWidth: 150,
      valueFormatter: (value?: string) => (value ? formatDateYmd(value) : "-"),
    },
    {
      field: "closedAt",
      headerName: "Cierre",
      flex: 1.2,
      minWidth: 150,
      valueFormatter: (value?: string | null) => (value ? formatDateYmd(value) : "-"),
    },
    {
      field: "openingAmount",
      headerName: "Apertura $",
      width: 110,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value?: number) => formatCurrency(value ?? 0),
    },
    {
      field: "salesCashTotal",
      headerName: "Efec. $",
      width: 110,
      align: "right",
      headerAlign: "right",
      valueGetter: (_, row) => row.salesCashTotal ?? row.salesTotal ?? 0,
      valueFormatter: (value?: number) => formatCurrency(value ?? 0),
    },
    {
      field: "declaredClosing",
      headerName: "Cierre $",
      width: 110,
      align: "right",
      headerAlign: "right",
      valueGetter: (_, row) => row.declaredClosing ?? row.closingAmount ?? 0,
      valueFormatter: (value?: number | null) => formatCurrency(value ?? 0),
    },
    {
      field: "salesCount",
      headerName: "Ventas",
      width: 90,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 140,
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" onClick={() => onReprint(row)}>
          Reimprimir
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={1.5}>
      {error ? <Typography variant="body2" color="error">{error}</Typography> : null}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "14px",
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableColumnMenu
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          getRowHeight={() => 44}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 8,
                page: 0,
              },
            },
          }}
          pageSizeOptions={[8, 15]}
          sx={{
            border: 0,
            height: 360,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: alpha("#6e5642", 0.08),
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
              outline: "none",
            },
          }}
        />
      </Paper>
    </Stack>
  );
}

// ─── Main Dialog ─────────────────────────────────────────────────────────────

export function PosCashSessionDialog({
  open,
  submitting,
  cashSession,
  cashRuntime,
  openingAmount,
  openingNotes,
  closingAmount,
  closingNotes,
  onOpeningAmountChange,
  onOpeningNotesChange,
  onClosingAmountChange,
  onClosingNotesChange,
  onOpenCash,
  onCloseCash,
  onReprintClosedSession,
  onClose,
}: PosCashSessionDialogProps) {
  const hasOpenCash = Boolean(cashSession);
  const showMovementsTab =
    cashRuntime?.enabled &&
    hasOpenCash &&
    (cashRuntime.capabilities.withdrawals || cashRuntime.capabilities.deposits);
  const showHistoryTab = true;

  const [activeTab, setActiveTab] = useState(0);

  // Reset to first tab when dialog opens/closes
  useEffect(() => {
    if (open) setActiveTab(0);
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(58, 46, 35, 0.30)",
            backdropFilter: "blur(3px)",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: showMovementsTab || showHistoryTab ? 0 : undefined }}>
        {hasOpenCash ? "Caja abierta" : "Abrir caja"}
      </DialogTitle>

      {(showMovementsTab || showHistoryTab) && (
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Cierre" />
          {showMovementsTab ? <Tab label="Movimientos" /> : null}
          {showHistoryTab ? <Tab label="Historial" /> : null}
        </Tabs>
      )}

      <DialogContent >
        {/* ── Tab 0: Sesión / cierre ── */}
        {(!showMovementsTab || activeTab === 0) && (
          <Stack spacing={3}>
            {cashSession && (
              <SessionSummary
                cashSession={cashSession}
                cashRuntime={cashRuntime}
              />
            )}

            {!hasOpenCash ? (
              <Stack spacing={2} sx={{ pt: 2 }}>
                <TextField
                  label="Monto inicial"
                  type="text"
                  value={openingAmount}
                  onChange={(e) => onOpeningAmountChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  slotProps={{
                    htmlInput: {
                      inputMode: "decimal",
                      enterKeyHint: "done",
                      style: { textAlign: "right" },
                    },
                  }}
                />
                <TextField
                  label="Notas de apertura"
                  value={openingNotes}
                  onChange={(e) => onOpeningNotesChange(e.target.value)}
                  placeholder="Cambio inicial, observaciones..."
                />
              </Stack>
            ) : (
              <CloseForm
                cashRuntime={cashRuntime}
                cashSession={cashSession}
                closingAmount={closingAmount}
                closingNotes={closingNotes}
                onClosingAmountChange={onClosingAmountChange}
                onClosingNotesChange={onClosingNotesChange}
              />
            )}
          </Stack>
        )}

        {/* ── Tab 1: Movimientos ── */}
        {showMovementsTab && activeTab === 1 && cashSession && (
          <MovementsTab sessionId={cashSession.id} />
        )}

        {showHistoryTab && activeTab === (showMovementsTab ? 2 : 1) && (
          <HistoryTab open={open} onReprint={onReprintClosedSession} />
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose} disabled={submitting}>
          {activeTab > 0 ? "Cerrar" : "Cancelar"}
        </Button>

        {activeTab === 0 && (
          <>
            {!hasOpenCash ? (
              <Button
                variant="contained"
                onClick={onOpenCash}
                disabled={submitting}
                startIcon={
                  submitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <PlayCircle className="h-4 w-4" />
                }
              >
                Abrir caja
              </Button>
            ) : (
              <Button
                color="secondary"
                variant="contained"
                onClick={onCloseCash}
                disabled={submitting}
                startIcon={
                  submitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <PauseCircle className="h-4 w-4" />
                }
              >
                Cerrar caja
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
