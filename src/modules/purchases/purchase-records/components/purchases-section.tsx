"use client";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  Ban,
  ClipboardList,
  Loader2,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

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

const PAPER_SX = {
  borderRadius: "20px",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  backgroundColor: "#fff",
  p: 2.5,
} as const;

function currency(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastMonthRange(): [string, string] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

function firstDayOfCurrentYear() {
  return `${new Date().getFullYear()}-01-01`;
}

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  iconColor?: string;
};

function KpiCard({ icon, label, value, sub, iconColor = "#64748b" }: KpiCardProps) {
  return (
    <Paper elevation={0} sx={PAPER_SX}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ color: iconColor, width: 20, height: 20 }}
          >
            {icon}
          </Stack>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{sub}</Typography>
      </Stack>
    </Paper>
  );
}

const PURCHASES_PAGE_SIZE = 10;

export function PurchasesSection({ purchases, onVoidPurchase }: PurchasesSectionProps) {
  const [dateFrom, setDateFrom] = useState(firstDayOfCurrentMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  const filteredPurchases = useMemo(() => {
    const from = dateFrom || "0000-01-01";
    const to = dateTo || "9999-12-31";
    return purchases.filter((p) => {
      const date = p.issuedAt.slice(0, 10);
      return date >= from && date <= to;
    });
  }, [purchases, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const active = filteredPurchases.filter((p) => p.status === "POSTED");
    const voided = filteredPurchases.filter((p) => p.status === "VOIDED");
    return {
      total: active.reduce((sum, p) => sum + p.total, 0),
      taxTotal: active.reduce((sum, p) => sum + p.taxTotal, 0),
      activeCount: active.length,
      voidedCount: voided.length,
    };
  }, [filteredPurchases]);

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
                isVoided ? params.row.voidReason || "Compra anulada" : "Anular compra"
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
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="Compras registradas"
          description="Reporte operativo de compras por período. Filtra por fecha para ver el gasto, el IVA pagado y el estado de cada documento."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      {/* Filtro de período */}
      <Grid size={12}>
        <Paper elevation={0} sx={PAPER_SX}>
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Período
            </Typography>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 12, sm: 5, md: 3 }}>
                <TextField
                  label="Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5, md: 3 }}>
                <TextField
                  label="Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: "grow" }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDateFrom(firstDayOfCurrentMonth());
                      setDateTo(todayStr());
                    }}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  >
                    Este mes
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const [from, to] = lastMonthRange();
                      setDateFrom(from);
                      setDateTo(to);
                    }}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  >
                    Mes anterior
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDateFrom(firstDayOfCurrentYear());
                      setDateTo(todayStr());
                    }}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  >
                    Este año
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    sx={{ borderRadius: "999px", fontWeight: 700 }}
                  >
                    Todo
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Total comprado"
          value={currency(kpis.total)}
          sub={`${kpis.activeCount} compra${kpis.activeCount !== 1 ? "s" : ""} activa${kpis.activeCount !== 1 ? "s" : ""}`}
          iconColor="#0ea5e9"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<ReceiptText size={16} />}
          label="IVA pagado"
          value={currency(kpis.taxTotal)}
          sub="Sobre compras activas del período"
          iconColor="#8b5cf6"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<ShoppingCart size={16} />}
          label="Compras activas"
          value={String(kpis.activeCount)}
          sub={`de ${filteredPurchases.length} documento${filteredPurchases.length !== 1 ? "s" : ""} en el período`}
          iconColor="#10b981"
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KpiCard
          icon={<Ban size={16} />}
          label="Anuladas"
          value={String(kpis.voidedCount)}
          sub={
            kpis.voidedCount === 0
              ? "Sin anulaciones en el período"
              : `${Math.round((kpis.voidedCount / filteredPurchases.length) * 100)}% del total`
          }
          iconColor={kpis.voidedCount > 0 ? "#ef4444" : "#94a3b8"}
        />
      </Grid>

      {/* Tabla */}
      <Grid size={12}>
        <Card className="rounded-[20px]">
          <CardContent>
            <DataGrid
              rows={filteredPurchases}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              disableColumnMenu
              pageSizeOptions={[PURCHASES_PAGE_SIZE, 15, 25]}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: PURCHASES_PAGE_SIZE },
                },
              }}
              localeText={{
                noRowsLabel: "Sin compras en el período seleccionado.",
              }}
              sx={{
                height: 520,
                "& .MuiDataGrid-cell": { fontSize: 13 },
                "& .MuiDataGrid-columnHeaderTitle": { fontSize: 13 },
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
            Esta acción marcará la compra #{purchase?.purchaseNumber ?? ""} como anulada
            y generará salidas de inventario por los productos tipo bien.
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
