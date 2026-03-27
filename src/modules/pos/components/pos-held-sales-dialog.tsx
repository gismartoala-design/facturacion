"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Loader2, Trash2 } from "lucide-react";

type HeldSaleSummary = {
  id: string;
  label: string;
  total: number;
  updatedAt: string;
};

type PosHeldSalesDialogProps = {
  open: boolean;
  heldSales: HeldSaleSummary[];
  activeHeldSaleId: string | null;
  deletingHeldSaleId: string | null;
  onClose: () => void;
  onLoadHeldSale: (heldSaleId: string) => void;
  onDeleteHeldSale: (heldSaleId: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatRelativeStamp(value: string) {
  const date = new Date(value);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "ahora";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function PosHeldSalesDialog({
  open,
  heldSales,
  activeHeldSaleId,
  deletingHeldSaleId,
  onClose,
  onLoadHeldSale,
  onDeleteHeldSale,
}: PosHeldSalesDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <DialogTitle>Ventas en espera</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25}>
          {heldSales.length === 0 ? (
            <Paper
              sx={{
                p: 2,
                borderRadius: "18px",
                backgroundColor: "#fcfaf6",
                borderStyle: "dashed",
              }}
            >
              <Typography color="text.secondary" variant="body2">
                No hay ventas en espera registradas.
              </Typography>
            </Paper>
          ) : (
            heldSales.map((heldSale) => {
              const isDeleting = deletingHeldSaleId === heldSale.id;

              return (
                <Paper
                  key={heldSale.id}
                  sx={{
                    px: 1.25,
                    py: 1,
                    borderRadius: "16px",
                    backgroundColor: activeHeldSaleId === heldSale.id ? "#f6efe6" : "#fff",
                    borderColor: activeHeldSaleId === heldSale.id ? "rgba(146, 111, 74, 0.5)" : "rgba(205, 191, 173, 0.72)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                        {heldSale.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
                        {formatCurrency(heldSale.total)} • {formatRelativeStamp(heldSale.updatedAt)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={isDeleting}
                        onClick={() => onLoadHeldSale(heldSale.id)}
                      >
                        Cargar
                      </Button>
                      <IconButton
                        color="error"
                        size="small"
                        disabled={isDeleting}
                        onClick={() => onDeleteHeldSale(heldSale.id)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
