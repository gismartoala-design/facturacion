-- Backfill accounts payable for purchases registered before the payable module.
INSERT INTO "AccountsPayable" (
    "id",
    "businessId",
    "supplierId",
    "purchaseId",
    "documentType",
    "documentNumber",
    "currency",
    "issuedAt",
    "dueAt",
    "originalAmount",
    "paidAmount",
    "pendingAmount",
    "status",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    (md5(random()::text || clock_timestamp()::text || p."id"::text))::uuid,
    p."businessId",
    p."supplierId",
    p."id",
    p."documentType",
    p."documentNumber",
    'USD',
    p."issuedAt",
    p."issuedAt" + (s."diasCredito" * INTERVAL '1 day'),
    p."total",
    0,
    CASE
      WHEN p."status" = 'VOIDED' THEN 0
      ELSE p."total"
    END,
    CASE
      WHEN p."status" = 'VOIDED' THEN 'CANCELLED'::"AccountsPayableStatus"
      WHEN p."issuedAt" + (s."diasCredito" * INTERVAL '1 day') < CURRENT_TIMESTAMP THEN 'OVERDUE'::"AccountsPayableStatus"
      ELSE 'OPEN'::"AccountsPayableStatus"
    END,
    CASE
      WHEN p."status" = 'VOIDED' THEN 'Generada y cancelada por backfill desde compra anulada'
      ELSE 'Generada por backfill desde compra registrada'
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Purchase" p
JOIN "Supplier" s ON s."id" = p."supplierId"
WHERE NOT EXISTS (
    SELECT 1
    FROM "AccountsPayable" ap
    WHERE ap."purchaseId" = p."id"
);
