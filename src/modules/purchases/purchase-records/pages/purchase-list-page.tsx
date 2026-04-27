"use client";

import { useState } from "react";

import { usePurchasesNotifier } from "@/shared/notifications/notifier-presets";
import { PageErrorState } from "@/shared/states/page-error-state";

import {
  PurchasesSection,
  VoidPurchaseDialog,
} from "../components/purchases-section";
import { voidPurchase } from "../services/purchases-client";
import type { Purchase } from "../types";

type PurchaseListPageProps = {
  purchases: Purchase[];
  initialError?: string | null;
};

export function PurchaseListPage({
  purchases: initialPurchases,
  initialError = null,
}: PurchaseListPageProps) {
  const notifier = usePurchasesNotifier();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  if (initialError) {
    return <PageErrorState message={initialError} />;
  }

  function openVoidDialog(purchase: Purchase) {
    setVoidingPurchase(purchase);
    setVoidReason("");
  }

  function closeVoidDialog() {
    if (voiding) return;
    setVoidingPurchase(null);
    setVoidReason("");
  }

  async function handleVoidPurchase() {
    if (!voidingPurchase) return;
    setVoiding(true);
    try {
      const updated = await voidPurchase(voidingPurchase.id, voidReason);
      setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setVoidingPurchase(null);
      setVoidReason("");
      notifier.deleted("Compra anulada y stock revertido correctamente");
    } catch (error) {
      notifier.apiError(error, "No se pudo anular compra");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <>
      <PurchasesSection purchases={purchases} onVoidPurchase={openVoidDialog} />
      <VoidPurchaseDialog
        isOpen={voidingPurchase !== null}
        purchase={voidingPurchase}
        reason={voidReason}
        saving={voiding}
        onReasonChange={setVoidReason}
        onClose={closeVoidDialog}
        onConfirm={handleVoidPurchase}
      />
    </>
  );
}
