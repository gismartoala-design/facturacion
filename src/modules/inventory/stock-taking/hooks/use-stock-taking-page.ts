"use client";

import { useMemo, useState } from "react";

import type { StockItem } from "@/shared/dashboard/types";
import type { StockTakingDetail, StockTakingSummary } from "@/modules/inventory/stock-taking/types";
import { useInventoryNotifier } from "@/shared/notifications/notifier-presets";

import {
  applyStockTakingDraft,
  createStockTakingDraft,
  fetchStockTakingDetail,
  fetchStockTakingItems,
  fetchStockTakingSummaries,
  updateStockTakingDraft,
} from "../services/stock-taking-client";

export type StockTakingRow = StockItem & {
  savedSystemQuantity: number;
  countedQuantity: string;
  countedValue: number | null;
  difference: number | null;
  invalid: boolean;
  hasCount: boolean;
  systemChangedSinceDraft: boolean;
};

export type StockTakingFilter =
  | "ALL"
  | "PENDING_COUNT"
  | "WITH_DIFFERENCE"
  | "UNCHANGED"
  | "INVALID";

type UseStockTakingPageOptions = {
  initialStock: StockItem[];
  initialTakings: StockTakingSummary[];
};

const EPSILON = 0.000_001;

function quantitiesMatch(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON;
}

function formatQuantity(value: number) {
  return value.toFixed(3);
}

function mapTakingCounts(taking: StockTakingDetail) {
  return Object.fromEntries(
    taking.items.map((item) => [item.productId, formatQuantity(item.countedQuantity)]),
  );
}

export function useStockTakingPage({
  initialStock,
  initialTakings,
}: UseStockTakingPageOptions) {
  const notifier = useInventoryNotifier();
  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [takings, setTakings] = useState<StockTakingSummary[]>(initialTakings);
  const [activeTaking, setActiveTaking] = useState<StockTakingDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockTakingFilter>("PENDING_COUNT");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loadingTakingId, setLoadingTakingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savedSystemQuantities = useMemo(() => {
    return new Map(
      activeTaking?.items.map((item) => [item.productId, item.systemQuantity]) ?? [],
    );
  }, [activeTaking]);

  const rows = useMemo<StockTakingRow[]>(() => {
    return stock.map((item) => {
      const savedSystemQuantity =
        savedSystemQuantities.get(item.productId) ?? item.quantity;
      const countedQuantity = counts[item.productId] ?? "";

      if (!countedQuantity.trim()) {
        return {
          ...item,
          savedSystemQuantity,
          countedQuantity,
          countedValue: null,
          difference: null,
          invalid: false,
          hasCount: false,
          systemChangedSinceDraft:
            savedSystemQuantities.has(item.productId) &&
            !quantitiesMatch(item.quantity, savedSystemQuantity),
        };
      }

      const countedValue = Number(countedQuantity);
      const invalid =
        Number.isNaN(countedValue) || !Number.isFinite(countedValue) || countedValue < 0;

      return {
        ...item,
        savedSystemQuantity,
        countedQuantity,
        countedValue: invalid ? null : countedValue,
        difference: invalid ? null : countedValue - savedSystemQuantity,
        invalid,
        hasCount: true,
        systemChangedSinceDraft:
          savedSystemQuantities.has(item.productId) &&
          !quantitiesMatch(item.quantity, savedSystemQuantity),
      };
    });
  }, [counts, savedSystemQuantities, stock]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !normalized ||
        row.codigo.toLowerCase().includes(normalized) ||
        row.productName.toLowerCase().includes(normalized);

      if (!matchesSearch) {
        return false;
      }

      const keepVisibleWhileEditing = editingProductId === row.productId;

      switch (filter) {
        case "PENDING_COUNT":
          return !row.hasCount || keepVisibleWhileEditing;
        case "WITH_DIFFERENCE":
          return (
            keepVisibleWhileEditing ||
            (row.hasCount &&
              !row.invalid &&
              row.difference !== null &&
              !quantitiesMatch(row.difference, 0))
          );
        case "UNCHANGED":
          return (
            keepVisibleWhileEditing ||
            (row.hasCount &&
              !row.invalid &&
              row.difference !== null &&
              quantitiesMatch(row.difference, 0))
          );
        case "INVALID":
          return keepVisibleWhileEditing || (row.hasCount && row.invalid);
        case "ALL":
        default:
          return true;
      }
    });
  }, [editingProductId, filter, rows, search]);

  const summary = useMemo(() => {
    const countedRows = rows.filter((row) => row.hasCount);
    const invalidRows = countedRows.filter((row) => row.invalid);
    const rowsWithDifference = countedRows.filter(
      (row) => !row.invalid && row.difference !== null && !quantitiesMatch(row.difference, 0),
    );
    const unchangedRows = countedRows.filter(
      (row) => !row.invalid && row.difference !== null && quantitiesMatch(row.difference, 0),
    );

    return {
      totalItems: rows.length,
      countedItems: countedRows.length,
      invalidItems: invalidRows.length,
      rowsWithDifference: rowsWithDifference.length,
      unchangedItems: unchangedRows.length,
      pendingCountItems: rows.length - countedRows.length,
    };
  }, [rows]);

  const hasCapturedCounts = useMemo(
    () => rows.some((row) => row.hasCount),
    [rows],
  );

  const draftDirty = useMemo(() => {
    if (!activeTaking || activeTaking.status !== "DRAFT") {
      return false;
    }

    const normalizedNotes = notes.trim();
    const savedNotes = activeTaking.notes ?? "";

    if (normalizedNotes !== savedNotes) {
      return true;
    }

    const savedItems = new Map(
      activeTaking.items.map((item) => [item.productId, item.countedQuantity]),
    );
    const currentItems = rows
      .filter((row) => row.hasCount && !row.invalid && row.countedValue !== null)
      .map((row) => [row.productId, row.countedValue as number] as const);

    if (savedItems.size !== currentItems.length) {
      return true;
    }

    return currentItems.some(([productId, countedQuantity]) => {
      const savedQuantity = savedItems.get(productId);
      return savedQuantity === undefined || !quantitiesMatch(savedQuantity, countedQuantity);
    });
  }, [activeTaking, notes, rows]);

  const canEdit = activeTaking?.status !== "APPLIED";
  const canSaveDraft = canEdit && hasCapturedCounts && (!activeTaking || draftDirty);
  const canApplyTaking =
    canEdit &&
    (activeTaking
      ? activeTaking.status === "DRAFT" && !draftDirty
      : hasCapturedCounts);

  function updateCount(productId: string, value: string) {
    setCounts((current) => ({
      ...current,
      [productId]: value,
    }));
  }

  function startEditingCount(productId: string) {
    setEditingProductId(productId);
  }

  function finishEditingCount(productId: string) {
    setEditingProductId((current) => (current === productId ? null : current));
  }

  function fillWithSystemStock() {
    if (!canEdit) {
      return;
    }

    setCounts(
      Object.fromEntries(
        stock.map((item) => [
          item.productId,
          formatQuantity(savedSystemQuantities.get(item.productId) ?? item.quantity),
        ]),
      ),
    );
    notifier.info("Se copio el stock actual como conteo base");
  }

  function clearCounts() {
    if (!canEdit) {
      return;
    }

    setCounts({});
    notifier.info("Se limpiaron los conteos capturados");
  }

  function startNewTaking() {
    if (saving) {
      return;
    }

    setActiveTaking(null);
    setNotes("");
    setCounts({});
    setEditingProductId(null);
    notifier.info("Nueva toma lista para registrar conteos");
  }

  async function reloadStock() {
    const nextStock = await fetchStockTakingItems();
    setStock(nextStock);
  }

  async function reloadTakings() {
    const nextTakings = await fetchStockTakingSummaries();
    setTakings(nextTakings);
  }

  function buildDraftPayload() {
    const invalidRows = rows.filter((row) => row.hasCount && row.invalid);
    if (invalidRows.length > 0) {
      throw new Error("Corrige los conteos invalidos antes de continuar");
    }

    const items = rows
      .filter(
        (row) =>
          row.hasCount &&
          !row.invalid &&
          row.countedValue !== null,
      )
      .map((row) => ({
        productId: row.productId,
        countedQuantity: row.countedValue as number,
      }));

    if (items.length === 0) {
      throw new Error("Captura al menos un conteo antes de guardar la toma");
    }

    return {
      notes: notes.trim(),
      items,
    };
  }

  async function openTaking(id: string) {
    setLoadingTakingId(id);

    try {
      const detail = await fetchStockTakingDetail(id);
      setActiveTaking(detail);
      setNotes(detail.notes ?? "");
      setCounts(mapTakingCounts(detail));
      setEditingProductId(null);
    } catch (error) {
      notifier.apiError(error, "No se pudo abrir la toma de inventario");
    } finally {
      setLoadingTakingId(null);
    }
  }

  async function saveDraft() {
    if (!canEdit) {
      return;
    }

    setSaving(true);

    try {
      const payload = buildDraftPayload();
      const savedTaking = activeTaking
        ? await updateStockTakingDraft(activeTaking.id, payload)
        : await createStockTakingDraft(payload);

      setActiveTaking(savedTaking);
      setNotes(savedTaking.notes ?? "");
      setCounts(mapTakingCounts(savedTaking));
      await reloadTakings();
      notifier.saved(
        activeTaking
          ? `Toma #${savedTaking.takingNumber} actualizada`
          : `Toma #${savedTaking.takingNumber} guardada como borrador`,
      );
    } catch (error) {
      notifier.apiError(error, "No se pudo guardar la toma de inventario");
    } finally {
      setSaving(false);
    }
  }

  async function applyActiveTaking() {
    if (!canEdit) {
      return;
    }

    if (activeTaking && draftDirty) {
      notifier.error("Guarda el borrador antes de aplicar la toma");
      return;
    }

    setSaving(true);

    try {
      const draft =
        activeTaking ??
        (await createStockTakingDraft(buildDraftPayload()));
      const appliedTaking = await applyStockTakingDraft(draft.id);

      setActiveTaking(appliedTaking);
      setNotes(appliedTaking.notes ?? "");
      setCounts(mapTakingCounts(appliedTaking));
      await Promise.all([reloadStock(), reloadTakings()]);
      notifier.saved(`Toma #${appliedTaking.takingNumber} aplicada correctamente`);
    } catch (error) {
      notifier.apiError(error, "No se pudo aplicar la toma de inventario");
    } finally {
      setSaving(false);
    }
  }

  return {
    takings,
    activeTaking,
    notes,
    setNotes,
    filteredRows,
    search,
    setSearch,
    filter,
    setFilter,
    summary,
    saving,
    loadingTakingId,
    canEdit,
    canSaveDraft,
    canApplyTaking,
    draftDirty,
    updateCount,
    startEditingCount,
    finishEditingCount,
    fillWithSystemStock,
    clearCounts,
    startNewTaking,
    openTaking,
    saveDraft,
    applyActiveTaking,
  };
}
