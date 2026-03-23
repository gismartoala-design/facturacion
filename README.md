# ARGSOFT MVP - Inventario, Ventas y Facturacion SRI

Monolito con Next.js + PostgreSQL + Prisma para:

1. Gestionar productos con secuencial interno.
2. Controlar stock y movimientos.
3. Ejecutar checkout de venta (cabecera + items + pago).
4. Integrar facturacion SRI en el mismo flujo (create + authorize).
5. Operar reintentos y reimpresion XML/RIDE.

## Stack

1. Next.js (App Router) + TypeScript
2. PostgreSQL
3. Prisma ORM
4. UI estilo shadcn (componentes reutilizables en `src/components/ui`)

## Setup local

1. Copia variables de entorno:

```bash
cp .env.example .env
```

2. Instala dependencias:

```bash
npm install
```

3. Genera cliente Prisma:

```bash
npm run prisma:generate
```

4. Aplica esquema a PostgreSQL (MVP):

```bash
npm run db:push
```

5. Inicia app:

```bash
npm run dev
```

## Variables de entorno

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arg_mvp?schema=public"
SRI_BASE_URL="http://localhost:3000"
SRI_TIMEOUT_MS="15000"
```

## Endpoints principales

1. `GET /api/v1/products`
2. `POST /api/v1/products`
3. `GET /api/v1/stock`
4. `POST /api/v1/stock/adjustments`
5. `POST /api/v1/sales/checkout`
6. `GET /api/v1/sri-invoices?status=PENDING_SRI`
7. `POST /api/v1/sri-invoices/{id}/retry`
8. `GET /api/v1/sri-invoices/{id}/xml`
9. `GET /api/v1/sri-invoices/{id}/ride`

## Flujo unico de checkout

1. Valida stock.
2. Crea venta + items + pagos.
3. Descuenta stock y registra movimientos.
4. Crea factura en servicio SRI.
5. Intenta autorizar en SRI.
6. Guarda estado final (`AUTHORIZED` o `PENDING_SRI`).

## Documento funcional y arquitectura

Ver documento completo en:

- `docs/mvp-inventario-ventas-sri.md`
- `docs/core-modular-architecture.md`
- `docs/phase-1-core-alignment.md`
- `docs/platform-composition-blueprints.md`
