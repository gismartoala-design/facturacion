"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Download, Upload } from "lucide-react";
import { useMemo, type ChangeEvent, type RefObject } from "react";

import type { AccountImportResponse } from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";
import type {
  ParsedAccountingImportResult,
  ParsedAccountingImportRow,
} from "../services/accounting-account-import";

type AccountImportDialogProps = {
  open: boolean;
  importing: boolean;
  overwriteExisting: boolean;
  importFileName: string;
  importPreview: ParsedAccountingImportResult | null;
  importResult: AccountImportResponse | null;
  importFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onOverwriteExistingChange: (checked: boolean) => void;
  onDownloadTemplate: () => void;
  onFileSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
  formatCompactNumber: (value: number) => string;
};

export function AccountImportDialog({
  open,
  importing,
  overwriteExisting,
  importFileName,
  importPreview,
  importResult,
  importFileInputRef,
  onClose,
  onOverwriteExistingChange,
  onDownloadTemplate,
  onFileSelected,
  onSubmit,
  formatCompactNumber,
}: AccountImportDialogProps) {
  const columns = useMemo<GridColDef<ParsedAccountingImportRow>[]>(
    () => [
      {
        field: "lineNumber",
        headerName: "Fila",
        width: 80,
      },
      {
        field: "code",
        headerName: "Codigo",
        width: 120,
      },
      {
        field: "name",
        headerName: "Cuenta",
        minWidth: 220,
        flex: 1.25,
      },
      {
        field: "groupKey",
        headerName: "Grupo",
        width: 110,
      },
      {
        field: "defaultNature",
        headerName: "Naturaleza",
        width: 120,
      },
      {
        field: "parentCode",
        headerName: "Padre",
        width: 120,
        valueFormatter: (value: string | null) => value ?? "Raiz",
      },
      {
        field: "acceptsPostings",
        headerName: "Postable",
        width: 100,
        valueFormatter: (value: boolean) => (value ? "Si" : "No"),
      },
      {
        field: "active",
        headerName: "Activa",
        width: 90,
        valueFormatter: (value: boolean) => (value ? "Si" : "No"),
      },
    ],
    [],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: "24px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.75 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.4}>
            <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 700 }}>
              Importar plan de cuentas
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: 13.5 }}>
              Carga un CSV para crear cuentas nuevas o actualizar cuentas propias
              existentes.
            </Typography>
          </Stack>
          <Button
            type="button"
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={onDownloadTemplate}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          >
            Descargar plantilla
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.25 }}>
        <Stack spacing={2}>
          <Alert severity="info" variant="outlined" sx={{ borderRadius: "18px" }}>
            Columnas requeridas: <strong>code</strong>, <strong>name</strong>,
            <strong>groupKey</strong>, <strong>defaultNature</strong>. Opcionales:
            parentCode, acceptsPostings, active, description.
          </Alert>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Stack spacing={0.5}>
              <Typography sx={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>
                Archivo seleccionado
              </Typography>
              <Typography sx={{ color: "#64748b", fontSize: 13 }}>
                {importFileName || "Aun no se ha cargado un archivo"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(event) => {
                  void onFileSelected(event);
                }}
              />
              <Button
                type="button"
                variant="outlined"
                startIcon={<Upload size={16} />}
                onClick={() => importFileInputRef.current?.click()}
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              >
                Cargar CSV
              </Button>
            </Stack>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={overwriteExisting}
                onChange={(event) => onOverwriteExistingChange(event.target.checked)}
              />
            }
            label="Actualizar cuentas existentes no sistemicas"
          />

          {importPreview ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${formatCompactNumber(importPreview.rows.length)} filas validas`}
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`${formatCompactNumber(importPreview.errors.length)} filas con error`}
                color={importPreview.errors.length > 0 ? "error" : "default"}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
            </Stack>
          ) : null}

          {importPreview?.errors.length ? (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>
                  Corrige el archivo antes de importar.
                </Typography>
                {importPreview.errors.slice(0, 8).map((item) => (
                  <Typography key={`${item.lineNumber}-${item.message}`} sx={{ fontSize: 13 }}>
                    Fila {item.lineNumber}: {item.message}
                  </Typography>
                ))}
                {importPreview.errors.length > 8 ? (
                  <Typography sx={{ fontSize: 13 }}>
                    {importPreview.errors.length - 8} errores adicionales no mostrados.
                  </Typography>
                ) : null}
              </Stack>
            </Alert>
          ) : null}

          {importResult ? (
            <Alert
              severity={importResult.summary.failed > 0 ? "warning" : "success"}
              variant="outlined"
              sx={{ borderRadius: "18px" }}
            >
              <Stack spacing={0.4}>
                <Typography sx={{ fontWeight: 700 }}>
                  Resultado de la importacion
                </Typography>
                <Typography sx={{ fontSize: 13 }}>
                  Creadas: {importResult.summary.created} · Actualizadas:{" "}
                  {importResult.summary.updated} · Omitidas: {importResult.summary.skipped} ·
                  Fallidas: {importResult.summary.failed}
                </Typography>
                {importResult.errors.slice(0, 6).map((item) => (
                  <Typography key={`${item.code}-${item.reason}`} sx={{ fontSize: 13 }}>
                    {item.code}: {item.reason}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}

          <Box
            sx={{
              overflow: "hidden",
              borderRadius: "20px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
            }}
          >
            <DataGrid
              rows={importPreview?.rows ?? []}
              columns={columns}
              getRowId={(row) => `${row.lineNumber}-${row.code}`}
              disableColumnMenu
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                    page: 0,
                  },
                },
              }}
              localeText={{
                noRowsLabel: "Carga un CSV para revisar las filas antes de importar.",
              }}
              sx={{
                minHeight: 340,
                border: "none",
                "& .MuiDataGrid-cell": {
                  fontSize: 13,
                  alignItems: "center",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 13,
                  fontWeight: 700,
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                  outline: "none",
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
        <Button
          type="button"
          variant="text"
          onClick={onClose}
          disabled={importing}
          sx={{ borderRadius: "999px", fontWeight: 700 }}
        >
          Cerrar
        </Button>
        <Button
          type="button"
          variant="contained"
          startIcon={<Upload size={16} />}
          onClick={() => {
            void onSubmit();
          }}
          disabled={
            importing ||
            !importPreview ||
            importPreview.rows.length === 0 ||
            importPreview.errors.length > 0
          }
          sx={{ borderRadius: "999px", fontWeight: 700 }}
        >
          {importing ? "Importando..." : "Importar cuentas"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
