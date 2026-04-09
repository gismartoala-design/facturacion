"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Save } from "lucide-react";
import type { FormEvent } from "react";

import type { AccountRow } from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";

import { AccountFormFields } from "./account-form-fields";
import type { AccountFormState } from "../shared";

type AccountFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  saving: boolean;
  systemReadonly?: boolean;
  selectedAccount?: AccountRow | null;
  form: AccountFormState;
  parentOptions: AccountRow[];
  selectedParent: AccountRow | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onFieldChange: <K extends keyof AccountFormState>(
    field: K,
    value: AccountFormState[K],
  ) => void;
  onGroupChange: (groupKey: AccountFormState["groupKey"]) => void;
  formatCompactNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string | null) => string;
};

export function AccountFormDialog({
  mode,
  open,
  saving,
  systemReadonly = false,
  selectedAccount = null,
  form,
  parentOptions,
  selectedParent,
  onClose,
  onSubmit,
  onFieldChange,
  onGroupChange,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
}: AccountFormDialogProps) {
  const isEdit = mode === "edit";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "24px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
        },
      }}
    >
      <Stack
        component="form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          void onSubmit(event);
        }}
      >
        <DialogTitle sx={{ pb: 0.75 }}>
          <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 700 }}>
            {isEdit ? "Editar cuenta contable" : "Nueva cuenta contable"}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.25 }}>
          <Stack spacing={2}>
            {isEdit && systemReadonly ? (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: "18px" }}>
                Esta cuenta pertenece al plan base del sistema y se mantiene solo de
                lectura.
              </Alert>
            ) : null}

            <AccountFormFields
              form={form}
              disabled={saving || systemReadonly}
              parentOptions={parentOptions}
              selectedParent={selectedParent}
              onFieldChange={onFieldChange}
              onGroupChange={onGroupChange}
            />

            {isEdit && selectedAccount ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  border: "1px solid rgba(226, 232, 240, 0.95)",
                  p: 1.5,
                  backgroundColor: "rgba(248, 250, 252, 0.85)",
                }}
              >
                <Stack spacing={0.6}>
                  <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5 }}>
                    Contexto
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Nivel {selectedAccount.level} · Padre{" "}
                    {selectedAccount.parentCode ?? "Raiz"}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Movimientos: {formatCompactNumber(selectedAccount.usageCount)} · Saldo{" "}
                    {formatCurrency(selectedAccount.balance)}
                  </Typography>
                  <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                    Ultimo uso: {formatDateTime(selectedAccount.lastPostedAt)}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
          <Button
            type="button"
            variant="text"
            onClick={onClose}
            disabled={saving}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save size={16} />}
            disabled={saving || systemReadonly}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          >
            {saving
              ? isEdit
                ? "Guardando..."
                : "Creando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear cuenta"}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
