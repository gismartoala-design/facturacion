# Plan Definitivo de Desarrollo

## Cobros, Caja, Cartera y Base Contable sobre Composition Blueprints

## 1. Proposito

Definir un plan definitivo de desarrollo para extender el sistema actual hacia un modelo mas robusto de:

- ventas POS contado;
- ventas directas a credito;
- cobros inmediatos y posteriores;
- cierre de caja con conciliacion real;
- cuentas por cobrar;
- reportes operativos y financieros;
- base contable formal.

El objetivo es hacerlo sin romper lo existente, aprovechando la arquitectura actual del proyecto:

- dominio modular;
- composition blueprints;
- runtimes por modulo;
- politicas por capability;
- transacciones de venta ya implementadas.

## 2. Resumen ejecutivo

La propuesta recomendada es:

- mantener `Sale` como verdad del hecho comercial;
- mantener `SalePayment` como composicion o condicion de pago;
- introducir `Collection` como ledger del dinero realmente recibido;
- introducir `CollectionApplication` como aplicacion del cobro;
- introducir `AccountsReceivable` como control formal de saldo pendiente;
- mantener `CashSession`, `CashMovement` y `CashReconciliation` para operacion de caja;
- introducir `AccountingEntry` y `AccountingEntryLine` como base contable.

### Decisiones clave

1. No reinterpretar `SalePayment` como si fuera cobro real.
2. No seguir usando `CashMovement` para duplicar ventas o cobros comerciales.
3. Hacer que caja consuma cobros efectivos que afecten caja.
4. Hacer que cartera consuma aplicaciones de cobro.
5. Hacer que contabilidad consuma eventos fuente claros.

## 3. Encaje con la arquitectura actual

## 3.1 Mapa actual de módulos

Hoy el blueprint soporta:

- `POS`
- `BILLING`
- `QUOTES`
- `REPORTS`
- `ACCOUNTS_RECEIVABLE`
- `CASH_MANAGEMENT`

Referencias:

- [contracts.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/platform/contracts.ts)
- [business-blueprint.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/platform/business-blueprint.ts)
- [catalog.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/platform/catalog.ts)

## 3.2 Mapa funcional recomendado por modulo

### `POS`

Responsable de:

- captura de venta mostrador;
- cobro inmediato;
- integracion con caja activa;
- impresion operativa;
- politicas de venta rapida.

### `BILLING`

Responsable de:

- documentos de venta;
- numeracion;
- SRI;
- estados documentales.

### `QUOTES`

Responsable de:

- cotizaciones;
- conversion a venta;
- seguimiento comercial previo.

### `CASH_MANAGEMENT`

Responsable de:

- apertura;
- cierre;
- arqueo;
- movimientos manuales;
- conciliacion de caja;
- lectura de cobros que afectan efectivo.

### `ACCOUNTS_RECEIVABLE`

Responsable de:

- cuentas por cobrar;
- cobros;
- aplicaciones;
- saldos pendientes;
- vencimientos;
- historico de recaudo.

### `REPORTS`

Responsable de:

- reportes comerciales;
- reportes de medios de pago;
- reportes de cobro;
- reportes de caja;
- reportes de cartera.

## 3.3 Donde debe vivir cada entidad nueva

### Dominio comercial

- `Sale`
- `SaleItem`
- `SalePayment`
- `SaleDocument`
- `SriInvoice`

### Dominio de cobranza y cartera

- `Collection`
- `CollectionApplication`
- `AccountsReceivable`

Este bloque debe vivir funcionalmente bajo `ACCOUNTS_RECEIVABLE`.

### Dominio de caja

- `CashSession`
- `CashMovement`
- `CashReconciliation`

Este bloque ya vive correctamente bajo `CASH_MANAGEMENT`.

### Dominio contable

- `AccountingEntry`
- `AccountingEntryLine`

### Decision importante de bajo impacto

No recomiendo introducir de inmediato un nuevo `ModuleKey` para contabilidad si el objetivo inicial es bajo impacto.

Primera etapa:

- implementar contabilidad como subdominio interno;
- no exponerla aun como modulo editable en Company Settings;
- activar su uso desde servicios.

Segunda etapa:

- si negocio lo necesita, agregar un futuro modulo `ACCOUNTING`.

Esto reduce impacto en:

- contratos de plataforma;
- UI de company settings;
- catálogos de modulo;
- migraciones de blueprint;
- guards y resolvers.

## 4. Modelo funcional definitivo

## 4.1 Venta

Representa el hecho comercial.

Debe responder:

- que se vendio;
- a quien;
- total;
- impuestos;
- descuentos;
- origen `POS` o `DIRECT_SALE`;
- sesion de caja si aplica.

### Cambio concreto

Agregar `cashSessionId` en `Sale`.

### Justificacion

- permite amarrar la venta al contexto operativo;
- simplifica trazabilidad en POS;
- no rompe ventas directas, porque puede ser nullable.

## 4.2 SalePayment

Debe redefinirse formalmente como:

> composicion de pago capturada o condicion de cancelacion.

No como ledger del dinero.

### Ejemplos

- efectivo 10, tarjeta 20;
- credito total;
- transferencia pactada;
- mixta.

### Regla

`SalePayment` no reemplaza:

- `Collection`
- `CollectionApplication`
- `AccountsReceivable`

## 4.3 Collection

Representa dinero realmente recibido.

### Campos minimos recomendados

- `id`
- `customerId`
- `cashSessionId?`
- `collectionDate`
- `amount`
- `paymentMethod`
- `status`
- `affectsCashDrawer`
- `requiresBankReconciliation`
- `externalReference?`
- `registeredById`
- `notes?`

### Estados minimos

- `PENDING`
- `APPLIED`
- `VOIDED`
- `REVERSED`
- `REFUNDED`

### Regla

`Collection` no debe depender obligatoriamente de una sola venta.

## 4.4 CollectionApplication

Representa la aplicacion del dinero recibido.

### Campos minimos recomendados

- `id`
- `collectionId`
- `receivableId?`
- `saleId?`
- `appliedAmount`
- `appliedAt`
- `status`
- `createdById`

### Regla fuerte

Debe permitir:

- una collection aplicada a varias deudas;
- una venta con varios cobros;
- anticipo sin aplicacion inmediata;
- reaplicacion o reverso.

## 4.5 AccountsReceivable

Representa cartera pendiente.

### Campos minimos recomendados

- `id`
- `customerId`
- `saleId?`
- `documentType`
- `documentId`
- `issuedAt`
- `dueAt`
- `originalAmount`
- `appliedAmount`
- `pendingAmount`
- `status`
- `currency`

### Estados minimos

- `OPEN`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `CANCELLED`

### Regla

No se crea para toda venta.
Se crea solo si queda saldo pendiente.

## 4.6 CashMovement

Debe quedar solo para movimientos de caja no comerciales o correctivos:

- `OPENING_FLOAT`
- `MANUAL_IN`
- `WITHDRAWAL`
- `REFUND_OUT`
- `CLOSING_ADJUSTMENT`

### Decision de legado

`SALE_CASH_IN` debe quedar solo como compatibilidad historica.
No debe generarse en operaciones nuevas una vez implementado `Collection`.

## 4.7 AccountingEntry

Representa asiento contable formal.

### Campos minimos recomendados

- `id`
- `sourceType`
- `sourceId`
- `status`
- `postedAt`
- `createdAt`

## 4.8 AccountingEntryLine

Representa lineas del asiento.

### Campos minimos recomendados

- `id`
- `entryId`
- `accountCode`
- `debit`
- `credit`
- `memo?`

## 5. Modelo de comportamiento por flujo

## 5.1 POS contado

En una misma transaccion:

- `Sale`
- `SaleItem`
- `SalePayment`
- `Collection`
- `CollectionApplication`
- `SaleDocument`
- `SriInvoice` si aplica
- `sale.cashSessionId`

### Regla

Si el medio afecta caja fisica:

- `Collection.cashSessionId = caja activa`
- `Collection.affectsCashDrawer = true`

## 5.2 POS mixto

Ejemplo:

- venta 30
- 10 efectivo
- 20 tarjeta

Resultado:

- 1 `Sale`
- 2 `SalePayment`
- 2 `Collection`
- 2 `CollectionApplication`

Solo la collection en efectivo impacta caja fisica.

## 5.3 Venta directa a credito

En una misma transaccion:

- `Sale`
- `SaleItem`
- `SalePayment`
- `SaleDocument`
- `AccountsReceivable`

Si hubo abono inicial:

- `Collection`
- `CollectionApplication`

## 5.4 Cobro posterior

En una misma transaccion:

- `Collection`
- `CollectionApplication`
- actualizacion de `AccountsReceivable`

Si el cobro es efectivo y afecta caja:

- requiere caja abierta segun politica;
- `cashSessionId` debe persistirse en `Collection`.

## 5.5 Devolucion o reverso

Si sale dinero fisico:

- `CashMovement(REFUND_OUT)`

Si ademas el cobro debe revertirse:

- `Collection.status = REFUNDED` o `REVERSED`
- reversal en `CollectionApplication`
- ajuste de `AccountsReceivable` si corresponde

## 6. Formula definitiva de cierre de caja

```text
esperado en caja =
  apertura
  + cobros efectivos en efectivo de la sesion
  + aportes
  - retiros
  - devoluciones reales
  + ajustes netos
```

### Fuente de cada componente

- apertura: `CashMovement(OPENING_FLOAT)`
- cobros efectivos: `Collection` con `affectsCashDrawer = true`, `status = APPLIED`, `cashSessionId = session.id`
- aportes: `CashMovement(MANUAL_IN)`
- retiros: `CashMovement(WITHDRAWAL)`
- devoluciones: `CashMovement(REFUND_OUT)`
- ajustes: `CashMovement(CLOSING_ADJUSTMENT)`

## 7. Blueprint y capabilities recomendadas

## 7.1 Reutilizacion de blueprint actual

### Sin cambios inmediatos

Usar:

- `POS`
- `CASH_MANAGEMENT`
- `ACCOUNTS_RECEIVABLE`
- `REPORTS`
- `BILLING`

Esto evita impacto fuerte en plataforma.

## 7.2 Capabilities recomendadas a agregar

Para una segunda iteracion de blueprint, recomiendo agregar:

### Bajo `ACCOUNTS_RECEIVABLE`

- `AR_PARTIAL_COLLECTIONS`
- `AR_MULTI_DOCUMENT_APPLICATION`
- `AR_ADVANCES`
- `AR_OVERDUE_TRACKING`

### Bajo `CASH_MANAGEMENT`

- `CASH_COLLECTION_SUMMARY_BY_METHOD`
- `CASH_POST_CLOSE_ADJUSTMENTS`

### Contabilidad futura

Si luego se formaliza como modulo:

- `ACCOUNTING_AUTO_POSTING`
- `ACCOUNTING_MANUAL_ADJUSTMENTS`
- `ACCOUNTING_REVERSALS`

### Importante

Estas capabilities no deben implementarse en la primera fase si el objetivo es bajo impacto.
Primero se construye el dominio funcional.
Luego se expone en composition blueprints.

## 8. Impacto esperado

## 8.1 Impacto bajo

- agregar `cashSessionId` a `Sale`
- crear nuevas tablas
- crear nuevos servicios
- crear nuevos reportes

## 8.2 Impacto medio

- ajustar cierre de caja para leer `Collection`
- ajustar POS checkout
- ajustar venta directa cuando entre cartera

## 8.3 Impacto alto pero diferible

- exponer nuevas capabilities en Company Settings
- agregar modulo contable al catálogo de plataforma
- migrar historicos si se decide limpiar legado

## 9. Reporte de implementacion recomendado

## 9.1 Lo que se va a construir

### Dominio de cobranza

- `Collection`
- `CollectionApplication`
- servicios de registro y aplicación

### Dominio de cartera

- `AccountsReceivable`
- servicios de creacion, recalculo y estado

### Caja robusta

- recalculo desde collections efectivas
- snapshot extendido en `CashReconciliation`

### Contabilidad base

- `AccountingEntry`
- `AccountingEntryLine`
- posting por evento

## 9.2 Lo que no se reemplaza

- `Sale`
- `SaleItem`
- `SalePayment`
- `SaleDocument`
- `SriInvoice`
- `CashSession`
- `CashMovement`

## 9.3 Lo que cambia de comportamiento

- `SALE_CASH_IN` deja de ser la via principal
- cierre de caja deja de depender de pagos declarados
- caja pasa a consumir cobros efectivos
- ventas a credito pasan a tener cartera formal

## 10. Plan de desarrollo por fases

## Fase 1. Base de datos y contratos

Objetivo:

- dejar listas las entidades nuevas sin romper flujos actuales.

Entregables:

- `cashSessionId` en `Sale`
- tabla `Collection`
- tabla `CollectionApplication`
- tabla `AccountsReceivable`
- tabla `AccountingEntry`
- tabla `AccountingEntryLine`

### Desglose de implementacion

#### 1. Alcance de la fase

Esta fase no debe cambiar aun el comportamiento de:

- POS checkout;
- venta directa;
- cierre de caja;
- reportes actuales.

Su objetivo es dejar:

- el modelo de datos listo;
- los enums y contratos listos;
- los servicios base listos;
- los presenters y tipos listos;
- la compatibilidad hacia adelante lista.

#### 2. No objetivos de la fase

No entra todavia:

- creacion real de `Collection` en checkout POS;
- recalculo de caja desde collections;
- cartera funcional en UI;
- posting contable;
- migracion de reportes.

#### 3. Cambios de esquema Prisma

##### 3.1 Cambio en `Sale`

Agregar:

```prisma
cashSessionId String? @db.Uuid
cashSession   CashSession? @relation(fields: [cashSessionId], references: [id], onDelete: SetNull)
source        SaleSource? // opcional, recomendado
```

Y en `CashSession`:

```prisma
sales Sale[]
```

##### 3.2 Nuevos enums recomendados

```prisma
enum CollectionStatus {
  PENDING
  APPLIED
  VOIDED
  REVERSED
  REFUNDED
}

enum CollectionApplicationStatus {
  APPLIED
  REVERSED
  VOIDED
}

enum AccountsReceivableStatus {
  OPEN
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}

enum AccountingEntryStatus {
  DRAFT
  POSTED
  REVERSED
}

enum AccountingSourceType {
  SALE
  COLLECTION
  CASH_MOVEMENT
  REFUND
  ADJUSTMENT
}
```

##### 3.3 Nueva tabla `Collection`

Version minima recomendada:

```prisma
model Collection {
  id                        String            @id @default(uuid()) @db.Uuid
  businessId                String            @db.Uuid
  business                  Business          @relation(fields: [businessId], references: [id], onDelete: Cascade)

  customerId                String            @db.Uuid
  customer                  Customer          @relation(fields: [customerId], references: [id], onDelete: Restrict)

  cashSessionId             String?           @db.Uuid
  cashSession               CashSession?      @relation(fields: [cashSessionId], references: [id], onDelete: SetNull)

  amount                    Decimal           @db.Decimal(12, 2)
  paymentMethod             String
  status                    CollectionStatus  @default(APPLIED)
  affectsCashDrawer         Boolean           @default(false)
  requiresBankReconciliation Boolean          @default(false)
  externalReference         String?
  notes                     String?

  registeredById            String?           @db.Uuid
  registeredBy              User?             @relation(fields: [registeredById], references: [id], onDelete: SetNull)

  collectedAt               DateTime          @default(now())
  createdAt                 DateTime          @default(now())
  updatedAt                 DateTime          @updatedAt

  applications              CollectionApplication[]

  @@index([businessId, collectedAt])
  @@index([cashSessionId, collectedAt])
  @@index([customerId, collectedAt])
  @@index([status, collectedAt])
}
```

##### 3.4 Nueva tabla `CollectionApplication`

Version minima recomendada:

```prisma
model CollectionApplication {
  id             String                      @id @default(uuid()) @db.Uuid
  collectionId   String                      @db.Uuid
  collection     Collection                  @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  saleId         String?                     @db.Uuid
  sale           Sale?                       @relation(fields: [saleId], references: [id], onDelete: SetNull)

  receivableId   String?                     @db.Uuid
  receivable     AccountsReceivable?         @relation(fields: [receivableId], references: [id], onDelete: SetNull)

  appliedAmount  Decimal                     @db.Decimal(12, 2)
  status         CollectionApplicationStatus @default(APPLIED)
  notes          String?
  createdById    String?                     @db.Uuid
  createdBy      User?                       @relation(fields: [createdById], references: [id], onDelete: SetNull)
  appliedAt      DateTime                    @default(now())
  createdAt      DateTime                    @default(now())

  @@index([collectionId, appliedAt])
  @@index([saleId, appliedAt])
  @@index([receivableId, appliedAt])
}
```

##### 3.5 Nueva tabla `AccountsReceivable`

Version minima recomendada:

```prisma
model AccountsReceivable {
  id             String                   @id @default(uuid()) @db.Uuid
  businessId     String                   @db.Uuid
  business       Business                 @relation(fields: [businessId], references: [id], onDelete: Cascade)

  customerId     String                   @db.Uuid
  customer       Customer                 @relation(fields: [customerId], references: [id], onDelete: Restrict)

  saleId         String?                  @unique @db.Uuid
  sale           Sale?                    @relation(fields: [saleId], references: [id], onDelete: SetNull)

  documentType   String
  documentId     String?                  @db.Uuid
  currency       String                   @default("USD")
  issuedAt       DateTime
  dueAt          DateTime?
  originalAmount Decimal                  @db.Decimal(12, 2)
  appliedAmount  Decimal                  @default(0) @db.Decimal(12, 2)
  pendingAmount  Decimal                  @db.Decimal(12, 2)
  status         AccountsReceivableStatus @default(OPEN)
  notes          String?
  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt

  applications   CollectionApplication[]

  @@index([businessId, status, issuedAt])
  @@index([customerId, status, dueAt])
}
```

##### 3.6 Nueva tabla `AccountingEntry`

Version minima recomendada:

```prisma
model AccountingEntry {
  id          String               @id @default(uuid()) @db.Uuid
  businessId  String               @db.Uuid
  business    Business             @relation(fields: [businessId], references: [id], onDelete: Cascade)
  sourceType  AccountingSourceType
  sourceId    String               @db.Uuid
  status      AccountingEntryStatus @default(DRAFT)
  postedAt    DateTime?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  lines       AccountingEntryLine[]

  @@index([businessId, sourceType, sourceId])
  @@index([status, createdAt])
}
```

##### 3.7 Nueva tabla `AccountingEntryLine`

Version minima recomendada:

```prisma
model AccountingEntryLine {
  id          String          @id @default(uuid()) @db.Uuid
  entryId     String          @db.Uuid
  entry       AccountingEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountCode String
  debit       Decimal         @default(0) @db.Decimal(12, 2)
  credit      Decimal         @default(0) @db.Decimal(12, 2)
  memo        String?
  createdAt   DateTime        @default(now())

  @@index([entryId])
  @@index([accountCode])
}
```

#### 4. Ajustes recomendados de relaciones existentes

##### `Customer`

Agregar relaciones:

```prisma
collections Collection[]
receivables AccountsReceivable[]
```

##### `Business`

Agregar relaciones:

```prisma
collections Collection[]
receivables AccountsReceivable[]
accountingEntries AccountingEntry[]
```

##### `User`

Agregar relaciones opcionales:

```prisma
registeredCollections Collection[] @relation("...")
collectionApplications CollectionApplication[] @relation("...")
```

Si se quiere minimizar friccion, estas relaciones de usuario pueden dejarse para la segunda migracion.

#### 5. Cambios de tipos y contratos TypeScript

Crear o preparar contratos base para:

- `CollectionStatus`
- `CollectionSummary`
- `CollectionApplicationSummary`
- `AccountsReceivableSummary`
- `AccountingEntrySummary`

Ubicacion sugerida:

- `src/core/accounts-receivable/`
- `src/core/accounting/`

##### Estructura sugerida

```text
src/core/accounts-receivable/
  collection.service.ts
  collection-application.service.ts
  receivable.service.ts
  schemas.ts
  types.ts

src/core/accounting/
  accounting-entry.service.ts
  schemas.ts
  types.ts
```

#### 6. Servicios a crear en Fase 1

Esta fase no implementa la logica completa, pero si debe dejar servicios base con operaciones seguras y reutilizables.

##### `collection.service.ts`

Operaciones minimas:

- `createCollectionDraft`
- `createCollection`
- `getCollectionById`
- `listCollectionsByBusiness`

##### `collection-application.service.ts`

Operaciones minimas:

- `applyCollectionToSale`
- `applyCollectionToReceivable`
- `reverseCollectionApplication`

##### `receivable.service.ts`

Operaciones minimas:

- `createReceivable`
- `recalculateReceivableBalance`
- `getReceivableById`
- `listReceivablesByBusiness`

##### `accounting-entry.service.ts`

Operaciones minimas:

- `createDraftEntry`
- `postEntry`
- `reverseEntry`

#### 7. Reglas de negocio a codificar desde ya

Aunque la Fase 1 no active todo el comportamiento, conviene dejar listas estas reglas en esquemas o servicios:

1. `Collection.amount` siempre positiva.
2. `CollectionApplication.appliedAmount` siempre positiva.
3. una aplicacion debe apuntar a `saleId` o `receivableId`.
4. una `AccountsReceivable.pendingAmount` no puede ser negativa.
5. una `AccountingEntry` debe balancear debitos y creditos cuando se publique.

#### 8. Integracion con blueprint actual

##### Decisiones de Fase 1

- no agregar nuevos `ModuleKey`
- no agregar nuevas `CapabilityKey`
- no tocar `company-settings-page`
- no tocar `composition.ts`
- no tocar `guards.ts`

##### Justificacion

La funcionalidad puede vivir primero detras de servicios internos apoyados en:

- `ACCOUNTS_RECEIVABLE`
- `CASH_MANAGEMENT`

cuando esos modulos ya esten activos en el blueprint.

#### 9. Cambios de bajo impacto por archivo

##### `prisma/schema.prisma`

Agregar:

- `cashSessionId` en `Sale`
- nuevas tablas y enums
- nuevas relaciones

##### `src/core/sales/`

Solo preparar tipos si hace falta.
No cambiar aun la logica de checkout.

##### `src/core/cash-management/`

No cambiar comportamiento aun.
Solo preparar contratos para futura lectura de `Collection`.

##### `src/core/platform/`

Sin cambios en Fase 1.

#### 10. Migracion de base de datos

Orden recomendado:

1. crear enums nuevos
2. agregar `cashSessionId` a `Sale`
3. crear `Collection`
4. crear `CollectionApplication`
5. crear `AccountsReceivable`
6. crear `AccountingEntry`
7. crear `AccountingEntryLine`
8. agregar indices

##### Regla

Todo nullable o con defaults seguros, para que la migracion no rompa datos existentes.

#### 11. Datos historicos

En Fase 1 no se migra historico.

Decisiones:

- ventas viejas siguen funcionando sin `cashSessionId`
- `SALE_CASH_IN` legado sigue existiendo
- no se backfill de collections ni receivables

Eso reduce riesgo y acelera salida.

#### 12. Criterios de terminado de Fase 1

La fase se considera terminada cuando:

- existe migracion Prisma aplicable;
- el proyecto compila con las nuevas entidades;
- las relaciones nuevas no rompen consultas existentes;
- existen servicios base de cobranza, cartera y contabilidad;
- existen tipos y schemas base;
- no cambia aun el flujo funcional del usuario final.

#### 13. Riesgos de Fase 1

##### Riesgo bajo

- relaciones Prisma mal declaradas
- indices faltantes
- enums demasiado cerrados

##### Riesgo medio

- acoplar demasiado `Collection` con `Sale`
- meter reglas funcionales antes de tiempo

##### Mitigacion

- mantener `Collection` desacoplada
- mantener `CollectionApplication` flexible
- no cambiar UI aun
- no tocar reportes actuales

#### 14. Checklist operativo de Fase 1

- [ ] definir enums Prisma nuevos
- [ ] agregar `cashSessionId` a `Sale`
- [ ] agregar relacion `sales` en `CashSession`
- [ ] crear tabla `Collection`
- [ ] crear tabla `CollectionApplication`
- [ ] crear tabla `AccountsReceivable`
- [ ] crear tabla `AccountingEntry`
- [ ] crear tabla `AccountingEntryLine`
- [ ] agregar relaciones en `Customer`
- [ ] agregar relaciones en `Business`
- [ ] crear migracion Prisma
- [ ] crear `src/core/accounts-receivable/`
- [ ] crear `src/core/accounting/`
- [ ] crear servicios base
- [ ] crear schemas base
- [ ] crear types base
- [ ] validar que `npm run build` siga pasando

## Fase 2. POS inmediato

Objetivo:

- que POS ya escriba cobros reales en el nuevo modelo.

Entregables:

- POS checkout crea `Collection`
- POS checkout crea `CollectionApplication`
- enforcement backend de caja abierta
- `SALE_CASH_IN` queda en compatibilidad opcional

## Fase 3. Caja robusta

Objetivo:

- recalcular cierre desde fuente correcta.

Entregables:

- `cash-session.service` recalculado desde `Collection`
- snapshot enriquecido en `CashReconciliation`
- dialogo de caja con desglose por medio

## Fase 4. Venta directa y credito

Objetivo:

- soportar cartera real.

Entregables:

- creacion de `AccountsReceivable`
- cobro parcial
- cobro posterior
- aplicaciones parciales

## Fase 5. Reportes

Objetivo:

- separar lectura por dominio.

Entregables:

- reporte comercial
- reporte de formas de pago
- reporte de cobros
- reporte de caja
- reporte de cartera

## Fase 6. Contabilidad

Objetivo:

- postear eventos fuente claros.

Entregables:

- servicio de posting
- asientos de venta
- asientos de cobro
- asientos de devolucion
- asientos de movimientos manuales

## Fase 7. Blueprint evolution

Objetivo:

- exponer el nuevo dominio como composicion configurable.

Entregables:

- nuevas capabilities
- ajustes a catálogos
- UI de company settings

## 11. Reglas de no regresion

1. No romper checkout actual de venta.
2. No romper facturacion ni SRI.
3. No romper reportes comerciales existentes.
4. No romper apertura y cierre actual mientras convivan ambos modelos.
5. No modificar historicos cerrados sin evento compensatorio.
6. No depender del frontend para reglas de caja.

## 12. Recomendacion final

La propuesta que mejor encaja con la arquitectura actual es:

- extender el sistema, no reemplazarlo;
- construir cobranza bajo `ACCOUNTS_RECEIVABLE`;
- mantener caja bajo `CASH_MANAGEMENT`;
- dejar contabilidad como subdominio interno en primera etapa;
- evolucionar luego el blueprint y capabilities cuando el dominio ya este estable.

## En una frase

La base definitiva para desarrollo debe quedar asi:

> venta, composicion de pago, cobro, caja, cartera y contabilidad como dominios separados, montados sobre los blueprints actuales y evolucionados por fases.
