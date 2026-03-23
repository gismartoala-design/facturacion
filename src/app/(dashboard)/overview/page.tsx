"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import type { BillingRuntime } from "@/modules/billing/policies/billing-runtime";
import {
  type PaginatedResult,
  type Product,
  type Quote,
  type SriInvoice,
  type StockItem,
} from "@/shared/dashboard/types";
import { OverviewOperationalDashboard } from "@/modules/overview/components/overview-operational-dashboard";

type BusinessOverviewContext = {
  enabledFeatures: string[];
  billingRuntime: BillingRuntime;
};

export default function OverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [openQuotes, setOpenQuotes] = useState<Quote[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [errorInvoices, setErrorInvoices] = useState<SriInvoice[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setMessage("");

      try {
        const business = await fetchJson<BusinessOverviewContext>("/api/v1/business");
        const quotesEnabled = business.enabledFeatures.includes("QUOTES");
        const billingEnabled =
          business.billingRuntime.capabilities.electronicBilling;

        const [productsRes, stockRes, openQuotesRes, pendingRes, errorRes] = await Promise.all([
          fetchJson<Product[]>("/api/v1/products"),
          fetchJson<StockItem[]>("/api/v1/stock"),
          quotesEnabled ? fetchJson<Quote[]>("/api/v1/quotes?status=OPEN") : Promise.resolve([]),
          billingEnabled
            ? fetchJson<PaginatedResult<SriInvoice>>("/api/v1/sri-invoices?status=PENDING_SRI&limit=100")
            : Promise.resolve({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
          billingEnabled
            ? fetchJson<PaginatedResult<SriInvoice>>("/api/v1/sri-invoices?status=ERROR&limit=100")
            : Promise.resolve({ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
        ]);

        setProducts(productsRes);
        setStock(stockRes);
        setOpenQuotes(openQuotesRes);
        setPendingInvoices(pendingRes.data);
        setErrorInvoices(errorRes.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Error al cargar datos");
      }
    }

    void loadData();
  }, []);

  return (
    <Stack>
      {message ? (
        <Alert
          severity="error"
          variant="filled"
          sx={{
            borderRadius: "18px",
            boxShadow: "0 18px 38px rgba(74, 60, 88, 0.12)",
          }}
        >
          {message}
        </Alert>
      ) : null}
      <OverviewOperationalDashboard
        products={products}
        stock={stock}
        openQuotes={openQuotes}
        pendingInvoices={pendingInvoices}
        errorInvoices={errorInvoices}
      />
    </Stack>
  );
}
