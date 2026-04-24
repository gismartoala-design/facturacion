"use client";

import Box from "@mui/material/Box";
import { Button, Grid, Input } from "@mui/material";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Pencil, Search, Store, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";

import type { Supplier } from "../types";

type SuppliersSectionProps = {
  suppliers: Supplier[];
  onOpenSupplierModal: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
};

const SUPPLIERS_PAGE_SIZE = 10;

function formatSupplierName(supplier: Supplier) {
  return supplier.nombreComercial || supplier.razonSocial;
}

export function SuppliersSection({
  suppliers,
  onOpenSupplierModal,
  onEditSupplier,
  onDeleteSupplier,
}: SuppliersSectionProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;

    return suppliers.filter(
      (supplier) =>
        supplier.identificacion.toLowerCase().includes(q) ||
        supplier.razonSocial.toLowerCase().includes(q) ||
        (supplier.nombreComercial ?? "").toLowerCase().includes(q) ||
        (supplier.contactoPrincipal ?? "").toLowerCase().includes(q) ||
        (supplier.email ?? "").toLowerCase().includes(q) ||
        (supplier.telefono ?? "").toLowerCase().includes(q),
    );
  }, [search, suppliers]);

  const columns = useMemo<GridColDef<Supplier>[]>(
    () => [
      {
        field: "identificacion",
        headerName: "Identificacion",
        minWidth: 150,
        flex: 0.8,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#23313b" }}>
              {params.row.identificacion}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              {params.row.tipoIdentificacion === "04" ? "RUC" : "Documento"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "razonSocial",
        headerName: "Proveedor",
        minWidth: 260,
        flex: 1.5,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#23313b" }}>
              {formatSupplierName(params.row)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {params.row.nombreComercial
                ? params.row.razonSocial
                : "Sin nombre comercial"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "contactoPrincipal",
        headerName: "Contacto",
        minWidth: 200,
        flex: 1.1,
        renderCell: (params) => (
          <Stack spacing={0.2}>
            <Typography sx={{ fontSize: 13 }}>
              {params.row.contactoPrincipal || "-"}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {params.row.telefono || params.row.email || "Sin contacto"}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "direccion",
        headerName: "Direccion",
        minWidth: 220,
        flex: 1.1,
        renderCell: (params) => (
          <Typography
            sx={{
              fontSize: 12.5,
              color: params.row.direccion ? "text.primary" : "text.secondary",
              whiteSpace: "normal",
              lineHeight: 1.35,
            }}
          >
            {params.row.direccion || "-"}
          </Typography>
        ),
      },
      {
        field: "diasCredito",
        headerName: "Credito",
        type: "number",
        minWidth: 120,
        flex: 0.65,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Chip
            label={
              params.row.diasCredito > 0
                ? `${params.row.diasCredito} dias`
                : "Contado"
            }
            size="small"
            sx={{
              borderRadius: "999px",
              fontWeight: 700,
              backgroundColor:
                params.row.diasCredito > 0 ? "#fef3c7" : "#ecfdf5",
              color: params.row.diasCredito > 0 ? "#92400e" : "#047857",
              border:
                params.row.diasCredito > 0
                  ? "1px solid #fde68a"
                  : "1px solid #a7f3d0",
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
        minWidth: 130,
        flex: 0.7,
        renderCell: (params) => (
          <div className="flex items-center gap-1">
            <IconButton
              size="small"
              onClick={() => onEditSupplier(params.row)}
              sx={{
                border: "1px solid rgba(148, 163, 184, 0.45)",
                borderRadius: "10px",
                color: "#23313b",
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDeleteSupplier(params.row)}
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
    [onDeleteSupplier, onEditSupplier],
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<Truck className="h-4.5 w-4.5" />}
          title="Proveedores"
          description="Administra la cartera base para registrar compras, credito y abastecimiento."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      <Grid size={12}>
        <Card className="rounded-[20px]">
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
                    <Box sx={{ position: "relative", width: "100%", maxWidth: 360 }}>
                      <Input
                        placeholder="Buscar por RUC, razon social o contacto..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        startAdornment={<Search className="h-4 w-4" />}
                        fullWidth
                        sx={{
                          backgroundColor: "rgba(241, 245, 249, 0.85)",
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
                          onClick={onOpenSupplierModal}
                          startIcon={<Store className="h-4 w-4" />}
                        >
                          Nuevo proveedor
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
                  pageSizeOptions={[SUPPLIERS_PAGE_SIZE, 15, 25]}
                  initialState={{
                    pagination: {
                      paginationModel: {
                        page: 0,
                        pageSize: SUPPLIERS_PAGE_SIZE,
                      },
                    },
                  }}
                  localeText={{
                    noRowsLabel: search
                      ? `Sin resultados para "${search}".`
                      : "Sin proveedores aun.",
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
