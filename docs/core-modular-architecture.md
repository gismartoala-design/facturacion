# Arquitectura Base Core + Extensiones

## 1. Objetivo
Definir una base de arquitectura para que `arg-mvp` evolucione de un MVP operativo a una plataforma comercial modular.

La meta no es construir un ERP monolitico y rigido para todos los clientes, sino un sistema principal pequeno y estable que pueda extenderse por piezas segun el nivel de formalidad, complejidad operativa y presupuesto de cada negocio.

## 2. Vision de producto

### 2.1 Idea central
El sistema debe separarse en dos niveles:

1. `Core`: capacidades esenciales compartidas por casi todos los clientes.
2. `Extensiones`: piezas opcionales que agregan funcionalidad sin romper el core.

### 2.2 Resultado esperado
Con esta estrategia se pueden atender tres escenarios:

1. Cliente pequeno o informal:
   - usa solo el core.
   - puede operar ventas, stock, clientes y pagos sin procesos tributarios avanzados.
2. Cliente intermedio:
   - usa el core y activa modulos como POS o nota de venta.
3. Cliente formal o de mayor exigencia:
   - usa el core y activa modulos como facturacion electronica, compras, multi-sucursal o cuentas por cobrar.

## 3. Principios de arquitectura

1. El `core` no debe depender de una integracion externa tributaria.
2. Una `venta` debe existir aunque no se emita factura.
3. Los modulos deben extender entidades del core, no duplicarlas.
4. Cada modulo debe poder activarse o desactivarse por cliente.
5. La ausencia de un modulo no debe romper el sistema principal.
6. Las reglas del negocio deben vivir en servicios de dominio, no en pantallas.
7. La UI debe consumir capacidades habilitadas, no asumir que todos los clientes tienen todo.

## 4. Definicion de Core

### 4.1 Dominios del core
Estos dominios deben considerarse obligatorios y estables:

1. `auth`
2. `users`
3. `business`
4. `customers`
5. `catalog`
6. `sales`
7. `payments`
8. `inventory`
9. `reporting-basic`

### 4.2 Responsabilidades del core

#### auth / users
1. autenticacion
2. sesion
3. roles y permisos base

#### business
1. datos del negocio
2. configuracion general
3. features activadas
4. perfil operativo del cliente

#### customers
1. registro de clientes
2. identificacion y contacto

#### catalog
1. productos
2. servicios
3. precios
4. impuestos base por item

#### sales
1. creacion de ventas
2. estados de venta
3. lineas de venta
4. relacion con pagos y documentos

#### payments
1. registro de cobros
2. medios de pago
3. validaciones basicas de montos

#### inventory
1. existencia por producto
2. movimientos
3. ajustes manuales

#### reporting-basic
1. ventas del dia
2. top productos
3. stock bajo
4. resumen de caja simple

## 5. Definicion de Extensiones

### 5.1 Modulos iniciales sugeridos

1. `POS`
2. `Billing`
3. `Sales Note`
4. `Purchases`
5. `Accounts Receivable`
6. `Multi Branch`
7. `Cash Management`

### 5.2 Funcion de cada modulo

#### POS
1. interfaz de venta rapida
2. carrito y flujo de cobro agil
3. impresion de ticket
4. ventas en espera
5. atajos operativos

#### Billing
1. factura electronica
2. XML y RIDE
3. autorizacion y reintentos
4. notas de credito futuras
5. integracion SRI

#### Sales Note
1. emision de nota de venta
2. formato documental no electronico o simplificado segun configuracion
3. reglas de negocio aplicables al cliente

#### Purchases
1. proveedores
2. ingresos de stock por compra
3. costo de reposicion
4. documentos de compra

#### Accounts Receivable
1. ventas a credito
2. saldo pendiente
3. abonos
4. vencimientos

#### Multi Branch
1. sucursales
2. establecimientos
3. bodegas
4. series documentales
5. stock por ubicacion

#### Cash Management
1. cajas
2. apertura y cierre
3. sesiones por cajero
4. arqueo
5. diferencias de caja

## 6. Regla funcional mas importante
La operacion comercial y el documento tributario deben separarse.

### 6.1 Modelo conceptual

1. `Sale` = operacion comercial
2. `Payment` = como se cobro
3. `InventoryMovement` = impacto en stock
4. `Document` = comprobante generado a partir de la venta

### 6.2 Implicacion directa
No se debe asumir que toda venta genera una factura electronica.

Una venta puede:

1. no generar documento
2. generar nota de venta
3. generar factura electronica

La eleccion depende de:

1. configuracion del cliente
2. modulo habilitado
3. perfil tributario
4. reglas comerciales del negocio

## 7. Estructura de carpetas recomendada

```text
src/
  core/
    auth/
    business/
    users/
    customers/
    catalog/
    inventory/
    sales/
    payments/
    reporting/
  modules/
    pos/
    billing/
    sales-note/
    purchases/
    accounts-receivable/
    multi-branch/
    cash-management/
  shared/
    ui/
    lib/
    types/
    permissions/
    feature-flags/
```

### 7.1 Convencion sugerida por dominio
Cada dominio puede organizarse con esta estructura:

```text
src/core/sales/
  services/
  schemas/
  presenters/
  repositories/
  policies/
  components/
```

### 7.2 Regla de dependencias

1. `core` no depende de `modules`
2. `modules` si pueden depender de `core`
3. `shared` solo contiene piezas reutilizables sin reglas pesadas de negocio

## 8. Modelo de datos base recomendado

### 8.1 Entidades actuales que ya encajan en el core
El proyecto actual ya cuenta con una buena base en:

1. `User`
2. `Customer`
3. `Product`
4. `StockLevel`
5. `StockMovement`
6. `Sale`
7. `SaleItem`
8. `SalePayment`

### 8.2 Entidades nuevas recomendadas

#### Business
Representa al cliente o negocio propietario de los datos.

Campos sugeridos:

1. `id`
2. `name`
3. `legalName`
4. `ruc`
5. `email`
6. `phone`
7. `address`
8. `defaultCurrency`
9. `createdAt`
10. `updatedAt`

#### BusinessFeature
Permite activar o desactivar capacidades.

Campos sugeridos:

1. `id`
2. `businessId`
3. `featureKey`
4. `enabled`
5. `config`
6. `createdAt`
7. `updatedAt`

`featureKey` sugeridos:

1. `POS`
2. `BILLING`
3. `SALES_NOTE`
4. `PURCHASES`
5. `ACCOUNTS_RECEIVABLE`
6. `MULTI_BRANCH`
7. `CASH_MANAGEMENT`

#### TaxProfile
Describe el nivel tributario u operativo del negocio.

Campos sugeridos:

1. `id`
2. `businessId`
3. `profileType`
4. `requiresElectronicBilling`
5. `allowsSalesNote`
6. `sriEnvironment`
7. `issuerConfig`
8. `createdAt`
9. `updatedAt`

#### Document
Representa el comprobante emitido por una venta.

Campos sugeridos:

1. `id`
2. `businessId`
3. `saleId`
4. `documentType`
5. `status`
6. `number`
7. `issuedAt`
8. `metadata`
9. `createdAt`
10. `updatedAt`

`documentType` inicial:

1. `SALES_NOTE`
2. `INVOICE`

`status` inicial:

1. `DRAFT`
2. `ISSUED`
3. `VOIDED`
4. `ERROR`

#### Branch
Preparacion para crecimiento a multiples locales.

Campos sugeridos:

1. `id`
2. `businessId`
3. `code`
4. `name`
5. `address`
6. `isActive`
7. `createdAt`
8. `updatedAt`

#### CashRegister
Caja fisica o virtual para POS.

Campos sugeridos:

1. `id`
2. `branchId`
3. `name`
4. `code`
5. `isActive`
6. `createdAt`
7. `updatedAt`

#### CashSession
Sesion operativa de caja por usuario.

Campos sugeridos:

1. `id`
2. `cashRegisterId`
3. `openedById`
4. `closedById`
5. `openedAt`
6. `closedAt`
7. `openingAmount`
8. `closingAmount`
9. `status`

## 9. Ajuste recomendado sobre el modelo actual
El flujo actual esta orientado a `venta + facturacion SRI` en una sola operacion.

Para pasar a plataforma modular, el ajuste de dominio debe ser:

### 9.1 Flujo recomendado

1. `createSale()`
2. `registerPayments()`
3. `applyInventoryImpact()`
4. `issueDocument()` si existe modulo documental activo
5. `sendToTaxProvider()` solo si el documento es electronico

### 9.2 Beneficio
Con esta separacion:

1. el core sigue funcionando para clientes pequenos
2. el modulo de facturacion se vuelve opcional
3. se puede introducir nota de venta sin forzar SRI
4. el POS puede vender incluso cuando el flujo tributario este apagado o diferido

## 10. Propuesta de servicios

### 10.1 Servicios del core

1. `createSale`
2. `cancelSale`
3. `registerSalePayments`
4. `reserveOrDiscountStock`
5. `createStockAdjustment`
6. `listAvailableFeatures`
7. `resolveBusinessContext`

### 10.2 Servicios de extensiones

#### billing
1. `issueInvoice`
2. `retryInvoiceAuthorization`
3. `downloadInvoiceXml`
4. `downloadInvoiceRide`

#### sales-note
1. `issueSalesNote`
2. `printSalesNote`
3. `cancelSalesNote`

#### pos
1. `openCashSession`
2. `closeCashSession`
3. `holdSale`
4. `resumeHeldSale`
5. `printTicket`

## 11. Activacion por cliente

### 11.1 Ejemplos de combinacion

#### Cliente pequeno
1. `SALES`
2. `INVENTORY`
3. `CUSTOMERS`

#### Cliente pequeno con caja
1. `SALES`
2. `INVENTORY`
3. `CUSTOMERS`
4. `POS`
5. `CASH_MANAGEMENT`

#### Cliente formal
1. `SALES`
2. `INVENTORY`
3. `CUSTOMERS`
4. `POS`
5. `BILLING`

#### Cliente mas completo
1. `SALES`
2. `INVENTORY`
3. `CUSTOMERS`
4. `POS`
5. `BILLING`
6. `PURCHASES`
7. `ACCOUNTS_RECEIVABLE`
8. `MULTI_BRANCH`

### 11.2 Regla tecnica
La habilitacion de modulos debe controlar:

1. navegacion
2. endpoints disponibles
3. botones y acciones
4. validaciones de negocio
5. configuraciones visibles

## 12. Roadmap de implementacion

### Fase 1. Ordenar el dominio actual
Objetivo: separar core y extensiones sin cambiar el comportamiento funcional principal.

1. mover `auth`, `sales`, `inventory`, `customers` y `products` a una estructura `core`
2. renombrar el modulo `sri` a `billing`
3. extraer la logica de checkout a servicios mas pequenos
4. desacoplar la emision documental del registro de venta

### Fase 2. Introducir configuracion modular
Objetivo: permitir que no todos los clientes usen las mismas piezas.

1. crear `Business`
2. crear `BusinessFeature`
3. crear `TaxProfile`
4. condicionar navegacion y acciones por features

### Fase 3. Crear modulo POS
Objetivo: tener una pantalla de venta rapida independiente del dashboard administrativo.

1. apertura de caja
2. venta rapida
3. ticket
4. ventas en espera
5. cierre de caja

### Fase 4. Crear modulo Sales Note
Objetivo: permitir una salida documental mas ligera cuando el negocio lo requiera.

1. entidad `Document`
2. tipo `SALES_NOTE`
3. emision e impresion
4. politicas de disponibilidad por perfil del negocio

### Fase 5. Expandir a ERP ligero
Objetivo: sumar nuevas piezas sin tocar la base.

1. compras
2. proveedores
3. cuentas por cobrar
4. multi-sucursal
5. reportes mas avanzados

## 13. Decision recomendada para este repositorio
Si se quiere avanzar sin rehacer todo, la primera transformacion debe ser esta:

1. mantener como `core`:
   - auth
   - users
   - customers
   - products
   - inventory
   - sales
   - payments
2. convertir `sri` en extension `billing`
3. introducir la abstraccion `document`
4. dejar `POS` y `Sales Note` como modulos nuevos

## 14. Riesgos a evitar

1. crecer solo con pantallas sin reforzar el modelo de dominio
2. seguir tratando `venta` y `factura` como la misma cosa
3. meter reglas tributarias dentro del core
4. duplicar logica entre dashboard y futura app POS
5. hacer permisos por pantalla en vez de capacidades

## 15. Siguiente paso recomendado
Antes de agregar nuevas vistas, conviene ejecutar este mini plan tecnico:

1. crear documento de decision para `Business`, `BusinessFeature`, `TaxProfile` y `Document`
2. redisenar `checkout` para que emita venta primero y documento despues
3. formalizar la estructura `src/core` y `src/modules`
4. recien despues construir la primera pantalla POS

Este documento debe servir como referencia base para las siguientes decisiones funcionales y tecnicas del proyecto.

## 16. Documento de ejecucion inmediata
Para el detalle operativo de la primera etapa revisar:

- `docs/phase-1-core-alignment.md`
