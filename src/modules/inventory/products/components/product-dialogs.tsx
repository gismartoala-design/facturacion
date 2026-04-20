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
  PRODUCT_TYPE_OPTIONS,
  type EditProductForm,
  type NewProductForm,
} from "@/shared/dashboard/types";

const dialogBackdropProps = {
  backdrop: {
    sx: {
      backgroundColor: "rgba(74, 60, 88, 0.30)",
      backdropFilter: "blur(4px)",
    },
  },
} as const;

type CreateProductDialogProps = {
  isOpen: boolean;
  form: NewProductForm;
  setForm: Dispatch<SetStateAction<NewProductForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function CreateProductDialog({
  isOpen,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: CreateProductDialogProps) {
  const isService = form.tipoProducto === "SERVICIO";

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Nuevo Producto</DialogTitle>
      <DialogContent>
        <p className="mb-5 text-sm text-[#4a3c58]/70">
          Completa la informacion base para inventario y ventas.
        </p>
        <form id="new-product-form" className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="modal-nombre"
              label="Nombre"
              value={form.nombre}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              required
              autoFocus
            />
            <TextField
              select
              id="modal-tipo-producto"
              label="Tipo"
              value={form.tipoProducto}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tipoProducto: e.target.value as NewProductForm["tipoProducto"],
                  ...(e.target.value === "SERVICIO"
                    ? { stockInicial: "0", minStock: "0" }
                    : {}),
                }))
              }
              required
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="modal-sku"
              label="SKU (opcional)"
              value={form.sku}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sku: e.target.value }))
              }
            />
            <TextField
              id="modal-codigo-barras"
              label="Codigo de barras o prefijo balanza"
              value={form.codigoBarras}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  codigoBarras: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="modal-precio"
              label="Precio"
              type="number"
              value={form.precio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, precio: e.target.value }))
              }
              required
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.01",
                },
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField
              id="modal-iva"
              label="IVA %"
              type="number"
              value={form.tarifaIva}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tarifaIva: e.target.value }))
              }
              required
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.01",
                },
              }}
            />
            <TextField
              id="modal-stock-inicial"
              label="Stock inicial"
              type="number"
              value={form.stockInicial}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, stockInicial: e.target.value }))
              }
              required
              disabled={isService}
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.001",
                },
              }}
            />
            <TextField
              id="modal-min-stock"
              label="Stock minimo"
              type="number"
              value={form.minStock}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, minStock: e.target.value }))
              }
              required
              disabled={isService}
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.001",
                },
              }}
            />
          </div>

          {isService ? (
            <p className="text-xs text-[#4a3c58]/62">
              Los servicios no generan stock ni alertas de inventario.
            </p>
          ) : null}
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
          form="new-product-form"
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
              Guardar
            </>
          )}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

type EditProductDialogProps = {
  isOpen: boolean;
  form: EditProductForm;
  setForm: Dispatch<SetStateAction<EditProductForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function EditProductDialog({
  isOpen,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: EditProductDialogProps) {
  const isService = form.tipoProducto === "SERVICIO";

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Editar Producto</DialogTitle>
      <DialogContent>
        <p className="mb-5 text-sm text-[#4a3c58]/70">
          Modifica los datos del producto. El stock se gestiona desde Inventario.
        </p>
        <form id="edit-product-form" className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="edit-nombre"
              label="Nombre"
              value={form.nombre}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              required
              autoFocus
            />
            <TextField
              select
              id="edit-tipo-producto"
              label="Tipo"
              value={form.tipoProducto}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tipoProducto: e.target.value as EditProductForm["tipoProducto"],
                  ...(e.target.value === "SERVICIO" ? { minStock: "0" } : {}),
                }))
              }
              required
            >
              {PRODUCT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.code} value={option.code}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="edit-sku"
              label="SKU (opcional)"
              value={form.sku}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sku: e.target.value }))
              }
            />
            <TextField
              id="edit-codigo-barras"
              label="Codigo de barras o prefijo balanza"
              value={form.codigoBarras}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  codigoBarras: e.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="edit-precio"
              label="Precio"
              type="number"
              value={form.precio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, precio: e.target.value }))
              }
              required
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.01",
                },
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="edit-iva"
              label="IVA %"
              type="number"
              value={form.tarifaIva}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tarifaIva: e.target.value }))
              }
              required
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.01",
                },
              }}
            />
            <TextField
              id="edit-min-stock"
              label="Stock minimo"
              type="number"
              value={form.minStock}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, minStock: e.target.value }))
              }
              required
              disabled={isService}
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: "0.001",
                },
              }}
            />
          </div>
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
          form="edit-product-form"
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
              Guardar cambios
            </>
          )}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

type DeleteProductDialogProps = {
  isOpen: boolean;
  productName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProductDialog({
  isOpen,
  productName,
  saving,
  onClose,
  onConfirm,
}: DeleteProductDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Eliminar Producto</DialogTitle>
      <DialogContent>
        <p className="text-sm text-[#4a3c58]/80">
          ¿Estas seguro de que deseas desactivar el producto{" "}
          <span className="font-semibold text-[#4a3c58]">{productName}</span>? El
          producto no se borrara, quedara inactivo y dejara de aparecer en el
          catalogo.
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...
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
