import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { Button, Grid, Input } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { matchesScaleBarcodePrefix } from "@/lib/utils";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import type { Product } from "@/shared/dashboard/types";

type ProductsSectionProps = {
  products: Product[];
  onOpenProductModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

const PRODUCTS_PAGE_SIZE = 10;

export function ProductsSection({
  products,
  onOpenProductModal,
  onEditProduct,
  onDeleteProduct,
}: ProductsSectionProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;

    return products.filter(
      (product) =>
        product.nombre.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q) ||
        (product.codigoBarras ?? "").toLowerCase().includes(q) ||
        matchesScaleBarcodePrefix(
          q,
          product.codigoBarras ?? product.codigo ?? product.sku,
        ) ||
        product.codigo.toLowerCase().includes(q) ||
        product.tipoProducto.toLowerCase().includes(q),
    );
  }, [products, search]);

  const columns = useMemo<GridColDef<Product>[]>(
    () => [
      {
        field: "codigo",
        headerName: "Codigo",
        minWidth: 150,
        flex: 0.9,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            {params.row.codigo}
          </span>
        ),
      },
      {
        field: "codigoBarras",
        headerName: "Barra / prefijo",
        minWidth: 160,
        flex: 1,
        renderCell: (params) => (
          <Typography
            sx={{
              fontSize: 12.5,
              color: params.row.codigoBarras
                ? "text.primary"
                : "text.secondary",
            }}
          >
            {params.row.codigoBarras || "-"}
          </Typography>
        ),
      },
      {
        field: "nombre",
        headerName: "Nombre",
        minWidth: 260,
        flex: 1.6,
      },
      {
        field: "tipoProducto",
        headerName: "Tipo",
        minWidth: 135,
        flex: 0.7,
        renderCell: (params) => (
          <Chip
            label={params.row.tipoProducto === "SERVICIO" ? "Servicio" : "Bien"}
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              ...(params.row.tipoProducto === "SERVICIO"
                ? {
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                  }
                : {
                    backgroundColor: "#ecfdf3",
                    color: "#15803d",
                    border: "1px solid #86efac",
                  }),
            }}
          />
        ),
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
        field: "tarifaIva",
        headerName: "IVA",
        type: "number",
        minWidth: 110,
        flex: 0.55,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => `${Number(value)}%`,
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
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 140,
        flex: 0.85,
        renderCell: (params) => (
          <div className="flex items-center gap-1">
            <IconButton
              size="small"
              onClick={() => onEditProduct(params.row)}
              sx={{
                border: "1px solid rgba(232, 213, 229, 0.85)",
                borderRadius: "10px",
                color: "#4a3c58",
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDeleteProduct(params.row)}
              sx={{
                border: "1px solid rgba(254, 202, 202, 1)",
                borderRadius: "10px",
                color: "#b91c1c",
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ),
      },
    ],
    [onDeleteProduct, onEditProduct],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<PackagePlus className="h-4.5 w-4.5" />}
          title="Productos"
          description="Administra catalogo, precios y referencias de venta desde un solo lugar."
          // titleColor="#4a3c58"
          // descriptionColor="rgba(74, 60, 88, 0.68)"
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid size={12}>
        <Card className="rounded-[28px]">
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Grid
                  container
                  spacing={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Grid size={{ xs: 12, md: "grow" }}>
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        maxWidth: 320,
                      }}
                    >
                      {/* <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" /> */}
                      <Input
                        placeholder="Buscar por nombre, SKU, codigo o barras..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        startAdornment={<Search className="h-4 w-4" />}
                        fullWidth
                        sx={{
                          // borderRadius: "999px",
                          backgroundColor: "rgba(241, 245, 249, 0.8)",
                          "& .MuiInputBase-input": {
                            fontSize: 13,
                            py: 1.25,
                            pl: 1.25,
                          },
                        }}
                      />
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: "auto" }}>
                    <Grid
                      container
                      spacing={1}
                      justifyContent={{ xs: "stretch", md: "flex-end" }}
                    >
                      {search ? (
                        <Grid size={{ xs: 12, sm: "auto" }}>
                          <Button
                            onClick={() => setSearch("")}
                            startIcon={<Trash2 className="h-4 w-4" />}
                            fullWidth
                          >
                            Limpiar
                          </Button>
                        </Grid>
                      ) : null}
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={onOpenProductModal}
                          startIcon={<PackagePlus className="h-4 w-4" />}
                        >
                          Nuevo producto
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={12}>
                <DataGrid
                  rows={filtered}
                  columns={columns}
                  getRowId={(row) => row.id}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  pageSizeOptions={[PRODUCTS_PAGE_SIZE, 15, 25]}
                  initialState={{
                    pagination: {
                      paginationModel: {
                        page: 0,
                        pageSize: PRODUCTS_PAGE_SIZE,
                      },
                    },
                  }}
                  localeText={{
                    noRowsLabel: search
                      ? `Sin resultados para "${search}".`
                      : "Sin productos aun.",
                  }}
                  sx={{
                    height: 600,
                    "& .MuiDataGrid-cell": {
                      fontSize: 13,
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                      fontSize: 13,
                    },
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
