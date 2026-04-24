"use client";

import { Button, Grid } from "@mui/material";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Ban, ClipboardList, Loader2, X } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

import type { Purchase } from "../types";

type PurchasesSectionProps = {
  purchases: Purchase[];
  onVoidPurchase: (purchase: Purchase) => void;
};

type VoidPurchaseDialogProps = {
  isOpen: boolean;
  purchase: Purchase | null;
  reason: string;
  saving: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const PURCHASES_PAGE_SIZE = 10;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function documentLabel(type: string) {
  switch (type) {
    case "FACTURA":
      return "Factura";
    case "NOTA_VENTA":
      return "Nota venta";
    case "LIQUIDACION":
      return "Liquidacion";
    default:
      return "Otro";
  }
}

function statusChip(status: Purchase["status"]) {
  if (status === "VOIDED") {
    return (
      <Chip
        label="Anulada"
        size="small"
        sx={{
          borderRadius: "999px",
          fontWeight: 800,
          color: "#991b1b",
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
        }}
      />
    );
  }

  return (
    <Chip
      label="Registrada"
      size="small"
      sx={{
        borderRadius: "999px",
        fontWeight: 800,
        color: "#047857",
        backgroundColor: "#ecfdf5",
        border: "1px solid #a7f3d0",
      }}
    />
  );
}

export function PurchasesSection({
  purchases,
  onVoidPurchase,
}: PurchasesSectionProps) {
  const columns = useMemo<GridColDef<Purchase>[]>(
    () => [
      {
        field: "purchaseNumber",
        headerName: "#",
        minWidth: 90,
        flex: 0.45,
        renderCell: (params) => (
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#23313b" }}>
            {params.row.purchaseNumber}
          </Typography>
        ),
      },
      {
        field: "issuedAt",
        headerName: "Fecha",
        minWidth: 120,
        flex: 0.65,
        valueFormatter: (value) => formatDate(String(value)),
      },
      {
        field: "supplierName",
        headerName: "Proveedor",
        minWidth: 260,
        flex: 1.4,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {params.row.supplierName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {params.row.supplierIdentification}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        minWidth: 190,
        flex: 1,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              {params.row.documentNumber}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {documentLabel(params.row.documentType)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "items",
        headerName: "Lineas",
        minWidth: 110,
        flex: 0.55,
        align: "center",
        headerAlign: "center",
        valueGetter: (_value, row) => row.items.length,
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
      },
      {
        field: "status",
        headerName: "Estado",
        minWidth: 120,
        flex: 0.65,
        renderCell: (params) => statusChip(params.row.status),
      },
      {
        field: "actions",
        headerName: "Acciones",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        minWidth: 110,
        flex: 0.55,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const isVoided = params.row.status === "VOIDED";

          return (
            <Tooltip
              title={
                isVoided
                  ? params.row.voidReason || "Compra anulada"
                  : "Anular compra"
              }
            >
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={isVoided}
                  onClick={() => onVoidPurchase(params.row)}
                  sx={{
                    border: "1px solid rgba(254, 202, 202, 1)",
                    borderRadius: "10px",
                  }}
                >
                  <Ban className="h-3.5 w-3.5" />
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      },
    ],
    [onVoidPurchase],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="Compras Registradas"
          description="Consulta las compras que ya generaron ingreso de inventario."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid size={12}>
        <Card className="rounded-[20px]">
          <CardContent>
            <DataGrid
              rows={purchases}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[PURCHASES_PAGE_SIZE, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: PURCHASES_PAGE_SIZE,
                  },
                },
              }}
              localeText={{
                noRowsLabel: "Sin compras registradas aun.",
              }}
              sx={{
                height: 520,
                "& .MuiDataGrid-cell": {
                  fontSize: 13,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 13,
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export function VoidPurchaseDialog({
  isOpen,
  purchase,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: VoidPurchaseDialogProps) {
  const canConfirm = reason.trim().length >= 5;

  return (
    <Dialog
      open={isOpen}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(35, 49, 59, 0.30)",
            backdropFilter: "blur(4px)",
          },
        },
      }}
    >
      <DialogTitle>Anular Compra</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Esta acción marcará la compra #{purchase?.purchaseNumber ?? ""} como
            anulada y generará salidas de inventario por los productos tipo bien.
          </Typography>

          <TextField
            label="Motivo de anulación"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            required
            multiline
            minRows={3}
            autoFocus
            fullWidth
            helperText="Escribe al menos 5 caracteres para dejar trazabilidad."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={saving}
          startIcon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={saving || !canConfirm}
          startIcon={
            saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )
          }
        >
          {saving ? "Anulando..." : "Anular compra"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
