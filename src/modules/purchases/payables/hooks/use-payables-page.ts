"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  fetchPayables,
  registerSupplierPayment,
  voidSupplierPayment,
} from "../services/payables-client";
import type {
  AccountsPayable,
  SupplierPayment,
  SupplierPaymentForm,
} from "../types";

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

type UsePayablesPageOptions = {
  initialPayables: AccountsPayable[];
  initialError?: string | null;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyPaymentForm(): SupplierPaymentForm {
  return {
    amount: "",
    paymentMethod: "20",
    externalReference: "",
    notes: "",
    paidAt: todayInputValue(),
  };
}

export function usePayablesPage({
  initialPayables,
  initialError = null,
}: UsePayablesPageOptions) {
  const [payables, setPayables] = useState(initialPayables);
  const [feedback, setFeedback] = useState<FeedbackState>(
    initialError ? { message: initialError, severity: "error" } : null,
  );
  const [payingPayable, setPayingPayable] = useState<AccountsPayable | null>(
    null,
  );
  const [paymentForm, setPaymentForm] = useState<SupplierPaymentForm>(
    createEmptyPaymentForm,
  );
  const [voidingPayment, setVoidingPayment] = useState<{
    payable: AccountsPayable;
    payment: SupplierPayment;
  } | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const summary = useMemo(() => {
    return payables.reduce(
      (current, payable) => ({
        openCount:
          current.openCount +
          (["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(payable.status)
            ? 1
            : 0),
        pendingTotal: current.pendingTotal + payable.pendingAmount,
        overdueTotal:
          current.overdueTotal +
          (payable.status === "OVERDUE" ? payable.pendingAmount : 0),
      }),
      { openCount: 0, pendingTotal: 0, overdueTotal: 0 },
    );
  }, [payables]);

  async function reloadPayables() {
    const nextPayables = await fetchPayables();
    setPayables(nextPayables);
  }

  function openPaymentDialog(payable: AccountsPayable) {
    setPayingPayable(payable);
    setPaymentForm({
      ...createEmptyPaymentForm(),
      amount: payable.pendingAmount.toFixed(2),
    });
    setFeedback(null);
  }

  function closePaymentDialog() {
    if (saving) return;
    setPayingPayable(null);
    setPaymentForm(createEmptyPaymentForm());
  }

  function openVoidPaymentDialog(
    payable: AccountsPayable,
    payment: SupplierPayment,
  ) {
    setVoidingPayment({ payable, payment });
    setVoidReason("");
    setFeedback(null);
  }

  function closeVoidPaymentDialog() {
    if (voiding) return;
    setVoidingPayment(null);
    setVoidReason("");
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payingPayable) return;

    setSaving(true);
    setFeedback(null);

    try {
      const updatedPayable = await registerSupplierPayment(
        payingPayable.id,
        paymentForm,
      );
      setPayables((prev) =>
        prev.map((payable) =>
          payable.id === updatedPayable.id ? updatedPayable : payable,
        ),
      );
      setPayingPayable(null);
      setPaymentForm(createEmptyPaymentForm());
      setFeedback({
        message: `Pago registrado. Secuencial #${updatedPayable.payments[0]?.supplierPaymentNumber ?? ""}`,
        severity: "success",
      });
      await reloadPayables();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "No se pudo registrar pago",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleVoidPayment() {
    if (!voidingPayment) return;

    setVoiding(true);
    setFeedback(null);

    try {
      const updatedPayable = await voidSupplierPayment(
        voidingPayment.payment.id,
        voidReason,
      );
      setPayables((prev) =>
        prev.map((payable) =>
          payable.id === updatedPayable.id ? updatedPayable : payable,
        ),
      );
      setVoidingPayment(null);
      setVoidReason("");
      setFeedback({
        message: `Pago #${voidingPayment.payment.supplierPaymentNumber} anulado correctamente`,
        severity: "success",
      });
      await reloadPayables();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "No se pudo anular pago",
        severity: "error",
      });
    } finally {
      setVoiding(false);
    }
  }

  return {
    payables,
    summary,
    feedback,
    payingPayable,
    paymentForm,
    setPaymentForm,
    saving,
    voidingPayment,
    voidReason,
    setVoidReason,
    voiding,
    openPaymentDialog,
    closePaymentDialog,
    openVoidPaymentDialog,
    closeVoidPaymentDialog,
    handlePaymentSubmit,
    handleVoidPayment,
  };
}
