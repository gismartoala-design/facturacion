import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { ArrowLeftRight } from "lucide-react";
import { useMemo } from "react";

import type { StockItem } from "@/components/mvp-dashboard-types";

type InventorySectionProps = {
  stock: StockItem[];
  onOpenStockModal: () => void;
};

export function InventorySection({
  stock,
  onOpenStockModal,
}: InventorySectionProps) {
  const lowStockCount = stock.filter((row) => row.lowStock).length;
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
    <Stack spacing={3}>
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

      <Paper sx={{ borderRadius: "28px", px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${stock.length} registros`}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  color: "#4a3c58",
                  backgroundColor: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(232, 213, 229, 0.78)",
                }}
              />
              <Chip
                label={`${lowStockCount} con stock bajo`}
                size="small"
                sx={{
                  borderRadius: "999px",
                  fontWeight: 700,
                  color: "#b45309",
                  backgroundColor: "rgba(255, 247, 237, 0.92)",
                  border: "1px solid rgba(252, 211, 77, 0.85)",
                }}
              />
            </Stack>

            <MuiButton
              type="button"
              variant="contained"
              onClick={onOpenStockModal}
              startIcon={<ArrowLeftRight className="h-4 w-4" />}
            >
              Ajustar stock
            </MuiButton>
          </Stack>

          <Box
            sx={{
              overflow: "hidden",
              borderRadius: "24px",
              border: "1px solid rgba(232, 213, 229, 0.7)",
              backgroundColor: "#fff",
            }}
          >
            <DataGrid
              rows={stock}
              columns={columns}
              getRowId={(row) => row.productId}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[9, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 9 },
                },
                sorting: {
                  sortModel: [{ field: "lowStock", sort: "desc" }],
                },
              }}
            />
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
