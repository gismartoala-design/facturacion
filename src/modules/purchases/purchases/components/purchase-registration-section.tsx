"use client";

import { Button, Grid } from "@mui/material";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Plus, ReceiptText, Save, Trash2 } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@/shared/dashboard/types";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

import type { PurchaseForm, PurchaseLineForm } from "../types";
import { PURCHASE_DOCUMENT_TYPES } from "../types";
import type { Supplier } from "../../suppliers/types";

type PurchaseRegistrationSectionProps = {
  suppliers: Supplier[];
  products: Product[];
  form: PurchaseForm;
  setForm: Dispatch<SetStateAction<PurchaseForm>>;
  saving: boolean;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
  };
  onSelectProduct: (index: number, productId: string) => void;
  onUpdateLine: (index: number, patch: Partial<PurchaseLineForm>) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function currency(value: number) {
  return `$${value.toFixed(2)}`;
}

function lineTotal(item: PurchaseLineForm) {
  const quantity = Number(item.quantity) || 0;
  const unitCost = Number(item.unitCost) || 0;
  const discount = Number(item.discount) || 0;
  const taxRate = Number(item.taxRate) || 0;
  const subtotal = Math.max(0, quantity * unitCost - discount);
  const taxTotal = subtotal * (taxRate / 100);

  return subtotal + taxTotal;
}

export function PurchaseRegistrationSection({
  suppliers,
  products,
  form,
  setForm,
  saving,
  totals,
  onSelectProduct,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onSubmit,
}: PurchaseRegistrationSectionProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<ReceiptText className="h-4.5 w-4.5" />}
          title="Registrar Compra"
          description="Registra documentos de compra y genera ingresos de inventario para productos tipo bien."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid size={12}>
        <Card className="rounded-[20px]">
          <form onSubmit={onSubmit}>
            <CardContent>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Proveedor"
                    value={form.supplierId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        supplierId: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  >
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.nombreComercial || supplier.razonSocial}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    select
                    label="Tipo"
                    value={form.documentType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        documentType: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  >
                    {PURCHASE_DOCUMENT_TYPES.map((option) => (
                      <MenuItem key={option.code} value={option.code}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    label="Numero"
                    value={form.documentNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        documentNumber: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    label="Fecha emision"
                    type="date"
                    value={form.issuedAt}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        issuedAt: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField
                    label="Autorizacion"
                    value={form.authorizationNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        authorizationNumber: event.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>

                <Grid size={12}>
                  <Divider />
                </Grid>

                <Grid size={12}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography sx={{ fontWeight: 800, color: "#23313b" }}>
                        Detalle de productos
                      </Typography>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={onAddLine}
                        startIcon={<Plus className="h-4 w-4" />}
                      >
                        Agregar linea
                      </Button>
                    </Stack>

                    {form.items.map((item, index) => (
                      <Grid
                        key={index}
                        container
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          p: 1.25,
                          border: "1px solid rgba(148, 163, 184, 0.28)",
                          borderRadius: 2,
                          backgroundColor: "rgba(248, 250, 252, 0.85)",
                        }}
                      >
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            select
                            label="Producto"
                            value={item.productId}
                            onChange={(event) =>
                              onSelectProduct(index, event.target.value)
                            }
                            required
                            fullWidth
                          >
                            {products.map((product) => (
                              <MenuItem key={product.id} value={product.id}>
                                {product.codigo} · {product.nombre}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3, md: 1.2 }}>
                          <TextField
                            label="Cantidad"
                            type="number"
                            value={item.quantity}
                            onChange={(event) =>
                              onUpdateLine(index, {
                                quantity: event.target.value,
                              })
                            }
                            required
                            fullWidth
                            slotProps={{
                              htmlInput: { min: 0, step: "0.001" },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3, md: 1.4 }}>
                          <TextField
                            label="Costo"
                            type="number"
                            value={item.unitCost}
                            onChange={(event) =>
                              onUpdateLine(index, {
                                unitCost: event.target.value,
                              })
                            }
                            required
                            fullWidth
                            slotProps={{
                              htmlInput: { min: 0, step: "0.0001" },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3, md: 1.2 }}>
                          <TextField
                            label="Desc."
                            type="number"
                            value={item.discount}
                            onChange={(event) =>
                              onUpdateLine(index, {
                                discount: event.target.value,
                              })
                            }
                            fullWidth
                            slotProps={{
                              htmlInput: { min: 0, step: "0.01" },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3, md: 1.1 }}>
                          <TextField
                            label="IVA %"
                            type="number"
                            value={item.taxRate}
                            onChange={(event) =>
                              onUpdateLine(index, {
                                taxRate: event.target.value,
                              })
                            }
                            fullWidth
                            slotProps={{
                              htmlInput: { min: 0, max: 100, step: "0.01" },
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 8, md: 1.3 }}>
                          <Chip
                            label={currency(lineTotal(item))}
                            sx={{
                              width: "100%",
                              height: 40,
                              borderRadius: 2,
                              fontWeight: 800,
                              color: "#23313b",
                              backgroundColor: "#e0f2fe",
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 4, md: 1.8 }}>
                          <Button
                            type="button"
                            color="error"
                            onClick={() => onRemoveLine(index)}
                            disabled={form.items.length === 1}
                            startIcon={<Trash2 className="h-4 w-4" />}
                            fullWidth
                          >
                            Quitar
                          </Button>
                        </Grid>
                      </Grid>
                    ))}
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <TextField
                    label="Notas"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    multiline
                    minRows={3}
                    fullWidth
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <Stack
                    spacing={1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "#f8fafc",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                    }}
                  >
                    {[
                      ["Subtotal", totals.subtotal],
                      ["Descuento", totals.discountTotal],
                      ["IVA", totals.taxTotal],
                      ["Total", totals.total],
                    ].map(([label, value]) => (
                      <Stack
                        key={label}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                          {label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: label === "Total" ? 20 : 14,
                            fontWeight: label === "Total" ? 900 : 700,
                            color: "#23313b",
                          }}
                        >
                          {currency(Number(value))}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>

            <CardActions sx={{ justifyContent: "flex-end", px: 2.5, pb: 2.5 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={<Save className="h-4 w-4" />}
              >
                {saving ? "Registrando..." : "Registrar compra"}
              </Button>
            </CardActions>
          </form>
        </Card>
      </Grid>
    </Grid>
  );
}
