import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import type {
  PaginationMeta,
  SriInvoice,
} from "@/components/mvp-dashboard-types";

const SRI_STATUS_LABELS: Record<string, string> = {
  NOT_AUTHORIZED: "No autorizadas",
  ALL: "Todas",
  DRAFT: "Borrador",
  AUTHORIZED: "Autorizadas",
  PENDING_SRI: "Pendiente SRI",
  ERROR: "Con error",
};

type SriSectionProps = {
  loading: boolean;
  invoices: SriInvoice[];
  pagination: PaginationMeta;
  statusFilter: string;
  saving: boolean;
  onRetry: (invoiceId: string) => void;
  onViewDetails: (invoiceId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (value: string) => void;
};

const tableCellSx = {
  borderColor: "rgba(232, 213, 229, 0.65)",
  color: "#4a3c58",
  fontSize: 13,
} as const;

const SRI_LOADING_ROWS = 5;

function statusChipStyles(status: string) {
  if (status === "AUTHORIZED") {
    return {
      backgroundColor: "#ecfdf3",
      color: "#15803d",
      border: "1px solid #86efac",
    };
  }

  if (status === "ERROR") {
    return {
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fca5a5",
    };
  }

  if (status === "PENDING_SRI") {
    return {
      backgroundColor: "#fff7ed",
      color: "#c2410c",
      border: "1px solid #fdba74",
    };
  }

  return {
    backgroundColor: "#f8fafc",
    color: "#475569",
    border: "1px solid #cbd5e1",
  };
}

export function SriSection({
  loading,
  invoices,
  pagination,
  statusFilter,
  saving,
  onRetry,
  onViewDetails,
  onPageChange,
  onFilterChange,
}: SriSectionProps) {
  const canRetry = (invoice: SriInvoice) =>
    (invoice.status === "PENDING_SRI" || invoice.status === "ERROR") &&
    invoice.saleStatus !== "CANCELLED";

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <CardTitle className="text-[#4a3c58]">Facturas SRI</CardTitle>
          <CardDescription className="max-w-2xl text-[#4a3c58]/68">
            Seguimiento de documentos, errores y reintentos de facturacion
            electronica.
          </CardDescription>
        </div>
      </div>

      <Card className="rounded-[28px]">
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-white/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/80">
                {SRI_STATUS_LABELS[statusFilter] ?? statusFilter}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#e8d5e5]/75 bg-[#fdfcf5]/85 px-3 py-1 text-xs font-medium text-[#4a3c58]/72">
                Pagina {pagination.page} de {pagination.totalPages || 1}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-[#e8d5e5] bg-[#fdfcf5] px-3 text-sm text-[#4a3c58] transition-all focus:outline-none focus:ring-2 focus:ring-[#b1a1c6]"
                value={statusFilter}
                onChange={(e) => onFilterChange(e.target.value)}
                disabled={loading}
              >
                <option value="NOT_AUTHORIZED">No autorizadas</option>
                <option value="ALL">Todas</option>
                <option value="DRAFT">Borrador</option>
                <option value="PENDING_SRI">Pendiente SRI</option>
                <option value="AUTHORIZED">Autorizadas</option>
                <option value="ERROR">Con error</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-[#e8d5e5]/70 bg-white">
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ backgroundColor: "transparent" }}
            >
              <Table size="small" aria-label="Tabla de facturas SRI">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        ...tableCellSx,
                        backgroundColor: "#fdf7fb",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Venta
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableCellSx,
                        backgroundColor: "#fdf7fb",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Estado
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableCellSx,
                        backgroundColor: "#fdf7fb",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Intentos
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableCellSx,
                        backgroundColor: "#fdf7fb",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Observacion
                    </TableCell>
                    <TableCell
                      sx={{
                        ...tableCellSx,
                        backgroundColor: "#fdf7fb",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: SRI_LOADING_ROWS }).map((_, index) => (
                        <TableRow key={`sri-loading-${index}`}>
                          <TableCell sx={tableCellSx}>
                            <Skeleton
                              variant="text"
                              width="70%"
                              sx={{ bgcolor: "#f3e8f0" }}
                            />
                          </TableCell>
                          <TableCell sx={tableCellSx}>
                            <Skeleton
                              variant="rounded"
                              width={110}
                              height={28}
                              sx={{ bgcolor: "#f3e8f0" }}
                            />
                          </TableCell>
                          <TableCell sx={tableCellSx}>
                            <Skeleton
                              variant="text"
                              width={40}
                              sx={{ bgcolor: "#f3e8f0" }}
                            />
                          </TableCell>
                          <TableCell sx={tableCellSx}>
                            <Skeleton
                              variant="text"
                              width="85%"
                              sx={{ bgcolor: "#f3e8f0" }}
                            />
                          </TableCell>
                          <TableCell sx={tableCellSx}>
                            <div className="flex gap-2">
                              <Skeleton
                                variant="rounded"
                                width={100}
                                height={32}
                                sx={{ bgcolor: "#f3e8f0" }}
                              />
                              <Skeleton
                                variant="rounded"
                                width={72}
                                height={32}
                                sx={{ bgcolor: "#f3e8f0" }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : invoices.length === 0
                      ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              sx={{
                                ...tableCellSx,
                                py: 5,
                                textAlign: "center",
                                color: "#64748b",
                              }}
                            >
                              No hay facturas para este filtro.
                            </TableCell>
                          </TableRow>
                        )
                      : invoices.map((invoice) => (
                          <TableRow
                            key={invoice.id}
                            hover
                            sx={{
                              "&:last-child td": { borderBottom: 0 },
                              "&:hover td": { backgroundColor: "#fffafc" },
                            }}
                          >
                            <TableCell sx={{ ...tableCellSx, fontWeight: 700 }}>
                              Venta #{invoice.saleNumber}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              <Chip
                                label={
                                  SRI_STATUS_LABELS[invoice.status] ??
                                  invoice.status
                                }
                                size="small"
                                sx={{
                                  borderRadius: "999px",
                                  fontWeight: 700,
                                  ...statusChipStyles(invoice.status),
                                }}
                              />
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              {invoice.retryCount}
                              {invoice.saleStatus === "CANCELLED"
                                ? " · Anulada"
                                : ""}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              {invoice.lastError || "Sin novedades"}
                            </TableCell>
                            <TableCell sx={tableCellSx}>
                              <div className="flex flex-wrap items-center gap-2">
                                {canRetry(invoice) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onRetry(invoice.id)}
                                    disabled={saving}
                                  >
                                    <RefreshCcw className="h-4 w-4" /> Reintentar
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => onViewDetails(invoice.id)}
                                >
                                  Ver
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={pagination.total}
                page={Math.max(0, pagination.page - 1)}
                onPageChange={(_, nextPage) => onPageChange(nextPage + 1)}
                rowsPerPage={pagination.limit}
                rowsPerPageOptions={[pagination.limit]}
                labelRowsPerPage="Filas por pagina:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `mas de ${to}`}`
                }
                sx={{
                  borderTop: "1px solid rgba(232, 213, 229, 0.65)",
                  color: "#4a3c58",
                  ".MuiSelect-select, .MuiTablePagination-displayedRows": {
                    fontSize: 13,
                  },
                }}
              />
            </TableContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
