"use client";

import Stack from "@mui/material/Stack";
import { useCallback, useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import type { BillingRuntime } from "@/modules/billing/policies/billing-runtime";
import {
  type PaginatedResult,
  type Product,
  type Quote,
  type SriInvoice,
  type StockItem,
} from "@/shared/dashboard/types";
import { PageErrorState } from "@/shared/states/page-error-state";
import { PageLoadingState } from "@/shared/states/page-loading-state";
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

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
      setLoadError(error instanceof Error ? error.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !products.length && !stock.length) {
    return <PageLoadingState message="Cargando resumen operativo..." centered />;
  }

  if (loadError && !products.length && !stock.length) {
    return <PageErrorState message={loadError} onRetry={() => void loadData()} />;
  }

  return (
    <Stack>
      {loadError ? <PageErrorState message={loadError} onRetry={() => void loadData()} /> : null}
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
