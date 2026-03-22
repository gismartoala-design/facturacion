"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";

type PosCashSessionDialogProps = {
  open: boolean;
  submitting: boolean;
  cashSession: {
    openingAmount: number;
    openedAt: string;
    salesCount: number;
    salesTotal: number;
  } | null;
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
  onClose: () => void;
};

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

export function PosCashSessionDialog({
  open,
  submitting,
  cashSession,
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
  onClose,
}: PosCashSessionDialogProps) {
  const hasOpenCash = Boolean(cashSession);

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
      <DialogTitle>
        {hasOpenCash ? "Cerrar caja" : "Abrir caja"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {cashSession ? (
            <Paper
              sx={{
                borderRadius: "20px",
                p: 2.5,
                backgroundColor: "#fbf7f1",
                border: "1px solid rgba(205, 191, 173, 0.7)",
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant="subtitle2" sx={{ color: "#6e5642", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Resumen de caja
                </Typography>
                <Typography sx={{ color: "#4a3c58" }}>
                  Apertura: <strong>{formatCurrency(cashSession.openingAmount)}</strong>
                </Typography>
                <Typography sx={{ color: "#4a3c58" }}>
                  Abierta desde: <strong>{formatDateTime(cashSession.openedAt)}</strong>
                </Typography>
                <Typography sx={{ color: "#4a3c58" }}>
                  Ventas registradas: <strong>{cashSession.salesCount}</strong>
                </Typography>
                <Typography sx={{ color: "#4a3c58" }}>
                  Total vendido: <strong>{formatCurrency(cashSession.salesTotal)}</strong>
                </Typography>
              </Stack>
            </Paper>
          ) : null}

          {!hasOpenCash ? (
            <Stack spacing={2}>
              <TextField
                label="Monto inicial"
                type="text"
                value={openingAmount}
                onChange={(e) => onOpeningAmountChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => onOpeningAmountChange(e.target.value)}
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
            <Stack spacing={2}>
              <TextField
                label="Valor de cierre"
                type="text"
                value={closingAmount}
                onChange={(e) => onClosingAmountChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => onClosingAmountChange(e.target.value)}
                slotProps={{
                  htmlInput: {
                    inputMode: "decimal",
                    enterKeyHint: "done",
                    style: { textAlign: "right" },
                  },
                }}
              />
              <TextField
                label="Notas de cierre"
                value={closingNotes}
                onChange={(e) => onClosingNotesChange(e.target.value)}
                placeholder="Diferencias, novedades, observaciones..."
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        {!hasOpenCash ? (
          <Button variant="contained" onClick={onOpenCash} disabled={submitting} startIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}>
            Abrir caja
          </Button>
        ) : (
          <Button color="secondary" variant="contained" onClick={onCloseCash} disabled={submitting} startIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}>
            Cerrar caja
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
