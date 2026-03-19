"use client";

import MuiButton from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { Loader2, Save, X } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import type {
  Product,
  StockAdjustmentForm,
} from "@/components/mvp-dashboard-types";

type InventoryAdjustmentModalProps = {
  isOpen: boolean;
  products: Product[];
  adjustment: StockAdjustmentForm;
  setAdjustment: Dispatch<SetStateAction<StockAdjustmentForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

const movementTypeOptions: Array<{
  value: StockAdjustmentForm["movementType"];
  label: string;
}> = [
  { value: "IN", label: "Entrada" },
  { value: "OUT", label: "Salida" },
  { value: "ADJUSTMENT", label: "Ajuste" },
];

export function InventoryAdjustmentModal({
  isOpen,
  products,
  adjustment,
  setAdjustment,
  saving,
  onClose,
  onSubmit,
}: InventoryAdjustmentModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(74, 60, 88, 0.30)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogTitle>Ajuste de Stock</DialogTitle>
      <DialogContent>
        <p className="mb-5 text-sm text-[#4a3c58]/70">
          Registra entradas, salidas o correcciones puntuales del inventario.
        </p>
        <form id="inventory-adjustment-form" onSubmit={onSubmit}>
          <Stack spacing={3}>
            <TextField
              select
              id="inventory-adjustment-product"
              label="Producto"
              value={adjustment.productId}
              onChange={(e) =>
                setAdjustment((prev) => ({
                  ...prev,
                  productId: e.target.value,
                }))
              }
              required
            >
              <MenuItem value="">Selecciona producto</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.codigo} - {product.nombre}
                </MenuItem>
              ))}
            </TextField>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                select
                id="inventory-adjustment-type"
                label="Tipo de movimiento"
                value={adjustment.movementType}
                onChange={(e) =>
                  setAdjustment((prev) => ({
                    ...prev,
                    movementType:
                      e.target.value as StockAdjustmentForm["movementType"],
                  }))
                }
              >
                {movementTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                id="inventory-adjustment-quantity"
                label="Cantidad"
                type="number"
                value={adjustment.quantity}
                onChange={(e) =>
                  setAdjustment((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "0.001",
                  },
                }}
              />
            </div>
          </Stack>
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
          form="inventory-adjustment-form"
          variant="contained"
          disabled={saving}
          startIcon={
            saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )
          }
        >
          {saving ? "Procesando..." : "Guardar movimiento"}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
