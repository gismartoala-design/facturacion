"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  BadgeCheck,
  FilePlus2,
  FileSearch,
  FileText,
  FolderOpen,
  PlusCircle,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  ACCOUNTING_STATUS_LABELS,
  ACCOUNTING_STATUS_TONES,
  formatCurrency,
  formatDateTime,
} from "@/modules/accounting/lib/format";
import { fetchJson } from "@/shared/dashboard/api";

type AccountPlanResponse = {
  accounts: Array<{
    code: string;
    name: string;
    groupKey: string;
    groupLabel: string;
    parentCode: string | null;
    level: number;
    acceptsPostings: boolean;
    defaultNature: "DEBIT" | "CREDIT";
    description: string;
    system: boolean;
  }>;
};

type AdjustmentEntriesResponse = {
  rows: Array<{
    id: string;
    status: string;
    createdAt: string;
    postedAt: string | null;
    debitTotal: number;
    creditTotal: number;
    balanceDifference: number;
    source: {
      title: string;
      subtitle: string | null;
    };
    lines: Array<{
      id: string;
      accountCode: string;
      accountName: string | null;
      debit: number;
      credit: number;
      memo: string | null;
    }>;
  }>;
};

type VoucherHeader = {
  date: string;
  voucherType: string;
  gloss: string;
  reference: string;
  openingVoucher: boolean;
  recurrent: boolean;
  costCenterCode: string;
  costCenterName: string;
};

type DraftLine = {
  accountCode: string;
  debit: string;
  credit: string;
  detail: string;
};

type VoucherLine = DraftLine & {
  localId: string;
};

const VOUCHER_TYPES = [
  "COMPROBANTE DE EGRESO",
  "COMPROBANTE DE INGRESO",
  "DIARIO GENERAL",
  "AJUSTE CONTABLE",
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialHeader(): VoucherHeader {
  return {
    date: todayInputValue(),
    voucherType: "COMPROBANTE DE EGRESO",
    gloss: "",
    reference: "",
    openingVoucher: false,
    recurrent: false,
    costCenterCode: "",
    costCenterName: "",
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

function actionButtonSx(primary = false) {
  return {
    borderRadius: "999px",
    fontWeight: 700,
    px: 1.75,
    py: 0.8,
    color: primary ? "#fff" : "#c62839",
    backgroundColor: primary ? "#d32f45" : "transparent",
    borderColor: "rgba(211, 47, 69, 0.18)",
    "&:hover": {
      borderColor: "#d32f45",
      backgroundColor: primary ? "#bc1f36" : "rgba(211, 47, 69, 0.06)",
    },
  };
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "red";
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "22px",
        border: "1px solid rgba(226, 232, 240, 0.95)",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.1,
          backgroundColor: tone === "blue" ? "#1e88ff" : "#ff4d4f",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        {label}
      </Box>
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={0.8}
        sx={{ minHeight: 120, px: 2, py: 2.2 }}
      >
        <Typography sx={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function AccountingEntriesPage() {
  const [accounts, setAccounts] = useState<AccountPlanResponse["accounts"]>([]);
  const [recentEntries, setRecentEntries] = useState<AdjustmentEntriesResponse["rows"]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showRecentEntries, setShowRecentEntries] = useState(false);
  const [header, setHeader] = useState<VoucherHeader>(createInitialHeader());
  const [draftLine, setDraftLine] = useState<DraftLine>(createInitialDraftLine());
  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>([]);

  const postingAccounts = useMemo(
    () => accounts.filter((account) => account.acceptsPostings),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      postingAccounts.find((account) => account.code === draftLine.accountCode) ?? null,
    [draftLine.accountCode, postingAccounts],
  );

  const totals = useMemo(() => {
    const debit = voucherLines.reduce(
      (acc, line) => acc + Number(line.debit || 0),
      0,
    );
    const credit = voucherLines.reduce(
      (acc, line) => acc + Number(line.credit || 0),
      0,
    );

    return {
      lineCount: voucherLines.length,
      debit,
      credit,
      difference: debit - credit,
    };
  }, [voucherLines]);

  async function loadPageData() {
    setLoading(true);
    setError(null);

    try {
      const [plan, entries] = await Promise.all([
        fetchJson<AccountPlanResponse>("/api/v1/accounting/account-plan"),
        fetchJson<AdjustmentEntriesResponse>(
          "/api/v1/accounting/entries?sourceType=ADJUSTMENT&limit=12",
        ),
      ]);

      setAccounts(plan.accounts);
      setRecentEntries(entries.rows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el modulo de asientos contables",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

  function resetVoucherForm(clearFeedback = true) {
    setHeader(createInitialHeader());
    setDraftLine(createInitialDraftLine());
    setVoucherLines([]);
    if (clearFeedback) {
      setMessage(null);
      setError(null);
    }
  }

  function buildLineMemo(lineDetail: string) {
    const parts = [
      header.gloss.trim(),
      lineDetail.trim(),
      header.reference.trim() ? `Ref: ${header.reference.trim()}` : "",
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" · ") : null;
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

    setVoucherLines((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        ...draftLine,
      },
    ]);
    setDraftLine(createInitialDraftLine());
    setError(null);
  }

  function removeVoucherLine(localId: string) {
    setVoucherLines((current) => current.filter((line) => line.localId !== localId));
  }

  async function persistEntry(autoPost: boolean) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await fetchJson("/api/v1/accounting/entries", {
        method: "POST",
        body: JSON.stringify({
          autoPost,
          lines: voucherLines.map((line) => ({
            accountCode: line.accountCode,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            memo: buildLineMemo(line.detail),
          })),
        }),
      });

      setMessage(
        autoPost
          ? "Comprobante procesado y registrado."
          : "Comprobante grabado como borrador.",
      );
      resetVoucherForm(false);
      await loadPageData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo registrar el asiento manual",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderRadius: "20px",
          border: "1px solid rgba(226, 232, 240, 1)",
          p: 2,
          color: "text.secondary",
        }}
      >
        <CircularProgress size={18} thickness={5} />
        <Typography>Cargando asientos contables...</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "32px",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          backgroundColor: "#fff",
          p: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={2.4}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.2}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                type="button"
                variant="outlined"
                startIcon={<RefreshCcw size={16} />}
                onClick={() =>
                  setHeader((current) => ({
                    ...current,
                    recurrent: !current.recurrent,
                  }))
                }
                sx={actionButtonSx()}
              >
                Recurrente
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<FolderOpen size={16} />}
                onClick={() => setShowRecentEntries((current) => !current)}
                sx={actionButtonSx()}
              >
                Abrir
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<FilePlus2 size={16} />}
                onClick={resetVoucherForm}
                sx={actionButtonSx()}
              >
                Nuevo
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<Save size={16} />}
                disabled={saving || voucherLines.length === 0}
                onClick={() => void persistEntry(false)}
                sx={actionButtonSx()}
              >
                Grabar
              </Button>
              <Button
                type="button"
                variant="contained"
                startIcon={<BadgeCheck size={16} />}
                disabled={saving || voucherLines.length === 0}
                onClick={() => void persistEntry(true)}
                sx={actionButtonSx(true)}
              >
                Procesar
              </Button>
            </Stack>

            <Button
              type="button"
              variant="text"
              disabled
              startIcon={<FileText size={16} />}
              sx={{
                color: "#94a3b8",
                fontWeight: 700,
                justifyContent: "flex-start",
              }}
            >
              Pdf
            </Button>
          </Stack>

          {error ? (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
              {error}
            </Alert>
          ) : null}

          {message ? (
            <Alert severity="success" variant="outlined" sx={{ borderRadius: "18px" }}>
              {message}
            </Alert>
          ) : null}

          {showRecentEntries ? (
            <Paper
              elevation={0}
              sx={{
                borderRadius: "24px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                backgroundColor: "rgba(248, 250, 252, 0.78)",
                p: 1.6,
              }}
            >
              <Stack spacing={1.2}>
                <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                  Ultimos comprobantes manuales
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.2,
                  }}
                >
                  {recentEntries.length > 0 ? (
                    recentEntries.map((entry) => (
                      <Paper
                        key={entry.id}
                        elevation={0}
                        sx={{
                          borderRadius: "18px",
                          border: "1px solid rgba(226, 232, 240, 0.95)",
                          backgroundColor: "#fff",
                          p: 1.4,
                        }}
                      >
                        <Stack spacing={0.7}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                              {entry.source.title}
                            </Typography>
                            <Chip
                              size="small"
                              color={ACCOUNTING_STATUS_TONES[entry.status] ?? "default"}
                              label={
                                ACCOUNTING_STATUS_LABELS[entry.status] ?? entry.status
                              }
                              sx={{ borderRadius: "999px", fontWeight: 700 }}
                            />
                          </Stack>
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            {formatDateTime(entry.createdAt)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#475569" }}>
                            Debito {formatCurrency(entry.debitTotal)} · Credito{" "}
                            {formatCurrency(entry.creditTotal)}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                      No hay comprobantes manuales recientes.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "240px minmax(260px, 1fr) minmax(260px, 1.2fr) 300px",
              },
              gap: 1.5,
            }}
          >
            <TextField
              label="Fecha"
              type="date"
              value={header.date}
              onChange={(event) =>
                setHeader((current) => ({ ...current, date: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />

            <FormControl>
              <InputLabel id="voucher-type-label">Comprobante</InputLabel>
              <Select
                labelId="voucher-type-label"
                label="Comprobante"
                value={header.voucherType}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    voucherType: event.target.value,
                  }))
                }
                sx={{ borderRadius: "18px" }}
              >
                {VOUCHER_TYPES.map((voucherType) => (
                  <MenuItem key={voucherType} value={voucherType}>
                    {voucherType}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Glosa"
              placeholder="Detalle general del comprobante"
              value={header.gloss}
              onChange={(event) =>
                setHeader((current) => ({ ...current, gloss: event.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />

            <Paper
              elevation={0}
              sx={{
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                backgroundColor: "#eef2f6",
                minHeight: 72,
                px: 2,
                py: 1.35,
              }}
            >
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Sec. Contable
              </Typography>
              <Typography sx={{ mt: 0.7, fontWeight: 700, color: "#64748b" }}>
                Pendiente
              </Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(260px, 1.2fr) 220px 300px",
              },
              gap: 1.5,
            }}
          >
            <TextField
              label="Referencia"
              placeholder="Documento o referencia externa"
              value={header.reference}
              onChange={(event) =>
                setHeader((current) => ({ ...current, reference: event.target.value }))
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />

            <TextField
              label="Cod."
              placeholder="C. costo"
              value={header.costCenterCode}
              onChange={(event) =>
                setHeader((current) => ({
                  ...current,
                  costCenterCode: event.target.value,
                }))
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Search size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />

            <Paper
              elevation={0}
              sx={{
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                backgroundColor: "#eef2f6",
                minHeight: 72,
                px: 2,
                py: 1.35,
              }}
            >
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Nombre C. Costo
              </Typography>
              <Typography sx={{ mt: 0.7, fontWeight: 700, color: "#64748b" }}>
                {header.costCenterName || "----"}
              </Typography>
            </Paper>
          </Box>

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Checkbox
                  checked={header.openingVoucher}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      openingVoucher: event.target.checked,
                    }))
                  }
                />
              }
              label="Comprobante Apertura"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={header.recurrent}
                  onChange={(event) =>
                    setHeader((current) => ({
                      ...current,
                      recurrent: event.target.checked,
                    }))
                  }
                />
              }
              label="Recurrente"
            />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.8}>
            <Divider sx={{ flex: 1 }} />
            <Chip
              label="Comprobante Contable"
              sx={{
                borderRadius: "999px",
                backgroundColor: "#eef2f6",
                color: "#334155",
                fontWeight: 700,
                px: 1.2,
              }}
            />
            <Divider sx={{ flex: 1 }} />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "320px minmax(240px, 1fr) 180px 180px",
              },
              gap: 1.5,
            }}
          >
            <TextField
              label="Cod. Cta"
              placeholder="Selecciona cuenta"
              value={draftLine.accountCode}
              onChange={(event) =>
                setDraftLine((current) => ({
                  ...current,
                  accountCode: event.target.value,
                }))
              }
              list="account-codes"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Search size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
                "& .MuiInputLabel-root": {
                  color: "#c62839",
                },
              }}
            />
            <datalist id="account-codes">
              {postingAccounts.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.name}
                </option>
              ))}
            </datalist>

            <Paper
              elevation={0}
              sx={{
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.95)",
                backgroundColor: "#eef2f6",
                minHeight: 72,
                px: 2,
                py: 1.35,
              }}
            >
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Cuenta Contable
              </Typography>
              <Typography sx={{ mt: 0.7, fontWeight: 700, color: "#64748b" }}>
                {selectedAccount?.name ?? "----"}
              </Typography>
            </Paper>

            <TextField
              label="Debito"
              type="number"
              value={draftLine.debit}
              onChange={(event) =>
                setDraftLine((current) => ({
                  ...current,
                  debit: event.target.value,
                }))
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />

            <TextField
              label="Credito"
              type="number"
              value={draftLine.credit}
              onChange={(event) =>
                setDraftLine((current) => ({
                  ...current,
                  credit: event.target.value,
                }))
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />
          </Box>

          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <TextField
              label="Detalle"
              placeholder="Detalle de la linea"
              value={draftLine.detail}
              onChange={(event) =>
                setDraftLine((current) => ({
                  ...current,
                  detail: event.target.value,
                }))
              }
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "18px",
                },
              }}
            />
            <Button
              type="button"
              variant="text"
              startIcon={<PlusCircle size={18} />}
              onClick={addDraftLine}
              sx={{
                alignSelf: { xs: "flex-start", lg: "center" },
                color: "#d32f45",
                fontWeight: 700,
                px: 1.2,
              }}
            >
              Agregar
            </Button>
          </Stack>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: "22px",
              border: "1px solid rgba(226, 232, 240, 0.95)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "#f1f5f9",
                    "& .MuiTableCell-root": {
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      borderBottom: "1px solid rgba(226, 232, 240, 0.95)",
                    },
                  }}
                >
                  <TableCell>Linea</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="right">Debito</TableCell>
                  <TableCell align="right">Credito</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell align="center">Eliminar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {voucherLines.length > 0 ? (
                  voucherLines.map((line, index) => {
                    const account =
                      postingAccounts.find((item) => item.code === line.accountCode) ??
                      null;

                    return (
                      <TableRow
                        key={line.localId}
                        sx={{
                          "& .MuiTableCell-root": {
                            fontSize: 13,
                            borderBottom: "1px solid rgba(241, 245, 249, 1)",
                          },
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{line.accountCode}</TableCell>
                        <TableCell>{account?.name ?? "Cuenta no encontrada"}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(Number(line.debit || 0))}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(Number(line.credit || 0))}
                        </TableCell>
                        <TableCell>{line.detail || header.gloss || "Sin detalle"}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => removeVoucherLine(line.localId)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6 }}>
                      <Stack alignItems="center" spacing={1.2}>
                        <FileSearch size={44} color="#cbd5e1" />
                        <Typography sx={{ color: "#64748b" }}>Sin datos</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <SummaryCard label="Total Lineas" value={String(totals.lineCount)} tone="blue" />
            <SummaryCard
              label="Total Debito"
              value={formatCurrency(totals.debit)}
              tone="blue"
            />
            <SummaryCard
              label="Total Credito"
              value={formatCurrency(totals.credit)}
              tone="blue"
            />
            <SummaryCard
              label="Diferencia"
              value={formatCurrency(totals.difference)}
              tone="red"
            />
          </Box>

          <Alert severity="info" variant="outlined" sx={{ borderRadius: "18px" }}>
            La UI ya sigue el flujo de comprobante. La cabecera aun es referencial en
            parte; el backend sigue persistiendo solo las lineas del asiento manual.
          </Alert>
        </Stack>
      </Paper>
    </Stack>
  );
}
