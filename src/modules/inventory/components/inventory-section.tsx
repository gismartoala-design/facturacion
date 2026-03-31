import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ArrowLeftRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { StockItem } from "@/shared/dashboard/types";

type InventorySectionProps = {
  stock: StockItem[];
  onOpenStockModal: () => void;
};

export function InventorySection({
  stock,
  onOpenStockModal,
}: InventorySectionProps) {
  const [search, setSearch] = useState("");
  const filteredStock = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return stock;
    }

    return stock.filter(
      (row) =>
        row.codigo.toLowerCase().includes(normalized) ||
        row.productName.toLowerCase().includes(normalized),
    );
  }, [search, stock]);

  const columns = useMemo<GridColDef<StockItem>[]>(
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
        field: "productName",
        headerName: "Producto",
        minWidth: 260,
        flex: 1.6,
      },
      {
        field: "quantity",
        headerName: "Stock",
        type: "number",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "minQuantity",
        headerName: "Minimo",
        type: "number",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => Number(value).toFixed(3),
      },
      {
        field: "lowStock",
        headerName: "Estado",
        minWidth: 150,
        flex: 0.8,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Chip
            label={params.row.lowStock ? "Stock bajo" : "OK"}
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              ...(params.row.lowStock
                ? {
                    backgroundColor: "#fff3e0",
                    color: "#b45309",
                    border: "1px solid #fcd34d",
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
    ],
    [],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={0.75}>
            <Typography
              variant="h5"
              sx={{ color: "#4a3c58", fontWeight: 700, lineHeight: 1.15 }}
            >
              Inventario
            </Typography>
            <Typography
              sx={{
                maxWidth: 720,
                color: "rgba(74, 60, 88, 0.68)",
                fontSize: 14,
              }}
            >
              Entradas, salidas y ajustes manuales con trazabilidad en tiempo
              real.
            </Typography>
          </Stack>
        </Box>
      </Grid>

      <Grid size={12}>
        <Paper
          sx={{
            borderRadius: "28px",
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Grid container spacing={2.5}>
            <Grid size={12}>
              <Grid
                container
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Grid size={{ xs: 12, md: "grow" }}>
                  <Grid
                    container
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                  >
                    <Grid size={{ xs: 12, sm: "grow" }}>
                      <Box sx={{ position: "relative", width: "100%", maxWidth: 360 }}>
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b1a1c6]" />
                        <Input
                          placeholder="Buscar por codigo o producto..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="border-[#e8d5e5]/70 bg-[#fdfcf5]/75 pl-9"
                        />
                      </Box>
                    </Grid>

                    {search ? (
                      <Grid size={{ xs: 12, sm: "auto" }}>
                        <MuiButton
                          type="button"
                          variant="outlined"
                          onClick={() => setSearch("")}
                        >
                          Limpiar
                        </MuiButton>
                      </Grid>
                    ) : null}
                  </Grid>
                </Grid>

                <Grid size={{ xs: 12, md: "auto" }}>
                  <MuiButton
                    type="button"
                    variant="contained"
                    onClick={onOpenStockModal}
                    startIcon={<ArrowLeftRight className="h-4 w-4" />}
                  >
                    Ajustar stock
                  </MuiButton>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={12}>
              <Box>
                <DataGrid
                  rows={filteredStock}
                  columns={columns}
                  getRowId={(row) => row.productId}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{
                    pagination: {
                      paginationModel: { page: 0, pageSize: 10 },
                    },
                    sorting: {
                      sortModel: [{ field: "lowStock", sort: "desc" }],
                    },
                  }}
                  localeText={{
                    noRowsLabel: search
                      ? `Sin resultados para "${search}".`
                      : "Sin registros de inventario aun.",
                  }}
                  sx={{
                    height: 580,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
}
