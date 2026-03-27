"use client";

import Box from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { FileUp, X } from "lucide-react";
import { useMemo } from "react";

import type { Quote } from "@/shared/dashboard/types";

type OpenQuotesDialogProps = {
  isOpen: boolean;
  loading: boolean;
  saving: boolean;
  quotes: Quote[];
  onClose: () => void;
  onLoadQuote: (quoteId: string) => void;
};

const dialogBackdropProps = {
  backdrop: {
    sx: {
      backgroundColor: "rgba(74, 60, 88, 0.30)",
      backdropFilter: "blur(4px)",
    },
  },
} as const;

export function OpenQuotesDialog({
  isOpen,
  loading,
  saving,
  quotes,
  onClose,
  onLoadQuote,
}: OpenQuotesDialogProps) {
  const columns = useMemo<GridColDef<Quote>[]>(
    () => [
      {
        field: "quoteNumber",
        headerName: "No.",
        minWidth: 120,
        flex: 0.75,
        renderCell: (params) => (
          <span className="font-semibold text-[#4a3c58]">
            #{params.row.quoteNumber}
          </span>
        ),
      },
      {
        field: "customerName",
        headerName: "Cliente",
        minWidth: 220,
        flex: 1.3,
      },
      {
        field: "fechaEmision",
        headerName: "Fecha",
        minWidth: 130,
        flex: 0.8,
      },
      {
        field: "total",
        headerName: "Total",
        type: "number",
        minWidth: 120,
        flex: 0.7,
        align: "right",
        headerAlign: "right",
        valueFormatter: (value) => `$${Number(value).toFixed(2)}`,
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 130,
        flex: 0.8,
        renderCell: () => (
          <Chip
            label="Abierta"
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              backgroundColor: "#fff7ed",
              color: "#c2410c",
              border: "1px solid #fdba74",
            }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 170,
        flex: 0.9,
        renderCell: (params) => (
          <MuiButton
            type="button"
            size="small"
            variant="contained"
            disabled={saving}
            startIcon={<FileUp className="h-4 w-4" />}
            onClick={() => onLoadQuote(params.row.id)}
          >
            Cargar
          </MuiButton>
        ),
      },
    ],
    [onLoadQuote, saving],
  );

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      slotProps={dialogBackdropProps}
    >
      <DialogTitle>Cargar cotización abierta</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 3, color: "rgba(74, 60, 88, 0.7)" }}>
          Selecciona una cotización abierta para poblar el formulario y continuar
          solo con la facturación.
        </DialogContentText>
        <Box
          sx={{
            overflow: "hidden",
            borderRadius: "16px",
            border: "1px solid rgba(203, 213, 225, 0.8)",
            backgroundColor: "#fff",
          }}
        >
          <DataGrid
            rows={quotes}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            disableRowSelectionOnClick
            disableColumnMenu
            pageSizeOptions={[8, 15, 25]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 8 },
              },
            }}
            localeText={{
              noRowsLabel: "No hay cotizaciones abiertas disponibles.",
            }}
            sx={{
              minHeight: 430,
              "& .MuiDataGrid-cell": { fontSize: 13 },
              "& .MuiDataGrid-columnHeaderTitle": { fontSize: 13 },
            }}
          />
        </Box>
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
