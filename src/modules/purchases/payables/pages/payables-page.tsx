"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

import {
  PayablesSection,
  SupplierPaymentDialog,
  VoidSupplierPaymentDialog,
} from "../components/payables-section";
import { usePayablesPage } from "../hooks/use-payables-page";
import type { AccountsPayable } from "../types";

type PayablesPageProps = {
  initialPayables: AccountsPayable[];
  initialError?: string | null;
};

export function PayablesPage({
  initialPayables,
  initialError = null,
}: PayablesPageProps) {
  const payablesPage = usePayablesPage({
    initialPayables,
    initialError,
  });

  return (
    <Stack spacing={2.5}>
      {payablesPage.feedback ? (
        <Alert severity={payablesPage.feedback.severity}>
          {payablesPage.feedback.message}
        </Alert>
      ) : null}

      <PayablesSection
        payables={payablesPage.payables}
        summary={payablesPage.summary}
        onOpenPaymentDialog={payablesPage.openPaymentDialog}
        onOpenVoidPaymentDialog={payablesPage.openVoidPaymentDialog}
      />

      <SupplierPaymentDialog
        payable={payablesPage.payingPayable}
        form={payablesPage.paymentForm}
        setForm={payablesPage.setPaymentForm}
        saving={payablesPage.saving}
        onClose={payablesPage.closePaymentDialog}
        onSubmit={payablesPage.handlePaymentSubmit}
      />

      <VoidSupplierPaymentDialog
        voidingPayment={payablesPage.voidingPayment}
        reason={payablesPage.voidReason}
        saving={payablesPage.voiding}
        onReasonChange={payablesPage.setVoidReason}
        onClose={payablesPage.closeVoidPaymentDialog}
        onConfirm={() => {
          void payablesPage.handleVoidPayment();
        }}
      />
    </Stack>
  );
}
