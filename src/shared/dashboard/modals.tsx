import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { DataGrid, type GridColDef, type GridRowSelectionModel } from "@mui/x-data-grid";
import {
  Ban,
  Check,
  Download,
  FileCode2,
  Loader2,
  Save,
  UserCheck,
  X,
} from "lucide-react";
import { useMemo, type Dispatch, type FormEvent, type SetStateAction } from "react";

import {
  PRODUCT_TYPE_OPTIONS,
  type Customer,
  type EditProductForm,
  type NewProductForm,
  type Product,
  type SriInvoiceDetail,
  type StockAdjustmentForm,
} from "@/shared/dashboard/types";

const modalDataGridSx = {
  minHeight: 320,
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: 13,
  },
  "& .MuiDataGrid-cell": {
    fontSize: 13,
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
} as const;

const dialogBackdropProps = {
  backdrop: {
    sx: {
      backgroundColor: "rgba(74, 60, 88, 0.30)",
      backdropFilter: "blur(4px)",
    },
  },
} as const;

type ProductModalProps = {
  isOpen: boolean;
  newProduct: NewProductForm;
  setNewProduct: Dispatch<SetStateAction<NewProductForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ProductModal({ isOpen, newProduct, setNewProduct, saving, onClose, onSubmit }: ProductModalProps) {
  const isService = newProduct.tipoProducto === "SERVICIO";

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
        <form
          id="new-product-form"
          className="grid gap-3"
          onSubmit={onSubmit}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              id="modal-nombre"
              label="Nombre"
              value={newProduct.nombre}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, nombre: e.target.value }))}
              required
              autoFocus
            />
            <TextField
              select
              id="modal-tipo-producto"
              label="Tipo"
              value={newProduct.tipoProducto}
              onChange={(e) =>
                setNewProduct((prev) => ({
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
            <div>
              <TextField
                id="modal-sku"
                label="SKU (opcional)"
                value={newProduct.sku}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div>
              <TextField
                id="modal-codigo-barras"
                label="Codigo de barras o prefijo balanza"
                value={newProduct.codigoBarras}
                onChange={(e) =>
                  setNewProduct((prev) => ({
                    ...prev,
                    codigoBarras: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <TextField
                id="modal-precio"
                label="Precio"
                type="number"
                value={newProduct.precio}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, precio: e.target.value }))}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "0.01",
                  },
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <TextField
                id="modal-iva"
                label="IVA %"
                type="number"
                value={newProduct.tarifaIva}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, tarifaIva: e.target.value }))}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "0.01",
                  },
                }}
              />
            </div>
            <div>
              <TextField
                id="modal-stock-inicial"
                label="Stock inicial"
                type="number"
                value={newProduct.stockInicial}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, stockInicial: e.target.value }))}
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
            <div>
              <TextField
                id="modal-min-stock"
                label="Stock minimo"
                type="number"
                value={newProduct.minStock}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, minStock: e.target.value }))}
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
          </div>
          {isService ? (
            <p className="text-xs text-[#4a3c58]/62">
              Los servicios no generan stock ni alertas de inventario.
            </p>
          ) : null}
        </form>
      </DialogContent>
      <DialogActions>
        <MuiButton type="button" variant="outlined" onClick={onClose} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </MuiButton>
        <MuiButton type="submit" form="new-product-form" variant="contained" disabled={saving}>
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

type EditProductModalProps = {
  isOpen: boolean;
  editForm: EditProductForm;
  setEditForm: Dispatch<SetStateAction<EditProductForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function EditProductModal({ isOpen, editForm, setEditForm, saving, onClose, onSubmit }: EditProductModalProps) {
  const isService = editForm.tipoProducto === "SERVICIO";

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
              value={editForm.nombre}
              onChange={(e) => setEditForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
              autoFocus
            />
            <TextField
              select
              id="edit-tipo-producto"
              label="Tipo"
              value={editForm.tipoProducto}
              onChange={(e) =>
                setEditForm((prev) => ({
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
            <div>
              <TextField
                id="edit-sku"
                label="SKU (opcional)"
                value={editForm.sku}
                onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div>
              <TextField
                id="edit-codigo-barras"
                label="Codigo de barras o prefijo balanza"
                value={editForm.codigoBarras}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    codigoBarras: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <TextField
                id="edit-precio"
                label="Precio"
                type="number"
                value={editForm.precio}
                onChange={(e) => setEditForm((prev) => ({ ...prev, precio: e.target.value }))}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "0.01",
                  },
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <TextField
                id="edit-iva"
                label="IVA %"
                type="number"
                value={editForm.tarifaIva}
                onChange={(e) => setEditForm((prev) => ({ ...prev, tarifaIva: e.target.value }))}
                required
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: "0.01",
                  },
                }}
              />
            </div>
            <div>
            <TextField
              id="edit-min-stock"
              label="Stock minimo"
              type="number"
              value={editForm.minStock}
              onChange={(e) => setEditForm((prev) => ({ ...prev, minStock: e.target.value }))}
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
          </div>
        </form>
      </DialogContent>
      <DialogActions>
        <MuiButton type="button" variant="outlined" onClick={onClose} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </MuiButton>
        <MuiButton type="submit" form="edit-product-form" variant="contained" disabled={saving}>
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

type DeleteProductModalProps = {
  isOpen: boolean;
  productName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteProductModal({ isOpen, productName, saving, onClose, onConfirm }: DeleteProductModalProps) {
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
          <span className="font-semibold text-[#4a3c58]">{productName}</span>? El producto no se borrara, quedara inactivo y dejara de aparecer en el catalogo.
        </p>
      </DialogContent>
      <DialogActions>
        <MuiButton type="button" variant="outlined" onClick={onClose} disabled={saving}>
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

type StockAdjustmentModalProps = {
  isOpen: boolean;
  products: Product[];
  adjustment: StockAdjustmentForm;
  setAdjustment: Dispatch<SetStateAction<StockAdjustmentForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function StockAdjustmentModal({
  isOpen,
  products,
  adjustment,
  setAdjustment,
  saving,
  onClose,
  onSubmit,
}: StockAdjustmentModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Ajuste de Stock</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3, color: "rgba(74, 60, 88, 0.7)" }}>
          Registra entrada, salida o ajuste puntual de inventario.
        </DialogContentText>
        <form id="stock-adjustment-form" className="grid gap-3" onSubmit={onSubmit}>
          <TextField
            select
            id="modal-stock-product"
            label="Producto"
            value={adjustment.productId}
            onChange={(e) =>
              setAdjustment((prev) => ({ ...prev, productId: e.target.value }))
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

          <div className="grid grid-cols-2 gap-3">
            <TextField
              select
              id="modal-stock-movement"
              label="Tipo"
              value={adjustment.movementType}
              onChange={(e) =>
                setAdjustment((prev) => ({
                  ...prev,
                  movementType:
                    e.target.value as StockAdjustmentForm["movementType"],
                }))
              }
            >
              <MenuItem value="IN">Entrada</MenuItem>
              <MenuItem value="OUT">Salida</MenuItem>
              <MenuItem value="ADJUSTMENT">Ajuste</MenuItem>
            </TextField>
            <TextField
              id="modal-stock-qty"
              label="Cantidad"
              type="number"
              value={adjustment.quantity}
              onChange={(e) =>
                setAdjustment((prev) => ({ ...prev, quantity: e.target.value }))
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
        </form>
      </DialogContent>
      <DialogActions>
        <MuiButton type="button" variant="outlined" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </MuiButton>
        <MuiButton
          type="submit"
          form="stock-adjustment-form"
          variant="contained"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Movimiento
            </>
          )}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

type CustomerPickerModalProps = {
  isOpen: boolean;
  customerSearch: string;
  setCustomerSearch: Dispatch<SetStateAction<string>>;
  customerLoading: boolean;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onClose: () => void;
};

export function CustomerPickerModal({
  isOpen,
  customerSearch,
  setCustomerSearch,
  customerLoading,
  customers,
  onSelectCustomer,
  onClose,
}: CustomerPickerModalProps) {
  const customerColumns: GridColDef<Customer>[] = [
    {
      field: "tipoIdentificacion",
      headerName: "Tipo",
      minWidth: 90,
      flex: 0.5,
    },
    {
      field: "identificacion",
      headerName: "Identificacion",
      minWidth: 150,
      flex: 0.85,
      renderCell: (params) => (
        <span className="font-semibold text-[#4a3c58]">{params.row.identificacion}</span>
      ),
    },
    {
      field: "razonSocial",
      headerName: "Razon social",
      minWidth: 220,
      flex: 1.25,
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 200,
      flex: 1,
      valueGetter: (_, row) => row.email || "-",
    },
    {
      field: "telefono",
      headerName: "Telefono",
      minWidth: 140,
      flex: 0.85,
      valueGetter: (_, row) => row.telefono || "-",
    },
    {
      field: "purchaseCount",
      headerName: "Compras",
      type: "number",
      minWidth: 100,
      flex: 0.55,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "actions",
      headerName: "Accion",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      minWidth: 140,
      flex: 0.7,
      renderCell: (params) => (
        <MuiButton
          type="button"
          size="small"
          variant="contained"
          onClick={() => onSelectCustomer(params.row)}
        >
          <UserCheck className="mr-1.5 h-4 w-4" />
          Seleccionar
        </MuiButton>
      ),
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Buscar cliente</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3, color: "rgba(74, 60, 88, 0.7)" }}>
          Selecciona un cliente que ya compró antes o que fue registrado en ventas anteriores.
        </DialogContentText>

        <Stack spacing={3}>
          <TextField
            id="customer-search"
            label="Buscar por identificacion, nombre, email o telefono"
            placeholder="Ej: 0950..., GISMAR, cliente@correo.com"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />

          <Box sx={{ overflow: "hidden", borderRadius: "16px", border: "1px solid rgba(203, 213, 225, 0.8)", backgroundColor: "#fff" }}>
            <DataGrid
              rows={customers}
              columns={customerColumns}
              getRowId={(row) => row.id}
              loading={customerLoading}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[8, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 8 },
                },
              }}
              localeText={{
                noRowsLabel: "No se encontraron clientes con ese criterio.",
              }}
              sx={{
                ...modalDataGridSx,
                height: 430,
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <MuiButton type="button" variant="outlined" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Cerrar
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

type ProductPickerModalProps = {
  isOpen: boolean;
  productSearch: string;
  setProductSearch: Dispatch<SetStateAction<string>>;
  filteredProducts: Product[];
  selectedProductIds: string[];
  toggleProductSelection: (productId: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ProductPickerModal({
  isOpen,
  productSearch,
  setProductSearch,
  filteredProducts,
  selectedProductIds,
  toggleProductSelection,
  onCancel,
  onConfirm,
}: ProductPickerModalProps) {
  const selectionModel = useMemo<GridRowSelectionModel>(
    () => ({
      type: "include",
      ids: new Set(selectedProductIds),
    }),
    [selectedProductIds],
  );

  const productColumns: GridColDef<Product>[] = [
    {
      field: "codigo",
      headerName: "Codigo",
      minWidth: 130,
      flex: 0.75,
      renderCell: (params) => (
        <span className="font-semibold text-[#4a3c58]">{params.row.codigo}</span>
      ),
    },
    {
      field: "nombre",
      headerName: "Producto",
      minWidth: 240,
      flex: 1.35,
    },
    {
      field: "tipoProducto",
      headerName: "Tipo",
      minWidth: 125,
      flex: 0.65,
      valueFormatter: (value) => (value === "SERVICIO" ? "Servicio" : "Bien"),
    },
    {
      field: "precio",
      headerName: "Precio",
      type: "number",
      minWidth: 120,
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      field: "stock",
      headerName: "Stock",
      type: "number",
      minWidth: 120,
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="w-full text-right">
          {params.row.tipoProducto === "SERVICIO"
            ? "-"
            : Number(params.row.stock).toFixed(3)}
        </span>
      ),
    },
  ];

  function onSelectionChange(model: GridRowSelectionModel) {
    const nextIds = new Set(Array.from(model.ids, (id) => String(id)));
    const currentIds = new Set(selectedProductIds);
    const mergedIds = new Set([...currentIds, ...nextIds]);

    for (const id of mergedIds) {
      if (currentIds.has(id) !== nextIds.has(id)) {
        toggleProductSelection(id);
      }
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      fullWidth
      maxWidth="lg"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Seleccionar productos</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3, color: "rgba(74, 60, 88, 0.7)" }}>
          Busca, marca los productos y agregalos al detalle de la venta.
        </DialogContentText>
        <Stack spacing={3}>
          <TextField
            id="picker-search"
            label="Buscar producto"
            placeholder="Busca por codigo o nombre"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />

          <Box sx={{ overflow: "hidden", borderRadius: "16px", border: "1px solid rgba(203, 213, 225, 0.8)", backgroundColor: "#fff" }}>
            <DataGrid
              rows={filteredProducts}
              columns={productColumns}
              checkboxSelection
              keepNonExistentRowsSelected
              disableColumnMenu
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={onSelectionChange}
              pageSizeOptions={[8, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 8 },
                },
              }}
              localeText={{
                noRowsLabel: "No hay coincidencias con tu busqueda.",
              }}
              sx={{
                ...modalDataGridSx,
                height: 430,
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Box sx={{ px: 1, color: "rgba(74, 60, 88, 0.72)", fontSize: 14 }}>
          Seleccionados: {selectedProductIds.length}
        </Box>
        <Box sx={{ display: "flex", gap: 1.25 }}>
          <MuiButton type="button" variant="outlined" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </MuiButton>
          <MuiButton type="button" variant="contained" onClick={onConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Agregar al detalle
          </MuiButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

type InvoiceDetailModalProps = {
  isOpen: boolean;
  loading: boolean;
  cancelling: boolean;
  invoice: SriInvoiceDetail | null;
  onCancelSaleAndInvoice: (invoiceId: string) => void;
  onClose: () => void;
};

export function InvoiceDetailModal({
  isOpen,
  loading,
  cancelling,
  invoice,
  onCancelSaleAndInvoice,
  onClose,
}: InvoiceDetailModalProps) {
  const serviceInvoiceId = invoice?.externalInvoiceId ?? invoice?.id ?? "";
  const printableSaleId = invoice?.sale?.id ?? "";
  const isAuthorized = invoice?.status === "AUTHORIZED";
  const isCancelled = invoice?.sale?.status === "CANCELLED";
  const canDownloadXml = isAuthorized && Boolean(serviceInvoiceId);
  const canDownloadPdf = Boolean(printableSaleId);
  const formattedCreatedAt = invoice?.createdAt
    ? new Date(invoice.createdAt).toLocaleString("es-EC")
    : "-";
  const formattedAuthorizedAt = invoice?.authorizedAt
    ? new Date(invoice.authorizedAt).toLocaleString("es-EC")
    : "-";
  const invoiceItemsColumns: GridColDef<SriInvoiceDetail["sale"]["items"][number]>[] = [
    {
      field: "codigo",
      headerName: "Codigo",
      minWidth: 140,
      flex: 0.8,
      valueGetter: (_, row) => row.product.codigo,
      renderCell: (params) => (
        <span className="font-semibold text-[#4a3c58]">{params.row.product.codigo}</span>
      ),
    },
    {
      field: "producto",
      headerName: "Producto",
      minWidth: 240,
      flex: 1.4,
      valueGetter: (_, row) => row.product.nombre,
    },
    {
      field: "cantidad",
      headerName: "Cant",
      type: "number",
      minWidth: 110,
      flex: 0.6,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => Number(value).toFixed(3),
    },
    {
      field: "precioUnitario",
      headerName: "Precio Unit",
      type: "number",
      minWidth: 130,
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
    },
    {
      field: "total",
      headerName: "Total",
      type: "number",
      minWidth: 130,
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
      renderCell: (params) => (
        <span className="font-semibold text-[#4a3c58]">${Number(params.row.total).toFixed(2)}</span>
      ),
    },
  ];
  const invoiceItemsGridHeight = invoice
    ? Math.min(Math.max(invoice.sale.items.length * 52 + 58, 220), 420)
    : 220;

  return (
    <Dialog
      open={isOpen}
      onClose={loading || cancelling ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Box sx={{ fontSize: 20, fontWeight: 700, color: "#4a3c58", lineHeight: 1.2 }}>
              Detalle Factura SRI
            </Box>
            {!loading && invoice ? (
              <Box sx={{ mt: 0.5, fontSize: 14, color: "rgba(74, 60, 88, 0.7)" }}>
                Venta #{invoice.saleNumber}
                {invoice.documentFullNumber
                  ? ` · Factura ${invoice.documentFullNumber}`
                  : invoice.secuencial
                    ? ` · Factura ${invoice.secuencial}`
                    : ""}
              </Box>
            ) : null}
          </Box>
          <MuiButton variant="outlined" size="small" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </MuiButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, borderTop: 0, borderBottom: 0 }}>
        {loading ? (
          <Box sx={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", p: 6 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: "#4a3c58" }}>
              <CircularProgress size={18} thickness={5} />
              <span className="text-sm font-medium">Cargando detalle de factura...</span>
            </Stack>
          </Box>
        ) : !invoice ? (
          <Box sx={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", p: 6, color: "#64748b", fontSize: 14 }}>
            No se pudo cargar el detalle de la factura.
          </Box>
        ) : (
          <Box sx={{ overflowY: "auto", p: 3 }}>
          <div className="grid gap-6 md:grid-cols-2">
            <Paper className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4" elevation={0}>
              <h4 className="font-medium text-slate-800">Estado SRI</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado:</span>
                  <span className="font-semibold">{invoice.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado venta:</span>
                  <span className={isCancelled ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
                    {isCancelled ? "ANULADA" : "COMPLETADA"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Intentos:</span>
                  <span>{invoice.retryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documento:</span>
                  <span className="font-semibold">
                    {invoice.documentFullNumber ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Secuencial:</span>
                  <span className="font-semibold">{invoice.secuencial ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha registro:</span>
                  <span>{formattedCreatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha autorizacion:</span>
                  <span>{formattedAuthorizedAt}</span>
                </div>
                {/* {invoice.authorizationNumber && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">No. Autorizacion:</span>
                    <span className="break-all font-mono text-xs">{invoice.authorizationNumber}</span>
                  </div>
                )} */}
                {invoice.claveAcceso && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">Clave Acceso:</span>
                    <span className="break-all font-mono text-xs">{invoice.claveAcceso}</span>
                  </div>
                )}
                {invoice.lastError && (
                  <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                    <strong>Error:</strong> {invoice.lastError}
                  </div>
                )}
              </div>
            </Paper>

            <Paper className="space-y-3 rounded-lg border border-slate-100 bg-white p-4" elevation={0}>
              <h4 className="font-medium text-slate-800">Cliente</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Razon Social:</span>
                  <span className="font-semibold">{invoice.sale.customer.razonSocial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Identificacion:</span>
                  <span>{invoice.sale.customer.identificacion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span>{invoice.sale.customer.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Direccion:</span>
                  <span className="text-right">{invoice.sale.customer.direccion || "-"}</span>
                </div>
              </div>
            </Paper>
          </div>

          <section className="mt-6">
            <h4 className="mb-3 font-medium text-slate-800">Items de la Venta</h4>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <DataGrid
                rows={invoice.sale.items}
                columns={invoiceItemsColumns}
                getRowId={(row) => row.id}
                disableColumnMenu
                disableRowSelectionOnClick
                hideFooter
                sx={{
                  ...modalDataGridSx,
                  height: invoiceItemsGridHeight,
                  minHeight: invoiceItemsGridHeight,
                  "& .MuiDataGrid-footerContainer": {
                    display: "none",
                  },
                }}
              />
            </div>
          </section>

          <section className="mt-6 flex flex-col items-end gap-2 text-sm">
            <div className="flex w-full max-w-xs justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">Subtotal:</span>
              <span>${Number(invoice.sale.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">IVA:</span>
              <span>${Number(invoice.sale.taxTotal).toFixed(2)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between py-1 text-base font-bold text-emerald-700">
              <span>Total:</span>
              <span>${Number(invoice.sale.total).toFixed(2)}</span>
            </div>
          </section>

          <Paper className="mt-6 rounded-lg bg-slate-50 p-4" elevation={0}>
            <h4 className="mb-2 font-medium text-slate-800">Reimpresion de Comprobantes</h4>
            <div className="flex flex-wrap gap-2">
              <MuiButton
                type="button"
                variant="outlined"
                disabled={!canDownloadPdf}
                onClick={() => {
                  if (!canDownloadPdf) return;
                  window.open(`/api/v1/sales/${printableSaleId}/print`, "_blank", "noopener,noreferrer");
                }}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </MuiButton>
              <MuiButton
                type="button"
                variant="outlined"
                disabled={!canDownloadXml}
                onClick={() => {
                  if (!canDownloadXml) return;
                  window.open(`/api/v1/sri-invoices/${serviceInvoiceId}/xml`, "_blank", "noopener,noreferrer");
                }}
              >
                <FileCode2 className="h-4 w-4" />
                Descargar XML
              </MuiButton>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              El PDF puede reimprimirse desde la venta. El XML se habilita cuando la factura esta autorizada.
            </p>
          </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <MuiButton
            type="button"
            color="error"
            variant="contained"
            disabled={loading || !invoice || isCancelled || cancelling}
            onClick={() => {
              if (!invoice) return;
              void onCancelSaleAndInvoice(invoice.id);
            }}
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Anulando...
              </>
            ) : isCancelled ? (
              "Venta anulada"
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Anular venta/factura
              </>
            )}
          </MuiButton>
          <MuiButton onClick={onClose} variant="outlined">
            <X className="mr-2 h-4 w-4" />
            Cerrar Detalle
          </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
