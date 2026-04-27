"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { PackagePlus, ReceiptText, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import type { Product } from "@/shared/dashboard/types";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

import type { DraftLineForm, PurchaseForm } from "../types";
import { PURCHASE_DOCUMENT_TYPES } from "../types";
import type { Supplier } from "../../suppliers/types";

type LineRow = {
  id: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  discount: number;
  taxRate: number;
  total: number;
};

type Totals = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
};

type PurchaseRegistrationSectionProps = {
  suppliers: Supplier[];
  products: Product[];
  form: PurchaseForm;
  setForm: Dispatch<SetStateAction<PurchaseForm>>;
  draft: DraftLineForm;
  draftError: string | null;
  supplierIdSearch: string;
  selectedSupplier: Supplier | null;
  selectedDraftProduct: Product | null;
  lineRows: LineRow[];
  saving: boolean;
  totals: Totals;
  onSupplierSelect: (supplier: Supplier | null) => void;
  onSupplierIdSearch: (value: string) => void;
  onUpdateDraft: (patch: Partial<DraftLineForm>) => void;
  onSelectDraftProduct: (product: Product | null) => void;
  onSearchDraftByCode: () => void;
  onCommitDraftLine: () => void;
  onRemoveLine: (index: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

const PAPER_SX = {
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  backgroundColor: "#fff",
  p: 2.5,
} as const;

export function PurchaseRegistrationSection({
  suppliers,
  products,
  form,
  setForm,
  draft,
  draftError,
  supplierIdSearch,
  selectedSupplier,
  selectedDraftProduct,
  lineRows,
  saving,
  totals,
  onSupplierSelect,
  onSupplierIdSearch,
  onUpdateDraft,
  onSelectDraftProduct,
  onSearchDraftByCode,
  onCommitDraftLine,
  onRemoveLine,
  onSubmit,
}: PurchaseRegistrationSectionProps) {
  const lineColumns: GridColDef<LineRow>[] = [
    {
      field: "productCode",
      headerName: "Codigo",
      width: 110,
      sortable: false,
    },
    {
      field: "productName",
      headerName: "Producto",
      flex: 1,
      minWidth: 200,
      sortable: false,
    },
    {
      field: "quantity",
      headerName: "Cantidad",
      width: 100,
      align: "right",
      headerAlign: "right",
      sortable: false,
    },
    {
      field: "unitCost",
      headerName: "Costo unit.",
      width: 120,
      align: "right",
      headerAlign: "right",
      sortable: false,
      valueFormatter: (value: number) => currency(value),
    },
    {
      field: "discount",
      headerName: "Desc.",
      width: 100,
      align: "right",
      headerAlign: "right",
      sortable: false,
      valueFormatter: (value: number) => currency(value),
    },
    {
      field: "taxRate",
      headerName: "IVA %",
      width: 90,
      align: "right",
      headerAlign: "right",
      sortable: false,
      valueFormatter: (value: number) => `${value}%`,
    },
    {
      field: "total",
      headerName: "Total",
      width: 130,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
          {currency(params.row.total)}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <IconButton
          size="small"
          color="error"
          onClick={() => onRemoveLine(params.row.id)}
          aria-label="Quitar producto"
        >
          <Trash2 size={15} />
        </IconButton>
      ),
    },
  ];

  return (
    <form onSubmit={onSubmit}>
      <Grid container spacing={2.5}>
        <Grid size={12}>
          <DashboardPageHeader
            icon={<ReceiptText size={18} color="#475569" />}
            title="Registrar compra"
            description="Registra documentos de compra y genera ingresos de inventario para productos tipo bien."
            sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
          />
        </Grid>

        {/* Barra de control */}
        <Grid size={12}>
          <Paper elevation={0} sx={PAPER_SX}>
            <Grid
              container
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Grid size={{ xs: 12, md: "grow" }}>
                <Stack spacing={0.75}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                    Nueva compra
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={
                        lineRows.length === 0
                          ? "Sin productos"
                          : `${lineRows.length} producto${lineRows.length !== 1 ? "s" : ""}`
                      }
                      size="small"
                      sx={{ borderRadius: "999px", fontWeight: 700 }}
                    />
                    {lineRows.length > 0 ? (
                      <Chip
                        label={`Total ${currency(totals.total)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: "999px", fontWeight: 700 }}
                      />
                    ) : null}
                    {selectedSupplier ? (
                      <Chip
                        label={selectedSupplier.nombreComercial || selectedSupplier.razonSocial}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: "999px", fontWeight: 700 }}
                      />
                    ) : null}
                  </Stack>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: "auto" }}>
                <Grid
                  container
                  spacing={1}
                  justifyContent={{ xs: "stretch", md: "flex-end" }}
                >
                  <Grid size={{ xs: 12, sm: "auto" }}>
                    <Button
                      type="button"
                      variant="outlined"
                      disabled={saving}
                      startIcon={<RotateCcw size={15} />}
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          (document.activeElement as HTMLElement | null)?.blur();
                        }
                      }}
                      fullWidth
                    >
                      Limpiar
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "auto" }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saving || lineRows.length === 0}
                      startIcon={<Save size={15} />}
                      fullWidth
                    >
                      {saving ? "Registrando..." : "Registrar compra"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Proveedor */}
        <Grid size={12}>
          <Paper elevation={0} sx={PAPER_SX}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Proveedor
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Buscar por identificacion"
                    placeholder="RUC, cedula o pasaporte"
                    value={supplierIdSearch}
                    onChange={(e) => onSupplierIdSearch(e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} color="#64748b" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Autocomplete
                    options={suppliers}
                    value={selectedSupplier}
                    onChange={(_, supplier) => onSupplierSelect(supplier)}
                    getOptionLabel={(s) => s.nombreComercial || s.razonSocial}
                    filterOptions={(options, state) => {
                      const q = state.inputValue.trim().toLowerCase();
                      if (!q) return options;
                      return options.filter(
                        (s) =>
                          (s.nombreComercial ?? "").toLowerCase().includes(q) ||
                          s.razonSocial.toLowerCase().includes(q) ||
                          s.identificacion.toLowerCase().includes(q),
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nombre comercial / razon social"
                        placeholder="Buscar proveedor"
                        required
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <Search size={16} color="#64748b" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      return (
                        <Box component="li" key={key} {...rest}>
                          <Stack spacing={0.15}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {option.nombreComercial || option.razonSocial}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {option.identificacion} · {option.tipoIdentificacion}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    }}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        {/* Documento */}
        <Grid size={12}>
          <Paper elevation={0} sx={PAPER_SX}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Documento de compra
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    select
                    label="Tipo de documento"
                    value={form.documentType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, documentType: e.target.value }))
                    }
                    required
                    fullWidth
                  >
                    {PURCHASE_DOCUMENT_TYPES.map((opt) => (
                      <MenuItem key={opt.code} value={opt.code}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    label="Numero de documento"
                    value={form.documentNumber}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, documentNumber: e.target.value }))
                    }
                    required
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    label="Fecha de emision"
                    type="date"
                    value={form.issuedAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, issuedAt: e.target.value }))
                    }
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    label="Numero de autorizacion"
                    value={form.authorizationNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        authorizationNumber: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        {/* Productos */}
        <Grid size={12}>
          <Paper elevation={0} sx={PAPER_SX}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Detalle de productos
              </Typography>

              {/* Fila de ingreso — fila 1: búsqueda */}
              <Grid container spacing={1.25}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <TextField
                    label="Codigo / codigo de barras"
                    placeholder="Buscar por codigo"
                    value={draft.codeSearch}
                    onChange={(e) => onUpdateDraft({ codeSearch: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSearchDraftByCode();
                      }
                    }}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" onClick={onSearchDraftByCode}>
                            <Search size={15} color="#64748b" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Autocomplete
                    options={products}
                    value={selectedDraftProduct}
                    onChange={(_, product) => onSelectDraftProduct(product)}
                    getOptionLabel={(p) => p.nombre}
                    filterOptions={(options, state) => {
                      const q = state.inputValue.trim().toLowerCase();
                      if (!q) return options;
                      return options.filter(
                        (p) =>
                          p.nombre.toLowerCase().includes(q) ||
                          p.codigo.toLowerCase().includes(q) ||
                          (p.codigoBarras ?? "").toLowerCase().includes(q),
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Producto"
                        placeholder="Buscar por nombre"
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      return (
                        <Box component="li" key={key} {...rest}>
                          <Stack spacing={0.1}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {option.nombre}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {option.codigo}
                              {option.codigoBarras ? ` · ${option.codigoBarras}` : ""}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    }}
                  />
                </Grid>
              </Grid>

              {/* Fila de ingreso — fila 2: campos numéricos + agregar */}
              <Grid container spacing={1.25} alignItems="stretch">
                <Grid size={{ xs: 6, sm: 3, md: "grow" }}>
                  <TextField
                    label="Cantidad"
                    type="number"
                    value={draft.quantity}
                    onChange={(e) => onUpdateDraft({ quantity: e.target.value })}
                    fullWidth
                    slotProps={{ htmlInput: { min: 0, step: "0.001" } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: "grow" }}>
                  <TextField
                    label="Costo unit."
                    type="number"
                    value={draft.unitCost}
                    onChange={(e) => onUpdateDraft({ unitCost: e.target.value })}
                    fullWidth
                    slotProps={{ htmlInput: { min: 0, step: "0.0001" } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: "grow" }}>
                  <TextField
                    label="Desc."
                    type="number"
                    value={draft.discount}
                    onChange={(e) => onUpdateDraft({ discount: e.target.value })}
                    fullWidth
                    slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3, md: "grow" }}>
                  <TextField
                    label="IVA %"
                    type="number"
                    value={draft.taxRate}
                    onChange={(e) => onUpdateDraft({ taxRate: e.target.value })}
                    fullWidth
                    slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: "auto" }}>
                  <Button
                    type="button"
                    variant="contained"
                    onClick={onCommitDraftLine}
                    startIcon={<PackagePlus size={16} />}
                    fullWidth
                    // sx={{ borderRadius: "999px", fontWeight: 700, height: "100%", minHeight: 56 }}
                  >
                    Agregar
                  </Button>
                </Grid>
              </Grid>

              {draftError ? (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: "12px" }}>
                  {draftError}
                </Alert>
              ) : null}

              <Divider />

              {/* Tabla de productos agregados */}
              <Box
                sx={{
                  borderRadius: "16px",
                  border: "1px solid rgba(226, 232, 240, 0.95)",
                  overflow: "hidden",
                  height: 420,
                }}
              >
                <DataGrid
                  rows={lineRows}
                  columns={lineColumns}
                  disableColumnMenu
                  disableRowSelectionOnClick
                  hideFooterSelectedRowCount
                  pageSizeOptions={[10, 25]}
                  localeText={{
                    noRowsLabel:
                      "Aun no hay productos. Busca por codigo o nombre y usa Agregar.",
                  }}
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-cell": { fontSize: 13, alignItems: "center" },
                    "& .MuiDataGrid-columnHeaderTitle": { fontSize: 13, fontWeight: 700 },
                    "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                      outline: "none",
                    },
                  }}
                />
              </Box>

              {lineRows.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`${lineRows.length} producto${lineRows.length !== 1 ? "s" : ""}`}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Subtotal ${currency(totals.subtotal)}`}
                    variant="outlined"
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  <Chip
                    label={`IVA ${currency(totals.taxTotal)}`}
                    variant="outlined"
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                  <Chip
                    label={`Total ${currency(totals.total)}`}
                    color="primary"
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  />
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        </Grid>

        {/* Notas y totales */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={PAPER_SX}>
            <TextField
              label="Notas u observaciones"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              multiline
              minRows={4}
              fullWidth
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ ...PAPER_SX, height: "100%" }}>
            <Stack spacing={1.5} sx={{ height: "100%" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                Resumen
              </Typography>
              {(
                [
                  ["Subtotal", totals.subtotal],
                  ["Descuento", totals.discountTotal],
                  ["IVA", totals.taxTotal],
                  ["Total", totals.total],
                ] as [string, number][]
              ).map(([label, value]) => (
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
                      fontSize: label === "Total" ? 22 : 14,
                      fontWeight: label === "Total" ? 900 : 700,
                      color: "#0f172a",
                    }}
                  >
                    {currency(value)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </form>
  );
}
