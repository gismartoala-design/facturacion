"use client";

import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Loader2 } from "lucide-react";

import { OpenQuotesDialog } from "@/modules/sales/components/open-quotes-dialog";
import { SalesCheckoutSection } from "@/modules/sales/components/sales-checkout-section";
import {
  SalesMessagePopover,
} from "@/modules/sales/components/sales-message-popover";
import { useSalesCheckoutPage } from "@/modules/sales/hooks/use-sales-checkout-page";

export default function CheckoutPage() {
  const salesPage = useSalesCheckoutPage();

  if (salesPage.loading) {
    return (
      <Paper
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
        <Loader2 className="h-4 w-4 animate-spin" />
        <Typography>Cargando checkout...</Typography>
      </Paper>
    );
  }

  return (
    <>
      {salesPage.saving ? (
        <Backdrop
          open
          sx={{
            zIndex: (theme) => theme.zIndex.modal + 1,
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            backdropFilter: "blur(1px)",
          }}
        >
          <Paper
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              borderRadius: "18px",
              border: "1px solid rgba(226, 232, 240, 1)",
              px: 2,
              py: 1.5,
              color: "#475569",
            }}
          >
            <CircularProgress size={18} thickness={5} />
            {salesPage.isQuoteMode
              ? "Guardando cotizacion..."
              : "Registrando venta y preparando documento..."}
          </Paper>
        </Backdrop>
      ) : null}
      <SalesMessagePopover
        message={salesPage.message}
        onClose={() => salesPage.setMessage(null)}
      />
      <SalesCheckoutSection
        mode={salesPage.mode}
        products={salesPage.products}
        customers={salesPage.customers}
        checkout={salesPage.checkout}
        setCheckout={salesPage.setCheckout}
        linePreview={salesPage.linePreview}
        checkoutSubtotal={salesPage.checkoutSubtotal}
        checkoutTax={salesPage.checkoutTax}
        checkoutTotal={salesPage.checkoutTotal}
        inventoryTrackingEnabled={salesPage.inventoryTrackingEnabled}
        selectedIdentificationType={salesPage.selectedIdentificationType}
        selectedPaymentMethod={salesPage.selectedPaymentMethod}
        canPrintPdf={Boolean(salesPage.printableSaleId)}
        canPrintQuote={salesPage.isQuoteMode && Boolean(salesPage.editingQuoteId)}
        canResetCheckout={salesPage.canResetCheckout}
        saving={salesPage.saving}
        savingQuote={salesPage.savingQuote}
        editingQuoteId={salesPage.editingQuoteId}
        onPrintPdf={salesPage.handlePrintPdf}
        onPrintQuote={salesPage.handlePrintQuote}
        onCancelEdit={salesPage.onCancelEdit}
        onOpenQuotesModal={salesPage.onOpenQuotesModal}
        onResetCheckout={salesPage.onResetCheckout}
        onSubmit={salesPage.handleSubmit}
        onSearchCustomerByIdentification={salesPage.searchCustomerByIdentification}
        onApplyWalkInCustomer={salesPage.applyWalkInCustomer}
        onSelectCustomer={salesPage.selectCustomer}
        customerSearch={salesPage.customerSearch}
        setCustomerSearch={salesPage.setCustomerSearch}
        customerLoading={salesPage.customerLoading}
        barcodeQuery={salesPage.barcodeQuery}
        setBarcodeQuery={salesPage.setBarcodeQuery}
        entryQuantity={salesPage.entryQuantity}
        setEntryQuantity={salesPage.setEntryQuantity}
        manualProduct={salesPage.manualProduct}
        setManualProduct={salesPage.setManualProduct}
        onAddByCode={salesPage.handleAddByCode}
        onAddManualProduct={salesPage.handleAddManualProduct}
        updateLineByProduct={salesPage.updateLineByProduct}
        removeLine={salesPage.removeLine}
      />

      <OpenQuotesDialog
        isOpen={salesPage.isQuotesModalOpen}
        loading={salesPage.quotesLoading}
        saving={salesPage.saving}
        quotes={salesPage.quotes}
        onClose={() => salesPage.setIsQuotesModalOpen(false)}
        onLoadQuote={(quoteId) => {
          void salesPage.loadQuoteById(quoteId, false);
        }}
      />
    </>
  );
}
