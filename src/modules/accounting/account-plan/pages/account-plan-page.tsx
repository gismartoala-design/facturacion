"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  FilePlus2,
  FolderTree,
  PencilLine,
  RefreshCcw,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
} from "@/modules/accounting/lib/format";
import type {
  AccountGroupKey,
  AccountPlanResponse,
  AccountRow,
} from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";
import { fetchJson } from "@/shared/dashboard/api";
import { AccountFormDialog } from "../components/account-form-dialog";
import { AccountImportDialog } from "../components/account-import-dialog";
import { AccountPlanGrid } from "../components/account-plan-grid";
import {
  createEmptyForm,
  DEFAULT_NATURE_BY_GROUP,
  mapAccountToForm,
  normalizeSearchText,
  type AccountFormState,
  type SnackbarState,
} from "../shared";
import { useAccountPlanImport } from "../hooks/use-account-plan-import";

type AccountPlanPageProps = {
  initialData: AccountPlanResponse | null;
  initialError?: string | null;
};

const EMPTY_LAST_POSTED_LABEL = "Sin movimientos";

function buildAccountPayload(form: AccountFormState) {
  const trimmedDescription = form.description.trim();

  return {
    ...form,
    code: form.code.trim(),
    name: form.name.trim(),
    parentId: form.parentId ?? null,
    description: trimmedDescription ? trimmedDescription : null,
  };
}

function getCompatibleParentId(
  accounts: AccountPlanResponse["accounts"] | undefined,
  currentParentId: string | null,
  groupKey: AccountGroupKey,
) {
  const parentAccount = accounts?.find((account) => account.id === currentParentId);
  return parentAccount?.groupKey === groupKey ? currentParentId : null;
}

function formatLastPostedAt(value: string | null) {
  return value ? formatDateTime(value) : EMPTY_LAST_POSTED_LABEL;
}

export function AccountPlanPage({
  initialData,
  initialError = null,
}: AccountPlanPageProps) {
  const [data, setData] = useState<AccountPlanResponse | null>(() => initialData);
  const [editForm, setEditForm] = useState<AccountFormState>(() => createEmptyForm());
  const [createForm, setCreateForm] = useState<AccountFormState>(() => createEmptyForm());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [onlyPostable, setOnlyPostable] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(() => !initialData && !initialError);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const importState = useAccountPlanImport({
    onImported: () => setRefreshKey((current) => current + 1),
    onNotify: (nextSnackbar) => setSnackbar(nextSnackbar),
  });

  useEffect(() => {
    if (refreshKey === 0) {
      return;
    }

    let mounted = true;

    async function loadPlan() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchJson<AccountPlanResponse>(
          "/api/v1/accounting/account-plan",
        );

        if (!mounted) {
          return;
        }

        setData(response);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el plan de cuentas",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const selectedAccount = useMemo(
    () => data?.accounts.find((account) => account.id === selectedAccountId) ?? null,
    [data, selectedAccountId],
  );

  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalized = normalizeSearchText(search);

    return data.accounts.filter((account) => {
      if (!includeInactive && !account.active) {
        return false;
      }

      if (onlyPostable && !account.acceptsPostings) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        account.code.toLowerCase().includes(normalized) ||
        account.name.toLowerCase().includes(normalized) ||
        account.groupLabel.toLowerCase().includes(normalized) ||
        (account.parentCode ?? "").toLowerCase().includes(normalized) ||
        (account.description ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [data, includeInactive, onlyPostable, search]);

  const editParentOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.accounts.filter((account) => {
      if (!account.active) {
        return false;
      }

      if (account.id === selectedAccountId) {
        return false;
      }

      if (account.groupKey !== editForm.groupKey) {
        return false;
      }

      return !account.acceptsPostings;
    });
  }, [data, editForm.groupKey, selectedAccountId]);

  const createParentOptions = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.accounts.filter((account) => {
      if (!account.active) {
        return false;
      }

      if (account.groupKey !== createForm.groupKey) {
        return false;
      }

      return !account.acceptsPostings;
    });
  }, [createForm.groupKey, data]);

  const selectedEditParent = useMemo(
    () => editParentOptions.find((account) => account.id === editForm.parentId) ?? null,
    [editForm.parentId, editParentOptions],
  );

  const selectedCreateParent = useMemo(
    () =>
      createParentOptions.find((account) => account.id === createForm.parentId) ?? null,
    [createForm.parentId, createParentOptions],
  );

  function openCreateDialog() {
    setCreateForm(createEmptyForm());
    setCreateDialogOpen(true);
  }

  function openEditDialog() {
    if (!selectedAccount) {
      return;
    }

    setEditForm(mapAccountToForm(selectedAccount));
    setEditDialogOpen(true);
  }

  function closeCreateDialog() {
    if (savingCreate) {
      return;
    }

    setCreateDialogOpen(false);
    setCreateForm(createEmptyForm());
  }

  function closeEditDialog() {
    if (savingEdit) {
      return;
    }

    setEditDialogOpen(false);
  }

  function handleEditFormChange<K extends keyof AccountFormState>(
    field: K,
    value: AccountFormState[K],
  ) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCreateFormChange<K extends keyof AccountFormState>(
    field: K,
    value: AccountFormState[K],
  ) {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEditGroupChange(groupKey: AccountGroupKey) {
    setEditForm((current) => ({
      ...current,
      groupKey,
      defaultNature: DEFAULT_NATURE_BY_GROUP[groupKey],
      parentId: getCompatibleParentId(data?.accounts, current.parentId, groupKey),
    }));
  }

  function handleCreateGroupChange(groupKey: AccountGroupKey) {
    setCreateForm((current) => ({
      ...current,
      groupKey,
      defaultNature: DEFAULT_NATURE_BY_GROUP[groupKey],
      parentId: getCompatibleParentId(data?.accounts, current.parentId, groupKey),
    }));
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccountId) {
      return;
    }

    if (selectedAccount?.system) {
      setSnackbar({
        tone: "error",
        text: "Las cuentas base del sistema no se pueden modificar",
      });
      return;
    }

    setSavingEdit(true);

    try {
      const saved = await fetchJson<AccountRow>(
        `/api/v1/accounting/account-plan/${selectedAccountId}`,
        {
          method: "PUT",
          body: JSON.stringify(buildAccountPayload(editForm)),
        },
      );

      setSelectedAccountId(saved.id);
      setEditDialogOpen(false);
      setSnackbar({
        tone: "success",
        text: "Cuenta contable actualizada correctamente",
      });
      setRefreshKey((current) => current + 1);
    } catch (submitError) {
      setSnackbar({
        tone: "error",
        text:
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar la cuenta contable",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCreate(true);

    try {
      const saved = await fetchJson<AccountRow>("/api/v1/accounting/account-plan", {
        method: "POST",
        body: JSON.stringify(buildAccountPayload(createForm)),
      });

      setCreateDialogOpen(false);
      setCreateForm(createEmptyForm());
      setSelectedAccountId(saved.id);
      setSnackbar({
        tone: "success",
        text: "Cuenta contable creada correctamente",
      });
      setRefreshKey((current) => current + 1);
    } catch (submitError) {
      setSnackbar({
        tone: "error",
        text:
          submitError instanceof Error
            ? submitError.message
            : "No se pudo guardar la cuenta contable",
      });
    } finally {
      setSavingCreate(false);
    }
  }

  if (loading && !data) {
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
        <Typography>Cargando plan de cuentas...</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", lg: "center" }}
        >
          <Stack direction="row" spacing={1.1} alignItems="center">
            <FolderTree size={18} color="#475569" />
            <Typography
              variant="h5"
              sx={{ color: "#0f172a", fontWeight: 700, lineHeight: 1.15 }}
            >
              Plan de cuentas
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
            <Button
              type="button"
              variant="outlined"
              startIcon={<RefreshCcw size={16} />}
              onClick={() => setRefreshKey((current) => current + 1)}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Recargar
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<Upload size={16} />}
              onClick={importState.openImportDialog}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Importar
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<PencilLine size={16} />}
              onClick={openEditDialog}
              disabled={!selectedAccountId}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Editar
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<FilePlus2 size={16} />}
              onClick={openCreateDialog}
              sx={{ borderRadius: "999px", fontWeight: 700 }}
            >
              Nueva cuenta
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: "18px" }}>
            {error}
          </Alert>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            borderRadius: "28px",
            border: "1px solid rgba(226, 232, 240, 0.95)",
            backgroundColor: "#fff",
            p: 2,
          }}
        >
          <AccountPlanGrid
            rows={rows}
            loading={loading}
            search={search}
            onlyPostable={onlyPostable}
            includeInactive={includeInactive}
            selectedAccountId={selectedAccountId}
            onSearchChange={setSearch}
            onOnlyPostableChange={setOnlyPostable}
            onIncludeInactiveChange={setIncludeInactive}
            onRowClick={setSelectedAccountId}
            onRowDoubleClick={openEditDialog}
            formatCompactNumber={formatCompactNumber}
            formatCurrency={formatCurrency}
            formatDateTime={formatLastPostedAt}
          />
        </Paper>
      </Stack>

      <AccountFormDialog
        mode="create"
        open={createDialogOpen}
        saving={savingCreate}
        form={createForm}
        parentOptions={createParentOptions}
        selectedParent={selectedCreateParent}
        onClose={closeCreateDialog}
        onSubmit={handleCreateSubmit}
        onFieldChange={handleCreateFormChange}
        onGroupChange={handleCreateGroupChange}
        formatCompactNumber={formatCompactNumber}
        formatCurrency={formatCurrency}
        formatDateTime={formatLastPostedAt}
      />

      <AccountImportDialog
        open={importState.importDialogOpen}
        importing={importState.importing}
        overwriteExisting={importState.overwriteExisting}
        importFileName={importState.importFileName}
        importPreview={importState.importPreview}
        importResult={importState.importResult}
        importFileInputRef={importState.importFileInputRef}
        onClose={importState.closeImportDialog}
        onOverwriteExistingChange={importState.setOverwriteExisting}
        onDownloadTemplate={importState.handleDownloadImportTemplate}
        onFileSelected={importState.handleImportFileSelected}
        onSubmit={importState.handleImportSubmit}
        formatCompactNumber={formatCompactNumber}
      />

      <AccountFormDialog
        mode="edit"
        open={editDialogOpen}
        saving={savingEdit}
        systemReadonly={Boolean(selectedAccount?.system)}
        selectedAccount={selectedAccount}
        form={editForm}
        parentOptions={editParentOptions}
        selectedParent={selectedEditParent}
        onClose={closeEditDialog}
        onSubmit={handleEditSubmit}
        onFieldChange={handleEditFormChange}
        onGroupChange={handleEditGroupChange}
        formatCompactNumber={formatCompactNumber}
        formatCurrency={formatCurrency}
        formatDateTime={formatLastPostedAt}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar?.tone ?? "success"}
          variant="filled"
          onClose={() => setSnackbar(null)}
          sx={{ borderRadius: "14px", alignItems: "center" }}
        >
          {snackbar?.text}
        </Alert>
      </Snackbar>
    </>
  );
}
