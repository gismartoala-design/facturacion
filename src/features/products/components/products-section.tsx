import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Product } from "@/components/mvp-dashboard-types";

type ProductsSectionProps = {
  products: Product[];
  onOpenProductModal: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

const PRODUCTS_PAGE_SIZE = 9;

const tableCellSx = {
  borderColor: "rgba(232, 213, 229, 0.65)",
  color: "#4a3c58",
  fontSize: 13,
} as const;

export function ProductsSection({
  products,
  onOpenProductModal,
  onEditProduct,
  onDeleteProduct,
}: ProductsSectionProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.nombre.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q) ||
        product.codigo.toLowerCase().includes(q),
    );
  }, [products, search]);

  const paginated = filtered.slice(
    page * PRODUCTS_PAGE_SIZE,
    page * PRODUCTS_PAGE_SIZE + PRODUCTS_PAGE_SIZE,
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <CardTitle className="text-[#4a3c58]">Productos</CardTitle>
          <CardDescription className="max-w-2xl text-[#4a3c58]/68">
            Administra catalogo, precios y referencias de venta desde un solo
            lugar.
          </CardDescription>
        </div>
      </div>

      <Card className="rounded-[28px]">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b1a1c6]" />
              <Input
                placeholder="Buscar por nombre, SKU o codigo..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="border-[#e8d5e5]/70 bg-[#fdfcf5]/75 pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              {search ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSearch("")}
                  className="border-[#e8d5e5]/80 text-[#4a3c58] hover:bg-[#fdfcf5]"
                >
                  Limpiar
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={onOpenProductModal}
                className="bg-[#4a3c58] text-white hover:bg-[#3d3249]"
              >
                Nuevo producto
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-[#e8d5e5]/70 bg-white">
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ backgroundColor: "transparent", maxHeight: 580 }}
            >
              <Table size="small" aria-label="Tabla de productos">
                <TableHead>
                  <TableRow>
                    {[
                      "Codigo",
                      "Nombre",
                      "Precio",
                      "IVA",
                      "Stock",
                      "Acciones",
                    ].map((label) => (
                      <TableCell
                        key={label}
                        sx={{
                          ...tableCellSx,
                          backgroundColor: "#fdf7fb",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                        align={
                          label === "Precio" ||
                          label === "IVA" ||
                          label === "Stock"
                            ? "right"
                            : "left"
                        }
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{
                          ...tableCellSx,
                          py: 5,
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {search
                          ? `Sin resultados para "${search}".`
                          : "Sin productos aun."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((product) => (
                      <TableRow
                        key={product.id}
                        hover
                        sx={{
                          "&:last-child td": { borderBottom: 0 },
                          "&:hover td": { backgroundColor: "#fffafc" },
                        }}
                      >
                        <TableCell sx={{ ...tableCellSx, fontWeight: 700 }}>
                          {product.codigo}
                        </TableCell>
                        <TableCell sx={tableCellSx}>{product.nombre}</TableCell>
                        <TableCell align="right" sx={tableCellSx}>
                          ${product.precio.toFixed(2)}
                        </TableCell>
                        <TableCell align="right" sx={tableCellSx}>
                          {product.tarifaIva}%
                        </TableCell>
                        <TableCell align="right" sx={tableCellSx}>
                          {product.stock.toFixed(3)}
                        </TableCell>
                        <TableCell sx={tableCellSx}>
                          <div className="flex items-center gap-1">
                            <IconButton
                              size="small"
                              onClick={() => onEditProduct(product)}
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
                              onClick={() => onDeleteProduct(product)}
                              sx={{
                                border: "1px solid rgba(254, 202, 202, 1)",
                                borderRadius: "10px",
                                color: "#b91c1c",
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              rowsPerPage={PRODUCTS_PAGE_SIZE}
              rowsPerPageOptions={[PRODUCTS_PAGE_SIZE]}
              labelRowsPerPage="Filas por pagina:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mas de ${to}`}`
              }
              sx={{
                borderTop: "1px solid rgba(232, 213, 229, 0.65)",
                color: "#4a3c58",
                ".MuiTablePagination-toolbar": {
                  minHeight: 56,
                  paddingInline: 16,
                },
                ".MuiSelect-select, .MuiTablePagination-displayedRows": {
                  fontSize: 13,
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
