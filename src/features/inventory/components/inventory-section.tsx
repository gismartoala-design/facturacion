import Chip from "@mui/material/Chip";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="space-y-4 p-2">
        <div className="space-y-1">
          <CardTitle className="text-[#4a3c58]">Inventario</CardTitle>
          <CardDescription className="max-w-2xl text-[#4a3c58]/68">
            Entradas, salidas y ajustes manuales con trazabilidad en tiempo real.
          </CardDescription>
        </div>
      </div>

      <Card className="rounded-[28px]">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-white/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/80">
                {stock.length} registros
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/85 px-3 py-1 text-xs font-medium text-amber-800">
                {lowStockCount} con stock bajo
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenStockModal}
            >
              Ajustar stock
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#e8d5e5]/70 bg-white">
            <DataGrid
              rows={stock}
              columns={columns}
              getRowId={(row) => row.productId}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[8, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 8 },
                },
                sorting: {
                  sortModel: [{ field: "lowStock", sort: "desc" }],
                },
              }}
              sx={{
                border: 0,
                minHeight: 400,
                backgroundColor: "transparent",
                color: "#4a3c58",
                "--DataGrid-containerBackground": "#fdf7fb",
                "& .MuiDataGrid-columnHeaders": {
                  borderBottom: "1px solid rgba(232, 213, 229, 0.65)",
                  minHeight: "40px !important",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 12,
                },
                "& .MuiDataGrid-cell": {
                  borderColor: "rgba(232, 213, 229, 0.65)",
                  fontSize: 12,
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#fffafc",
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTop: "1px solid rgba(232, 213, 229, 0.65)",
                },
                "& .MuiTablePagination-root, & .MuiDataGrid-selectedRowCount": {
                  color: "#4a3c58",
                },
                "& .MuiCheckbox-root": {
                  color: "#b1a1c6",
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
