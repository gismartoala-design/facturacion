"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  CalendarRange,
  CheckCircle,
  FilePlus2,
  PencilLine,
  PlusCircle,
  ReceiptText,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useRef, useState, type RefObject } from "react";

import { formatCurrency } from "@/modules/accounting/lib/format";
import type { EntryAccountOption } from "@/modules/accounting/lib/accounting-entries-view-model";
import { useAccountingNotifier } from "@/shared/notifications/notifier-presets";
import { fetchJson } from "@/shared/dashboard/api";
import { DashboardPageHeader } from "@/shared/dashboard/page-header";
import { PageErrorState } from "@/shared/states/page-error-state";

type AccountingEntriesPageProps = {
  initialAccounts: EntryAccountOption[];
  initialError?: string | null;
};

type EntryHeader = {
  date: string;
  voucherType: string;
  reference: string;
  gloss: string;
};

type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  detail: string;
};

type EntryLine = DraftLine & {
  localId: string;
};

type DraftLineFormProps = {
  accounts: EntryAccountOption[];
  line: DraftLine;
  selectedAccount: EntryAccountOption | null;
  accountCodeInputRef?: RefObject<HTMLInputElement | null>;
  debitInputRef?: RefObject<HTMLInputElement | null>;
  error: string | null;
  onChange: <K extends keyof DraftLine>(field: K, value: DraftLine[K]) => void;
  onSearchByCode: () => void;
  onAccountSelected: (account: EntryAccountOption | null) => void;
};

const VOUCHER_TYPES = [
  { value: "AJUSTE", label: "Ajuste manual" },
  { value: "DIARIO", label: "Diario general" },
  { value: "INGRESO", label: "Ingreso manual" },
  { value: "EGRESO", label: "Egreso manual" },
] as const;

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialHeader(): EntryHeader {
  return {
    date: todayInputValue(),
    voucherType: "AJUSTE",
    reference: "",
    gloss: "",
  };
}

function createInitialDraftLine(): DraftLine {
  return {
    accountCode: "",
    debit: "",
    credit: "",
    detail: "",
  };
}

function DraftLineForm({
  accounts,
  line,
  selectedAccount,
  accountCodeInputRef,
  debitInputRef,
  error,
  onChange,
  onSearchByCode,
  onAccountSelected,
}: DraftLineFormProps) {
  return (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <TextField
            label="Codigo de cuenta"
            placeholder="Buscar por codigo"
            inputRef={accountCodeInputRef}
            value={line.accountCode}
            error={Boolean(error)}
            onChange={(event) => onChange("accountCode", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearchByCode();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" onClick={onSearchByCode}>
                    <Search size={16} color="#64748b" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Autocomplete
            options={accounts}
            value={selectedAccount}
            onChange={(_, value) => onAccountSelected(value)}
            filterOptions={(options, state) => {
              const normalized = state.inputValue.trim().toLowerCase();
              if (!normalized) {
                return options;
              }

              return options.filter(
                (option) =>
                  option.name.toLowerCase().includes(normalized) ||
                  option.code.toLowerCase().includes(normalized) ||
                  option.groupLabel.toLowerCase().includes(normalized),
              );
            }}
            sx={{
              "& .MuiInputBase-root": {
                minHeight: 40,
                alignItems: "center",
              },
            }}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Nombre de cuenta"
                placeholder="Buscar por nombre o codigo"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <Search size={16} color="#64748b" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;

              return (
                <Box component="li" key={key} {...optionProps}>
                  <Stack spacing={0.15} sx={{ width: "100%" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {option.code} · {option.groupLabel} · Naturaleza{" "}
                      {option.defaultNature === "DEBIT" ? "debito" : "credito"}
                    </Typography>
                  </Stack>
                </Box>
              );
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <TextField
            label="Debito"
            type="number"
            inputRef={debitInputRef}
            value={line.debit}
            onChange={(event) => onChange("debit", event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
          <TextField
            label="Credito"
            type="number"
            value={line.credit}
            onChange={(event) => onChange("credit", event.target.value)}
          />
        </Grid>
      </Grid>

      <TextField
        label="Detalle"
        placeholder="Detalle de la linea"
        value={line.detail}
        onChange={(event) => onChange("detail", event.target.value)}
      />
    </Stack>
  );
}

export function AccountingEntriesPage({
  initialAccounts,
  initialError = null,
}: AccountingEntriesPageProps) {
  const notifier = useAccountingNotifier();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<EntryHeader>(createInitialHeader());
  const [draftLine, setDraftLine] = useState<DraftLine>(createInitialDraftLine());
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<DraftLine>(createInitialDraftLine());
  const [entryLines, setEntryLines] = useState<EntryLine[]>([]);
  const accountCodeInputRef = useRef<HTMLInputElement | null>(null);
  const debitInputRef = useRef<HTMLInputElement | null>(null);

  const postingAccounts = useMemo(
    () => initialAccounts.filter((account) => account.acceptsPostings),
    [initialAccounts],
  );

  const selectedAccount = useMemo(
    () =>
      postingAccounts.find((account) => account.code === draftLine.accountCode) ?? null,
    [draftLine.accountCode, postingAccounts],
  );

  const selectedEditingAccount = useMemo(
    () =>
      postingAccounts.find((account) => account.code === editingLine.accountCode) ?? null,
    [editingLine.accountCode, postingAccounts],
  );

  const totals = useMemo(() => {
    const debit = entryLines.reduce((acc, line) => acc + Number(line.debit || 0), 0);
    const credit = entryLines.reduce((acc, line) => acc + Number(line.credit || 0), 0);

    return {
      lineCount: entryLines.length,
      debit,
      credit,
      difference: debit - credit,
    };
  }, [entryLines]);

  const lineRows = useMemo(
    () =>
      entryLines.map((line, index) => {
        const account =
          postingAccounts.find((item) => item.code === line.accountCode) ?? null;

        return {
          id: line.localId,
          lineNumber: index + 1,
          accountCode: line.accountCode,
          accountName: account?.name ?? "Cuenta no encontrada",
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          detail: line.detail || header.gloss || "Sin detalle",
        };
      }),
    [entryLines, header.gloss, postingAccounts],
  );

  const lineColumns: GridColDef<(typeof lineRows)[number]>[] = [
    {
      field: "lineNumber",
      headerName: "Linea",
      width: 90,
    },
    {
      field: "accountCode",
      headerName: "Cuenta",
      width: 130,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
          {params.row.accountCode}
        </Typography>
      ),
    },
    {
      field: "accountName",
      headerName: "Nombre",
      flex: 1,
      minWidth: 220,
    },
    {
      field: "debit",
      headerName: "Debito",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: "credit",
      headerName: "Credito",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: "detail",
      headerName: "Detalle",
      flex: 1.1,
      minWidth: 220,
    },
    {
      field: "edit",
      headerName: "Editar",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: 80,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <IconButton size="small" onClick={() => openEditLineDialog(params.row.id)}>
          <PencilLine size={16} />
        </IconButton>
      ),
    },
    {
      field: "actions",
      headerName: "Accion",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: 100,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <IconButton size="small" onClick={() => removeLine(params.row.id)}>
          <Trash2 size={16} />
        </IconButton>
      ),
    },
  ];

  function focusDebitInput() {
    requestAnimationFrame(() => {
      debitInputRef.current?.focus();
      debitInputRef.current?.select();
    });
  }

  function focusAccountCodeInput() {
    requestAnimationFrame(() => {
      accountCodeInputRef.current?.focus();
      accountCodeInputRef.current?.select();
    });
  }

  function handleDraftLineChange<K extends keyof DraftLine>(
    field: K,
    value: DraftLine[K],
  ) {
    setDraftLine((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEditingLineChange<K extends keyof DraftLine>(
    field: K,
    value: DraftLine[K],
  ) {
    setEditingLine((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm(clearFeedback = true) {
    setHeader(createInitialHeader());
    setDraftLine(createInitialDraftLine());
    setEntryLines([]);

    if (clearFeedback) {
      setError(null);
    }
  }

  function buildLineMemo(detail: string) {
    const fragments = [
      header.gloss.trim(),
      detail.trim(),
      header.reference.trim() ? `Ref: ${header.reference.trim()}` : "",
    ].filter(Boolean);

    return fragments.length > 0 ? fragments.join(" · ") : null;
  }

  function searchAccountByCode() {
    const query = draftLine.accountCode.trim().toLowerCase();

    if (!query) {
      setError("Ingresa un codigo de cuenta para buscar");
      return;
    }

    const account =
      postingAccounts.find((item) => item.code.toLowerCase() === query) ??
      postingAccounts.find((item) => item.code.toLowerCase().includes(query));

    if (!account) {
      setError("No se encontro una cuenta contable con ese codigo");
      return;
    }

    setDraftLine((current) => ({
      ...current,
      accountCode: account.code,
    }));
    setError(null);
    focusDebitInput();
  }

  function searchEditingAccountByCode() {
    const query = editingLine.accountCode.trim().toLowerCase();

    if (!query) {
      setError("Ingresa un codigo de cuenta para buscar");
      return;
    }

    const account =
      postingAccounts.find((item) => item.code.toLowerCase() === query) ??
      postingAccounts.find((item) => item.code.toLowerCase().includes(query));

    if (!account) {
      setError("No se encontro una cuenta contable con ese codigo");
      return;
    }

    setEditingLine((current) => ({
      ...current,
      accountCode: account.code,
    }));
    setError(null);
  }

  function addDraftLine() {
    const debit = Number(draftLine.debit || 0);
    const credit = Number(draftLine.credit || 0);

    if (!draftLine.accountCode) {
      setError("Selecciona una cuenta contable para agregar la linea");
      return;
    }

    if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
      setError("Cada linea debe tener solo debito o solo credito");
      return;
    }

    setEntryLines((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        ...draftLine,
      },
    ]);
    setDraftLine(createInitialDraftLine());
    setError(null);
    focusAccountCodeInput();
  }

  function openEditLineDialog(localId: string) {
    const line = entryLines.find((item) => item.localId === localId);

    if (!line) {
      return;
    }

    setEditingLineId(localId);
    setEditingLine({
      accountCode: line.accountCode,
      debit: line.debit,
      credit: line.credit,
      detail: line.detail,
    });
    setError(null);
  }

  function closeEditLineDialog() {
    setEditingLineId(null);
    setEditingLine(createInitialDraftLine());
  }

  function saveEditedLine() {
    if (!editingLineId) {
      return;
    }

    const debit = Number(editingLine.debit || 0);
    const credit = Number(editingLine.credit || 0);

    if (!editingLine.accountCode) {
      setError("Selecciona una cuenta contable para guardar la linea");
      return;
    }

    if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
      setError("Cada linea debe tener solo debito o solo credito");
      return;
    }

    setEntryLines((current) =>
      current.map((line) =>
        line.localId === editingLineId
          ? {
              ...line,
              ...editingLine,
            }
          : line,
      ),
    );
    setError(null);
    closeEditLineDialog();
  }

  function removeLine(localId: string) {
    setEntryLines((current) => current.filter((line) => line.localId !== localId));
  }

  async function submitEntry(mode: "POSTED" | "DRAFT") {
    if (!header.gloss.trim()) {
      setError("La glosa es obligatoria para registrar el asiento");
      return;
    }

    if (entryLines.length < 2) {
      setError("Agrega al menos dos lineas para registrar el asiento");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await fetchJson("/api/v1/accounting/entries", {
        method: "POST",
        body: JSON.stringify({
          autoPost: mode === "POSTED",
          lines: entryLines.map((line) => ({
            accountCode: line.accountCode,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            memo: buildLineMemo(line.detail),
          })),
        }),
      });

      notifier.saved(
        mode === "POSTED"
          ? "Asiento manual registrado y posteado."
          : "Asiento manual guardado como borrador.",
      );
      resetForm(false);
    } catch (saveError) {
      notifier.apiError(saveError, "No se pudo registrar el asiento manual");
    } finally {
      setSaving(false);
    }
  }

  if (initialError && initialAccounts.length === 0) {
    return <PageErrorState message={initialError} />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <DashboardPageHeader
          icon={<ReceiptText size={18} color="#475569" />}
          title="Asientos contables"
          description="Registro manual de comprobantes con validacion por plan de cuentas y control de debitos y creditos."
          sx={{ px: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 2 } }}
        />
      </Grid>

      {error ? (
        <Grid size={12}>
          <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
            {error}
          </Alert>
        </Grid>
      ) : null}

      <Grid size={12}>
        <Paper
        elevation={0}
        sx={{
          borderRadius: "28px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          backgroundColor: "#fff",
          p: 2.2,
        }}
      >
        <Grid container spacing={2.25}>
          <Grid size={12}>
            <Grid
              container
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", lg: "center" }}
            >
              <Grid size={{ xs: 12, lg: "grow" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Cabecera del asiento
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, lg: "auto" }}>
                <Grid
                  container
                  spacing={1.2}
                  justifyContent={{ xs: "flex-start", lg: "flex-end" }}
                  sx={{
                    "& .MuiButton-root": {
                      borderRadius: "999px",
                      fontWeight: 700,
                      minHeight: 40,
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <Grid size={{ xs: 12, sm: "auto" }}>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<FilePlus2 size={16} />}
                      onClick={() => resetForm()}
                      fullWidth
                    >
                      Nuevo
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "auto" }}>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<Save size={16} />}
                      disabled={saving || entryLines.length === 0}
                      onClick={() => void submitEntry("DRAFT")}
                      fullWidth
                    >
                      Grabar
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "auto" }}>
                    <Button
                      type="button"
                      variant="contained"
                      startIcon={<CheckCircle size={16} />}
                      disabled={saving || entryLines.length === 0}
                      onClick={() => void submitEntry("POSTED")}
                      fullWidth
                    >
                      Procesar
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Grid size={12}>
            <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Fecha"
                type="date"
                value={header.date}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarRange size={16} color="#64748b" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="accounting-voucher-type-label">Tipo</InputLabel>
                <Select
                  labelId="accounting-voucher-type-label"
                  label="Tipo"
                  value={header.voucherType}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      voucherType: event.target.value,
                    }))
                  }
                >
                  {VOUCHER_TYPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Glosa"
                placeholder="Descripcion general del asiento"
                value={header.gloss}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    gloss: event.target.value,
                  }))
                }
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Referencia"
                placeholder="Documento o referencia opcional"
                value={header.reference}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
              />
            </Grid>
          </Grid>
          </Grid>
        </Grid>
      </Paper>
      </Grid>

      <Grid size={12}>
        <Paper
        elevation={0}
        sx={{
          borderRadius: "28px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          backgroundColor: "#fff",
          p: 2.2,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Agregar linea
          </Typography>

          <DraftLineForm
            accounts={postingAccounts}
            line={draftLine}
            selectedAccount={selectedAccount}
            accountCodeInputRef={accountCodeInputRef}
            debitInputRef={debitInputRef}
            error={error}
            onChange={handleDraftLineChange}
            onSearchByCode={searchAccountByCode}
            onAccountSelected={(value) => {
              handleDraftLineChange("accountCode", value?.code ?? "");
              if (value) {
                setError(null);
                focusDebitInput();
              }
            }}
          />

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Lineas: ${totals.lineCount}`}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Debito: ${formatCurrency(totals.debit)}`}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Credito: ${formatCurrency(totals.credit)}`}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
              <Chip
                label={`Diferencia: ${formatCurrency(totals.difference)}`}
                color={Math.abs(totals.difference) < 0.0001 ? "success" : "error"}
                variant="outlined"
                sx={{ borderRadius: "999px", fontWeight: 700 }}
              />
            </Stack>

            <Button
              type="button"
              variant="outlined"
              startIcon={<PlusCircle size={16} />}
              onClick={addDraftLine}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Agregar linea
            </Button>
          </Stack>
        </Stack>
      </Paper>
      </Grid>

      <Grid size={12}>
        <Paper
        elevation={0}
        sx={{
          borderRadius: "28px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          backgroundColor: "#fff",
          p: 2.2,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a" }}>
            Lineas del asiento
          </Typography>

          <Box
            sx={{
              overflow: "hidden",
              borderRadius: "22px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
            }}
          >
            <DataGrid
              rows={lineRows}
              columns={lineColumns}
              disableColumnMenu
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              hideFooterPagination
              localeText={{
                noRowsLabel:
                  "Aun no hay lineas agregadas. Empieza por seleccionar una cuenta y registrar un debito o credito.",
              }}
              sx={{
                minHeight: 320,
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f8fafc",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                },
                "& .MuiDataGrid-cell": {
                  fontSize: 13,
                  alignItems: "center",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                  outline: "none",
                },
                "& .MuiDataGrid-footerContainer": {
                  display: "none",
                },
              }}
            />
          </Box>
        </Stack>
      </Paper>
      </Grid>

      <Dialog
        open={Boolean(editingLineId)}
        onClose={closeEditLineDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 0.75 }}>
          <Typography variant="h6" sx={{ color: "#0f172a", fontWeight: 700 }}>
            Editar linea
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.25 }}>
          <DraftLineForm
            accounts={postingAccounts}
            line={editingLine}
            selectedAccount={selectedEditingAccount}
            error={error}
            onChange={handleEditingLineChange}
            onSearchByCode={searchEditingAccountByCode}
            onAccountSelected={(value) => {
              handleEditingLineChange("accountCode", value?.code ?? "");
              if (value) {
                setError(null);
              }
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
          <Button
            type="button"
            variant="text"
            onClick={closeEditLineDialog}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            startIcon={<Save size={16} />}
            onClick={saveEditedLine}
            sx={{ borderRadius: "999px", fontWeight: 700 }}
          >
            Guardar linea
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
