# Diseno de Registro de Cobro, Cierre de Caja y Base Contable

## Objetivo

Definir un modelo de implementacion claro para:

- registrar cobros de ventas POS de forma consistente;
- cerrar caja con conciliacion real;
- evitar duplicidad de registros entre venta y caja;
- dejar una base sana para futura contabilidad y reportes financieros.

Este documento parte del estado actual del proyecto y propone una evolucion incremental sin romper el flujo operativo existente.

## Estado actual del sistema

### Venta

La venta hoy se guarda correctamente como hecho comercial:

- `Sale`
- `SaleItem`
- `SalePayment`
- `SaleDocument`
- `SriInvoice`

Referencias:

- [sale.service.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/sales/sale.service.ts)
- [checkout.service.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/sales/checkout.service.ts)
- [schema.prisma](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/prisma/schema.prisma)

### Caja

La caja hoy se modela con:

- `CashSession`
- `CashMovement`
- `CashReconciliation`

Tipos de movimiento ya existentes:

- `OPENING_FLOAT`
- `SALE_CASH_IN`
- `MANUAL_IN`
- `WITHDRAWAL`
- `REFUND_OUT`
- `CLOSING_ADJUSTMENT`

Referencias:

- [cash-session.service.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/cash-management/cash-session.service.ts)
- [cash-movement.service.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/cash-management/cash-movement.service.ts)
- [schema.prisma](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/prisma/schema.prisma)

### Aclaracion conceptual clave

En este diseno hay que separar estos conceptos:

- `SalePayment`: define la forma de pago de la venta;
- `Cobro`: registra el hecho real de haber cobrado;
- `CashMovement`: registra movimientos manuales o correctivos de caja;
- `Contabilidad`: registra el asiento financiero.

Ejemplo:

- una venta puede tener `SalePayment` mixto: 10 efectivo y 20 tarjeta;
- luego el sistema genera los registros reales de cobro;
- si hubo dinero fisico entregado en caja, ese cobro impacta la sesion;
- si hubo retiro manual de dinero, eso ya no es cobro sino `CashMovement`.

### Problema principal actual

Hoy el sistema mezcla dos conceptos:

1. `SalePayment` como declaracion del medio de pago;
2. `CashMovement` como si el cobro de la venta fuera tambien un movimiento manual de caja.

Falta una capa explicita de ledger de cobro realizado.

Eso crea estos riesgos:

- no queda separado "como se iba a pagar" de "que se cobro de verdad";
- caja queda acoplada a la venta de forma operativa;
- contabilidad futura no tiene un registro claro del cobro como hecho propio;
- devoluciones, reversos y conciliaciones se vuelven mas dificiles.

## Principio de diseno recomendado

Separar claramente cinco capas:

### 1. Venta

La venta representa el hecho comercial.

Debe responder:

- que se vendio;
- a quien;
- por cuanto;
- con que formas de pago fue pactada;
- en que sesion de caja ocurrio.

### 2. Forma de pago

La forma de pago representa la composicion comercial de la venta.

Debe responder:

- que medios de pago se usaron;
- cuanto correspondia a cada medio;
- si la venta fue efectivo, tarjeta, transferencia, credito o mixta.

Esto vive en `SalePayment`.

### 3. Cobro

El cobro representa el ledger operativo-financiero del dinero realmente cobrado.

Debe responder:

- cuanto se cobro realmente;
- por que medio;
- en que momento;
- quien lo cobro;
- en que caja o sesion se cobro;
- si fue aplicado, anulado, reversado o devuelto.

Este documento propone crear una entidad explicita para eso.

### 4. Caja

La caja representa el control fisico y operativo del efectivo.

Debe responder:

- cuanto fondo se abrio;
- que aportes o retiros hubo;
- que devoluciones salieron de caja;
- cuanto deberia existir al cierre;
- cuanto declaro el cajero;
- cual fue la diferencia.

### 5. Contabilidad

La contabilidad representa el impacto financiero y tributario.

Debe responder:

- ingresos;
- impuestos;
- cuentas por cobrar;
- caja;
- bancos;
- devoluciones;
- ajustes.

La contabilidad no debe depender del ledger operativo de caja como unica fuente de verdad para una venta.

## Modelo ideal recomendado

### Regla central

La venta debe quedar asociada a una sesion de caja, pero el cobro debe tener su propio ledger. No es lo mismo la forma de pago declarada que el cobro efectivamente realizado.

### Propuesta

1. Agregar `cashSessionId` en `Sale`
2. Mantener `SalePayment` como composicion de formas de pago
3. Crear una nueva entidad de ledger de cobro, por ejemplo `SaleCollection`
4. Dejar `CashMovement` solo para movimientos operativos no comerciales o correctivos
5. Completar la capa contable con asientos propios, por ejemplo `AccountingEntry` y `AccountingEntryLine`

Con esto:

- la venta sabe en que caja ocurrio;
- la forma de pago vive en `SalePayment`;
- el cobro real vive en `SaleCollection`;
- la caja calcula efectivo esperado desde cobros efectivos, no desde formas de pago declaradas;
- los movimientos manuales siguen existiendo para apertura, retiros, aportes y devoluciones.

## Modelo de datos propuesto

### Cambio principal

Agregar a `Sale`:

```prisma
cashSessionId String? @db.Uuid
cashSession   CashSession? @relation(fields: [cashSessionId], references: [id], onDelete: SetNull)
```

Y en `CashSession`:

```prisma
sales Sale[]
```

### Nueva entidad recomendada: ledger de cobro

```prisma
model SaleCollection {
  id                String   @id @default(uuid()) @db.Uuid
  saleId            String   @db.Uuid
  sale              Sale     @relation(fields: [saleId], references: [id], onDelete: Cascade)

  salePaymentId     String?  @db.Uuid
  amount            Decimal  @db.Decimal(12, 2)
  formaPago         String

  cashSessionId     String?  @db.Uuid
  cashSession       CashSession? @relation(fields: [cashSessionId], references: [id], onDelete: SetNull)

  status            String   // APPLIED, VOIDED, REVERSED, REFUNDED, PENDING
  externalReference String?
  notes             String?

  collectedById     String?  @db.Uuid
  collectedAt       DateTime @default(now())
  createdAt         DateTime @default(now())

  @@index([saleId, collectedAt])
  @@index([cashSessionId, collectedAt])
}
```

### Nueva entidad recomendada: contabilidad

```prisma
model AccountingEntry {
  id          String   @id @default(uuid()) @db.Uuid
  sourceType  String
  sourceId    String   @db.Uuid
  status      String   // DRAFT, POSTED, REVERSED
  postedAt    DateTime?
  createdAt   DateTime @default(now())

  lines       AccountingEntryLine[]
}

model AccountingEntryLine {
  id          String   @id @default(uuid()) @db.Uuid
  entryId     String   @db.Uuid
  entry       AccountingEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountCode String
  debit       Decimal  @db.Decimal(12, 2)
  credit      Decimal  @db.Decimal(12, 2)
  memo        String?
}
```

### Resultado esperado

- una `CashSession` tiene muchas `Sale`
- una `Sale` puede pertenecer a una `CashSession`
- una `Sale` puede tener muchas `SaleCollection`
- `CashMovement` ya no necesita representar cada cobro de venta
- contabilidad ya no depende solo de ventas o solo de caja

### Que se mantiene en `CashMovement`

- `OPENING_FLOAT`
- `MANUAL_IN`
- `WITHDRAWAL`
- `REFUND_OUT`
- `CLOSING_ADJUSTMENT`

### Que se deja de usar para ventas nuevas

- `SALE_CASH_IN`

Se puede mantener temporalmente para compatibilidad e historico, pero no deberia generarse para ventas nuevas si existe `SaleCollection`.

## Flujo operativo ideal

## 1. Apertura de caja

Actor: cajero

Flujo:

1. abre caja
2. registra monto inicial
3. opcionalmente agrega notas
4. sistema crea `CashSession`
5. sistema crea `CashMovement(OPENING_FLOAT)`

Resultado:

- caja abierta
- fondo inicial registrado

## 2. Venta POS

Actor: cajero

Flujo:

1. agrega productos
2. define cliente
3. define medios de pago
4. confirma cobro
5. sistema valida:
   - existe caja abierta si la politica lo exige;
   - suma de pagos = total de venta;
   - efectivo recibido suficiente;
   - stock suficiente
6. sistema crea dentro de una misma transaccion:
   - `Sale`
   - `SaleItem`
   - `SalePayment`
   - `SaleCollection`
   - `SaleDocument`
   - `SriInvoice` si aplica
   - vinculo `sale.cashSessionId`
7. sistema descuenta stock si aplica

Resultado:

- la venta queda amarrada a la caja activa
- las formas de pago quedan registradas
- el cobro real queda registrado
- no hace falta crear `SALE_CASH_IN` en `CashMovement`

## 3. Movimientos manuales

Actor: cajero o supervisor

Flujo:

1. selecciona tipo:
   - aporte
   - retiro
   - devolucion
2. registra monto
3. registra motivo
4. sistema crea `CashMovement`

Resultado:

- el movimiento afecta la caja
- queda trazabilidad operativa

## 4. Anulacion o devolucion

### Caso A: anulacion de venta antes de cierre

Si la venta tuvo efectivo:

- la venta pasa a `CANCELLED`
- se repone stock si aplica
- se registra `REFUND_OUT` si hubo devolucion real de efectivo

### Caso B: anulacion documental sin devolucion inmediata

Si la anulacion es administrativa pero el dinero no salio aun:

- no se registra `REFUND_OUT` todavia
- debe existir un flujo posterior de devolucion real

Regla de negocio:

No toda anulacion documental implica automaticamente salida de caja. La salida de caja debe representar dinero real entregado.

## 5. Cierre de caja

Actor: cajero

Flujo:

1. sistema calcula esperado
2. cajero declara monto real
3. sistema compara
4. sistema guarda conciliacion
5. caja cambia a `CLOSED`

## Formula recomendada del cierre

```text
esperado en caja =
  apertura
  + cobros efectivos en caja
  + aportes
  - retiros
  - devoluciones
  - ajustes de cierre
```

Donde:

- `apertura` sale de `OPENING_FLOAT`
- `cobros efectivos en caja` sale de `SaleCollection` aplicadas en esa sesion con `formaPago = "01"`
- `aportes` sale de `MANUAL_IN`
- `retiros` sale de `WITHDRAWAL`
- `devoluciones` sale de `REFUND_OUT`
- `ajustes` sale de `CLOSING_ADJUSTMENT`

## Diseno tecnico recomendado

## Regla 1: la verdad comercial esta en `Sale` y `SalePayment`

No recalcular ventas desde `CashMovement`.

El modulo comercial ya contiene:

- total vendido
- formas de pago
- cliente
- impuestos

Eso debe seguir siendo la fuente primaria de la venta.

## Regla 2: el cobro debe tener ledger propio

`SalePayment` no debe usarse como sustituto del cobro realizado.

Debe existir una capa de `SaleCollection` para registrar:

- cobro aplicado;
- cobro anulado;
- cobro reversado;
- devolucion;
- referencia externa de pasarela o transferencia.

## Regla 3: la caja debe consumir cobros, no formas de pago declaradas

La caja debe consultar:

- cobros efectivos de la sesion
- movimientos operativos manuales

No debe registrar una segunda vez la venta como si fuera otro hecho independiente, pero tampoco debe asumir que `SalePayment` ya representa el cobro realizado.

## Regla 4: enforcement de caja abierta debe ir en backend

La validacion de "no vender sin caja" no puede vivir solo en UI.

Debe aplicarse en:

- [route.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/app/api/v1/pos/checkout/route.ts)

Si la politica `sessionRequired` esta activa:

- el backend debe rechazar el checkout sin `cashSession` valida

## Regla 5: una venta y su cobro deben nacer ya asociados a caja

La `cashSessionId` debe persistirse dentro de la misma transaccion de checkout.

Y si el cobro sucede en POS en el mismo acto, tambien debe nacer su `SaleCollection` dentro de esa misma transaccion.

## Regla 6: resumen de caja siempre recalculable

`expectedClosing` no debe depender de valores cacheados en memoria del modal.

Debe salir de consultas consistentes a DB:

- fondo inicial
- cobros efectivos de ventas activas de esa sesion
- movimientos manuales

## Consulta conceptual para cobros efectivos en caja

Pseudologica:

```text
sum(SaleCollection.amount)
where:
  saleCollection.cashSessionId = session.id
  saleCollection.status = "APPLIED"
  sale.status != CANCELLED
  saleCollection.formaPago = "01"
```

## Implementacion propuesta por capas

## Fase 1. Amarre de venta a caja

Cambios:

- agregar `cashSessionId` a `Sale`
- pasar `cashSessionId` desde checkout POS
- guardar `cashSessionId` en `createSaleInTransaction`
- crear `SaleCollection` dentro del checkout POS

Archivos principales:

- [schema.prisma](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/prisma/schema.prisma)
- [pos/checkout route](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/app/api/v1/pos/checkout/route.ts)
- [sale.service.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/core/sales/sale.service.ts)

## Fase 2. Enforcement real de caja

Cambios:

- si `cashRuntime.capabilities.sessionRequired` es `true`, rechazar ventas sin caja abierta
- devolver error claro de negocio

Regla recomendada:

- con caja habilitada y `sessionRequired = true`: venta bloqueada sin caja
- con caja habilitada y `sessionRequired = false`: venta permitida, `cashSessionId = null`

## Fase 3. Crear ledger de cobro real

Cambios:

- crear `SaleCollection` por cada cobro aplicado
- si la venta es mixta, crear multiples registros de cobro
- si una parte queda pendiente, registrar estado `PENDING` o no crear aun el cobro

## Fase 4. Retiro de `SALE_CASH_IN` para ventas nuevas

Cambios:

- dejar de llamar `registerSaleCashIn`
- mantener compatibilidad de lectura historica si hay registros viejos

## Fase 5. Recalculo de resumen de caja

Cambios en `cash-session.service.ts`:

- `salesCashTotal` se calcula desde `SaleCollection`
- `movementsTotal` solo desde manuales y devoluciones
- `expectedClosing` combina ambos

## Fase 6. Devoluciones y anulaciones

Cambios:

- si hay devolucion real de efectivo, crear `REFUND_OUT`
- cambiar `SaleCollection` a `REFUNDED` o crear contrapartida de reversal
- si solo hay anulacion documental, no crear salida de caja automaticamente

Esto obliga a distinguir dos eventos:

- anulacion documental
- devolucion de dinero

## Fase 7. Contabilidad

Cambios:

- crear `AccountingEntry`
- crear `AccountingEntryLine`
- postear asientos desde venta, cobro, devolucion y movimientos manuales

## Fase 8. UI de caja

Cambios recomendados:

- refrescar resumen de caja despues de registrar movimiento manual
- mostrar claramente:
  - apertura
  - ventas efectivo
  - aportes
  - retiros
  - devoluciones
  - esperado
  - declarado
  - diferencia

## Diseno contable recomendado

## La caja no reemplaza la contabilidad

Caja:

- control fisico del efectivo
- operacion diaria del cajero
- conciliacion por turno

Contabilidad:

- asiento de ventas
- impuesto generado
- cuentas por cobrar
- caja y bancos
- devoluciones
- ajustes

## Asientos contables base sugeridos

### Venta contado en efectivo

Debe:

- Caja

Haber:

- Ingresos por ventas
- IVA por pagar

### Venta con tarjeta o transferencia

Debe:

- Bancos / cuenta puente de pasarela

Haber:

- Ingresos por ventas
- IVA por pagar

### Venta mixta

Debe:

- Caja por parte efectivo
- Bancos por parte electronica

Haber:

- Ingresos por ventas
- IVA por pagar

### Retiro de caja

Debe:

- Cuenta puente / gasto / banco segun el caso

Haber:

- Caja

### Aporte a caja

Debe:

- Caja

Haber:

- Cuenta puente / socio / banco

### Devolucion a cliente

Debe:

- Devoluciones en ventas
- IVA por recuperar o ajuste tributario

Haber:

- Caja o Bancos

## Recomendacion contable para este sistema

No generar asientos contables de cobro desde `SalePayment`.

Los asientos deben diferenciar:

- venta devengada;
- cobro realizado;
- movimiento manual de caja;
- devolucion o reverso.

Los asientos contables de ventas deben generarse desde:

- `Sale`
- `SaleItem`
- `SalePayment`
- `SaleDocument`

Los asientos de cobro deben generarse desde:

- `SaleCollection`

Los asientos de caja manual deben generarse desde:

- `CashMovement`

## Asientos contables completos sugeridos

### Venta devengada

Debe:

- Cuentas por cobrar cliente

Haber:

- Ingresos por ventas
- IVA por pagar

### Cobro efectivo realizado

Debe:

- Caja

Haber:

- Cuentas por cobrar cliente

### Cobro con transferencia o tarjeta

Debe:

- Bancos / cuenta puente de pasarela

Haber:

- Cuentas por cobrar cliente

### Venta contado inmediato

Puede modelarse de dos formas:

- en dos asientos: venta + cobro
- o en un asiento compuesto

La recomendacion tecnica para este sistema es mantener dos eventos:

- `Sale`
- `SaleCollection`

Porque eso da mejor trazabilidad y simplifica reversos.

## Diseno de reportes recomendado

Separar al menos 3 reportes:

### 1. Reporte comercial

Basado en ventas:

- total vendido
- IVA
- descuentos
- ticket promedio
- ventas por vendedor
- ventas por producto

### 2. Reporte de formas de pago

Basado en `SalePayment`:

- efectivo
- transferencia
- tarjeta
- credito
- mixtas

### 3. Reporte de cobros

Basado en `SaleCollection`:

- cobros por medio
- cobros por cajero
- cobros por sesion
- cobros anulados o reversados
- pendientes de cobrar

### 4. Reporte operativo de caja

Basado en `CashSession` + `CashMovement` + `SaleCollection` en efectivo por sesion:

- apertura
- ventas efectivo
- aportes
- retiros
- devoluciones
- esperado
- declarado
- diferencia

## Estrategia de migracion recomendada

## Paso 1. Cambio de esquema

- agregar `cashSessionId` a `Sale`
- crear migracion Prisma

## Paso 2. Introducir `SaleCollection`

- poblar `SaleCollection` en ventas nuevas
- mantener `SalePayment` intacto

## Paso 3. Escritura dual temporal

Durante una etapa corta:

- guardar `sale.cashSessionId`
- crear `SaleCollection`
- seguir registrando `SALE_CASH_IN` opcionalmente

Esto solo si quieres una transicion segura sin romper reportes viejos.

## Paso 4. Migrar lectura

Cambiar resumenes de caja para leer:

- cobros efectivo desde `SaleCollection`
- movimientos operativos desde `CashMovement`

## Paso 5. Apagar escritura de `SALE_CASH_IN`

Cuando los reportes y cierres ya usen el nuevo modelo:

- dejar de crear `SALE_CASH_IN`

## Paso 6. Completar contabilidad

- agregar `AccountingEntry`
- agregar `AccountingEntryLine`
- generar asientos de venta, cobro, retiro, aporte y devolucion

## Paso 7. Limpieza historica

Opcional:

- mantener historico viejo
- o migrarlo a ventas/sesiones si hace falta consistencia total

## Validaciones de negocio obligatorias

1. No vender sin caja abierta cuando `sessionRequired = true`
2. No cerrar caja si ya esta cerrada
3. No registrar movimientos sobre caja cerrada
4. No registrar devolucion sin referencia operativa o motivo
5. No considerar ventas canceladas dentro del efectivo esperado
6. No permitir que el cierre se calcule con datos stale en frontend
7. No considerar `SalePayment` como equivalente a cobro realizado
8. No postear contabilidad sin evento fuente identificable

## Casos de prueba funcionales

### Caso 1. Venta contado simple

- abrir caja con 50
- vender 20 en efectivo
- esperado = 70
- debe existir `SaleCollection` efectivo por 20

### Caso 2. Venta con transferencia

- abrir caja con 50
- vender 20 por transferencia
- esperado = 50
- debe existir `SaleCollection` transferencia por 20

### Caso 3. Venta mixta

- abrir caja con 50
- vender 30: 10 efectivo y 20 transferencia
- esperado = 60
- deben existir 2 `SaleCollection`

### Caso 4. Retiro manual

- apertura 50
- venta efectivo 20
- retiro 10
- esperado = 60

### Caso 5. Devolucion real

- apertura 50
- venta efectivo 20
- devolucion 5
- esperado = 65

### Caso 6. Venta anulada sin devolucion real

- si se anula solo el documento, la salida de caja no debe asumir automaticamente que el dinero ya se devolvio

### Caso 7. Venta cancelada con devolucion

- debe existir `REFUND_OUT`
- `SaleCollection` debe quedar revertida o refundida
- la venta no debe seguir sumando al efectivo esperado

## Checklist de implementacion

- [ ] agregar `cashSessionId` a `Sale`
- [ ] persistir `cashSessionId` en checkout POS
- [ ] validar caja abierta en backend
- [ ] usar `sessionRequired` realmente
- [ ] crear `SaleCollection`
- [ ] dejar de crear `SALE_CASH_IN` para ventas nuevas
- [ ] recalcular `salesCashTotal` desde `SaleCollection`
- [ ] recalcular `expectedClosing` con ventas + movimientos
- [ ] registrar `REFUND_OUT` cuando haya devolucion real
- [ ] marcar o revertir `SaleCollection` en anulaciones y devoluciones
- [ ] refrescar resumen de caja despues de movimientos manuales
- [ ] ajustar reportes de caja
- [ ] crear `AccountingEntry`
- [ ] crear `AccountingEntryLine`
- [ ] separar reportes comerciales de reportes operativos
- [ ] separar reportes de formas de pago de reportes de cobro
- [ ] completar capa de asientos contables

## Recomendacion final

Con lo que ya tiene el sistema, la mejor decision es:

- usar `Sale` y `SalePayment` como verdad del cobro;
- usar `SalePayment` como verdad de la forma de pago;
- usar `SaleCollection` como ledger real del cobro;
- usar `CashSession` como agrupador operativo del efectivo;
- usar `CashMovement` solo para movimientos manuales y correctivos;
- usar `AccountingEntry` como capa contable formal;
- usar `CashReconciliation` como resultado del cierre;
- dejar la contabilidad como una capa derivada de venta, cobro y caja, no como reemplazo de ninguna de ellas.

Ese modelo es el mas sano para negocio, mas mantenible tecnicamente y mejor base para auditoria, cierres y futura contabilidad formal.
