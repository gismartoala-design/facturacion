"use client";

import MuiButton from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Ban, Loader2, Save, X } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import {
  SUPPLIER_IDENTIFICATION_TYPES,
  type SupplierForm,
} from "../types";

const dialogBackdropProps = {
  backdrop: {
    sx: {
      backgroundColor: "rgba(35, 49, 59, 0.30)",
      backdropFilter: "blur(4px)",
    },
  },
} as const;

type SupplierFormDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  formId: string;
  form: SupplierForm;
  setForm: Dispatch<SetStateAction<SupplierForm>>;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function SupplierFormDialog({
  isOpen,
  title,
  description,
  formId,
  form,
  setForm,
  saving,
  submitLabel,
  onClose,
  onSubmit,
}: SupplierFormDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <p className="mb-5 text-sm text-slate-600">{description}</p>

        <form id={formId} className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField
              select
              id={`${formId}-tipo-identificacion`}
              label="Tipo"
              value={form.tipoIdentificacion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  tipoIdentificacion: event.target.value,
                }))
              }
              required
            >
              {SUPPLIER_IDENTIFICATION_TYPES.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id={`${formId}-identificacion`}
              label="Identificacion"
              value={form.identificacion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  identificacion: event.target.value,
                }))
              }
              required
              autoFocus
            />
            <TextField
              id={`${formId}-dias-credito`}
              label="Dias credito"
              type="number"
              value={form.diasCredito}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, diasCredito: event.target.value }))
              }
              required
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 365,
                  step: 1,
                },
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id={`${formId}-razon-social`}
              label="Razon social"
              value={form.razonSocial}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, razonSocial: event.target.value }))
              }
              required
            />
            <TextField
              id={`${formId}-nombre-comercial`}
              label="Nombre comercial"
              value={form.nombreComercial}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  nombreComercial: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField
              id={`${formId}-contacto`}
              label="Contacto principal"
              value={form.contactoPrincipal}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  contactoPrincipal: event.target.value,
                }))
              }
            />
            <TextField
              id={`${formId}-telefono`}
              label="Telefono"
              value={form.telefono}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, telefono: event.target.value }))
              }
            />
            <TextField
              id={`${formId}-email`}
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </div>

          <TextField
            id={`${formId}-direccion`}
            label="Direccion"
            value={form.direccion}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, direccion: event.target.value }))
            }
            multiline
            minRows={2}
          />
        </form>
      </DialogContent>
      <DialogActions>
        <MuiButton
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={saving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </MuiButton>
        <MuiButton
          type="submit"
          form={formId}
          variant="contained"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {submitLabel}
            </>
          )}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

type CreateSupplierDialogProps = {
  isOpen: boolean;
  form: SupplierForm;
  setForm: Dispatch<SetStateAction<SupplierForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateSupplierDialog(props: CreateSupplierDialogProps) {
  return (
    <SupplierFormDialog
      {...props}
      title="Nuevo Proveedor"
      description="Registra la informacion base para compras, credito y contacto."
      formId="new-supplier-form"
      submitLabel="Guardar"
    />
  );
}

type EditSupplierDialogProps = CreateSupplierDialogProps;

export function EditSupplierDialog(props: EditSupplierDialogProps) {
  return (
    <SupplierFormDialog
      {...props}
      title="Editar Proveedor"
      description="Actualiza los datos maestros del proveedor. Las compras futuras usaran esta informacion."
      formId="edit-supplier-form"
      submitLabel="Guardar cambios"
    />
  );
}

type DeleteSupplierDialogProps = {
  isOpen: boolean;
  supplierName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteSupplierDialog({
  isOpen,
  supplierName,
  saving,
  onClose,
  onConfirm,
}: DeleteSupplierDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Desactivar Proveedor</DialogTitle>
      <DialogContent>
        <p className="text-sm text-slate-700">
          ¿Estas seguro de que deseas desactivar a{" "}
          <span className="font-semibold text-slate-950">{supplierName}</span>?
          No se borrara el historial futuro asociado; solo dejara de aparecer en
          la cartera activa.
        </p>
      </DialogContent>
      <DialogActions>
        <MuiButton
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={saving}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </MuiButton>
        <MuiButton
          type="button"
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Desactivando...
            </>
          ) : (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Desactivar
            </>
          )}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
