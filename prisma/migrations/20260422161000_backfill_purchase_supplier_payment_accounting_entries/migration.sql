-- Backfill posted accounting entries for purchases created before automatic purchase accounting.
WITH candidates AS (
    SELECT
        (md5(random()::text || clock_timestamp()::text || p."id"::text || 'purchase-entry'))::uuid AS "entryId",
        p."id" AS "purchaseId",
        p."businessId",
        p."subtotal",
        p."taxTotal",
        p."total",
        p."createdAt",
        COALESCE(SUM(CASE WHEN pr."tipoProducto" = 'BIEN' THEN pi."subtotal" ELSE 0 END), 0) AS "inventorySubtotal",
        COALESCE(SUM(CASE WHEN pr."tipoProducto" <> 'BIEN' THEN pi."subtotal" ELSE 0 END), 0) AS "serviceSubtotal",
        COALESCE((
            SELECT MAX(ae."entryNumber")
            FROM "AccountingEntry" ae
            WHERE ae."businessId" = p."businessId"
        ), 0) + ROW_NUMBER() OVER (
            PARTITION BY p."businessId"
            ORDER BY p."createdAt", p."id"
        ) AS "entryNumber"
    FROM "Purchase" p
    JOIN "PurchaseItem" pi ON pi."purchaseId" = p."id"
    JOIN "Product" pr ON pr."id" = pi."productId"
    WHERE p."status" = 'POSTED'
      AND NOT EXISTS (
          SELECT 1
          FROM "AccountingEntry" ae
          WHERE ae."businessId" = p."businessId"
            AND ae."sourceType" = 'PURCHASE'
            AND ae."sourceId" = p."id"
      )
    GROUP BY p."id"
),
inserted_entries AS (
    INSERT INTO "AccountingEntry" (
        "id",
        "businessId",
        "entryNumber",
        "sourceType",
        "sourceId",
        "status",
        "postedAt",
        "createdAt",
        "updatedAt"
    )
    SELECT
        c."entryId",
        c."businessId",
        c."entryNumber",
        'PURCHASE'::"AccountingSourceType",
        c."purchaseId",
        'POSTED'::"AccountingEntryStatus",
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM candidates c
    RETURNING "id", "sourceId"
),
entry_lines AS (
    SELECT
        (md5(random()::text || clock_timestamp()::text || c."purchaseId"::text || 'inventory'))::uuid AS "id",
        c."entryId",
        '110401' AS "accountCode",
        c."inventorySubtotal" AS "debit",
        0::numeric AS "credit",
        'Ingreso de inventario por compra' AS "memo"
    FROM candidates c
    WHERE c."inventorySubtotal" > 0

    UNION ALL

    SELECT
        (md5(random()::text || clock_timestamp()::text || c."purchaseId"::text || 'service'))::uuid AS "id",
        c."entryId",
        '510205' AS "accountCode",
        c."serviceSubtotal" AS "debit",
        0::numeric AS "credit",
        'Servicio recibido de proveedor' AS "memo"
    FROM candidates c
    WHERE c."serviceSubtotal" > 0

    UNION ALL

    SELECT
        (md5(random()::text || clock_timestamp()::text || c."purchaseId"::text || 'vat'))::uuid AS "id",
        c."entryId",
        '110501' AS "accountCode",
        c."taxTotal" AS "debit",
        0::numeric AS "credit",
        'IVA credito tributario en compra' AS "memo"
    FROM candidates c
    WHERE c."taxTotal" > 0

    UNION ALL

    SELECT
        (md5(random()::text || clock_timestamp()::text || c."purchaseId"::text || 'ap'))::uuid AS "id",
        c."entryId",
        '210101' AS "accountCode",
        0::numeric AS "debit",
        c."total" AS "credit",
        'Cuenta por pagar a proveedor' AS "memo"
    FROM candidates c
)
INSERT INTO "AccountingEntryLine" (
    "id",
    "entryId",
    "accountCode",
    "debit",
    "credit",
    "memo",
    "createdAt"
)
SELECT
    el."id",
    el."entryId",
    el."accountCode",
    el."debit",
    el."credit",
    el."memo",
    CURRENT_TIMESTAMP
FROM entry_lines el
JOIN inserted_entries ie ON ie."id" = el."entryId";

-- Backfill posted accounting entries for supplier payments created before automatic payment accounting.
WITH candidates AS (
    SELECT
        (md5(random()::text || clock_timestamp()::text || sp."id"::text || 'supplier-payment-entry'))::uuid AS "entryId",
        sp."id" AS "paymentId",
        sp."businessId",
        sp."amount",
        sp."paymentMethod",
        sp."createdAt",
        COALESCE((
            SELECT MAX(ae."entryNumber")
            FROM "AccountingEntry" ae
            WHERE ae."businessId" = sp."businessId"
        ), 0) + ROW_NUMBER() OVER (
            PARTITION BY sp."businessId"
            ORDER BY sp."createdAt", sp."id"
        ) AS "entryNumber"
    FROM "SupplierPayment" sp
    WHERE sp."status" = 'APPLIED'
      AND NOT EXISTS (
          SELECT 1
          FROM "AccountingEntry" ae
          WHERE ae."businessId" = sp."businessId"
            AND ae."sourceType" = 'SUPPLIER_PAYMENT'
            AND ae."sourceId" = sp."id"
      )
),
inserted_entries AS (
    INSERT INTO "AccountingEntry" (
        "id",
        "businessId",
        "entryNumber",
        "sourceType",
        "sourceId",
        "status",
        "postedAt",
        "createdAt",
        "updatedAt"
    )
    SELECT
        c."entryId",
        c."businessId",
        c."entryNumber",
        'SUPPLIER_PAYMENT'::"AccountingSourceType",
        c."paymentId",
        'POSTED'::"AccountingEntryStatus",
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM candidates c
    RETURNING "id", "sourceId"
),
entry_lines AS (
    SELECT
        (md5(random()::text || clock_timestamp()::text || c."paymentId"::text || 'ap-debit'))::uuid AS "id",
        c."entryId",
        '210101' AS "accountCode",
        c."amount" AS "debit",
        0::numeric AS "credit",
        'Pago aplicado a proveedor' AS "memo"
    FROM candidates c

    UNION ALL

    SELECT
        (md5(random()::text || clock_timestamp()::text || c."paymentId"::text || 'cash-credit'))::uuid AS "id",
        c."entryId",
        CASE WHEN c."paymentMethod" = '01' THEN '110201' ELSE '110301' END AS "accountCode",
        0::numeric AS "debit",
        c."amount" AS "credit",
        'Salida de fondos por pago a proveedor' AS "memo"
    FROM candidates c
)
INSERT INTO "AccountingEntryLine" (
    "id",
    "entryId",
    "accountCode",
    "debit",
    "credit",
    "memo",
    "createdAt"
)
SELECT
    el."id",
    el."entryId",
    el."accountCode",
    el."debit",
    el."credit",
    el."memo",
    CURRENT_TIMESTAMP
FROM entry_lines el
JOIN inserted_entries ie ON ie."id" = el."entryId";
