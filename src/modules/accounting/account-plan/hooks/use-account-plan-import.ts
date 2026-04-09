"use client";

import { useRef, useState, type ChangeEvent } from "react";

import type { AccountImportResponse } from "@/modules/accounting/accounting-ledger/components/account-plan-view-model";
import {
  type ParsedAccountingImportResult,
  ACCOUNTING_IMPORT_TEMPLATE,
  parseAccountingAccountsImport,
} from "@/modules/accounting/lib/accounting-account-import";
import { fetchJson } from "@/shared/dashboard/api";

import type { SnackbarState } from "../shared";

type ImportNotification = NonNullable<SnackbarState>;

type UseAccountPlanImportOptions = {
  onImported: () => void;
  onNotify: (notification: ImportNotification) => void;
};

function createImportPayload(preview: ParsedAccountingImportResult) {
  return preview.rows.map((row) => ({
    code: row.code,
    name: row.name,
    groupKey: row.groupKey,
    defaultNature: row.defaultNature,
    parentCode: row.parentCode,
    acceptsPostings: row.acceptsPostings,
    active: row.active,
    description: row.description,
  }));
}

export function useAccountPlanImport({
  onImported,
  onNotify,
}: UseAccountPlanImportOptions) {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<ParsedAccountingImportResult | null>(
    null,
  );
  const [importResult, setImportResult] = useState<AccountImportResponse | null>(null);

  function resetImportState() {
    setImportFileName("");
    setImportPreview(null);
    setImportResult(null);
    setOverwriteExisting(true);
  }

  function openImportDialog() {
    resetImportState();
    setImportDialogOpen(true);
  }

  function closeImportDialog() {
    if (importing) {
      return;
    }

    setImportDialogOpen(false);
    resetImportState();
  }

  function handleDownloadImportTemplate() {
    const blob = new Blob([ACCOUNTING_IMPORT_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-plan-de-cuentas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseAccountingAccountsImport(text);
      setImportFileName(file.name);
      setImportPreview(parsed);
      setImportResult(null);

      if (parsed.rows.length === 0) {
        onNotify({
          tone: "error",
          text: "No se encontraron filas validas para importar",
        });
      }
    } catch {
      onNotify({
        tone: "error",
        text: "No se pudo leer el archivo seleccionado",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function handleImportSubmit() {
    if (!importPreview || importPreview.rows.length === 0 || importPreview.errors.length > 0) {
      return;
    }

    setImporting(true);

    try {
      const result = await fetchJson<AccountImportResponse>(
        "/api/v1/accounting/account-plan/import",
        {
          method: "POST",
          body: JSON.stringify({
            overwriteExisting,
            rows: createImportPayload(importPreview),
          }),
        },
      );

      setImportResult(result);
      onImported();

      if (result.summary.failed === 0 && result.summary.skipped === 0) {
        setImportDialogOpen(false);
      }

      onNotify({
        tone: result.summary.failed > 0 ? "error" : "success",
        text: `Importacion procesada: ${result.summary.created} creadas, ${result.summary.updated} actualizadas, ${result.summary.failed} con error`,
      });
    } catch (submitError) {
      onNotify({
        tone: "error",
        text:
          submitError instanceof Error
            ? submitError.message
            : "No se pudo importar el plan de cuentas",
      });
    } finally {
      setImporting(false);
    }
  }

  return {
    importDialogOpen,
    importing,
    overwriteExisting,
    importFileName,
    importPreview,
    importResult,
    importFileInputRef,
    setOverwriteExisting,
    openImportDialog,
    closeImportDialog,
    handleDownloadImportTemplate,
    handleImportFileSelected,
    handleImportSubmit,
  };
}
