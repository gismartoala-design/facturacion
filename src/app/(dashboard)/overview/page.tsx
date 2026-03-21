"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { useEffect, useState } from "react";

import { fetchJson } from "@/shared/dashboard/api";
import {
  type PaginatedResult,
  type Product,
  type Quote,
  type SriInvoice,
  type StockItem,
} from "@/shared/dashboard/types";
import { OverviewOperationalDashboard } from "@/modules/overview/components/overview-operational-dashboard";

type SessionInfo = {
  features: string[];
};

export default function OverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [openQuotes, setOpenQuotes] = useState<Quote[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<SriInvoice[]>([]);
  const [errorInvoices, setErrorInvoices] = useState<SriInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      try {
        const session = await fetchJson<SessionInfo>("/api/v1/auth/me");
        const quotesEnabled = session.features.includes("QUOTES");
        const billingEnabled = session.features.includes("BILLING");

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
      } finally {
        setLoading(false);
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
