# Decision Operativa

## POS, Venta Directa, Cobros, Caja y Cartera

## Objetivo

Dejar una regla de negocio clara para salir a produccion sin mezclar piezas:

- `POS`
- `Venta directa`
- `Cobros`
- `Caja`
- `Cartera`
- `Contabilidad`

La prioridad actual es que `POS`, `caja` y `cobros` queden correctos.
Contabilidad queda encaminada, pero no define el flujo operativo.

## Decision final

## POS

`POS` es flujo operativo de mostrador.

Entonces:

- vende;
- cobra en el mismo acto;
- si aplica, impacta caja;
- no debe depender de cartera para operar.

Comportamiento esperado:

- crea `Sale`
- crea `Collection`
- crea `CollectionApplication`
- si el cobro afecta efectivo fisico, usa `cashSessionId`

## Venta directa

`Venta directa` es flujo comercial/documental.

Entonces:

- registra venta o factura;
- no registra cobro dentro del mismo flujo;
- no impacta caja por defecto;
- genera cartera cuando exista saldo pendiente;
- el cobro queda para un proceso posterior de cobranza.

Comportamiento esperado:

- crea `Sale`
- no crea `Collection`
- no crea `CollectionApplication`
- crea `AccountsReceivable`

## Caja

`Caja` queda reservada para:

- POS;
- cobros realmente operados en caja;
- movimientos manuales/correctivos.

No debe mezclarse automaticamente con venta directa.

## Cobros

`Cobros` sigue siendo una pieza separada del negocio.

Eso significa:

- `SalePayment` no es el cobro;
- `Collection` si es el cobro;
- una venta puede existir sin cobro;
- el cobro puede ocurrir despues.

## Cartera

`Cartera` queda como el saldo pendiente de ventas que no se cobraron en el mismo acto.

Casos:

- `POS contado`: no crea cartera
- `Venta directa`: crea cartera
- `Cobranza posterior`: reduce cartera

## Contabilidad

Contabilidad queda encaminada, pero no bloquea la salida a produccion.

Debe proyectarse despues desde:

- `Sale`
- `Collection`
- `CashMovement`
- devoluciones

Por ahora no se resuelve:

- plan de cuentas configurable
- posting contable final por negocio
- catalogo contable administrable

## Estado objetivo del sistema

## POS

- venta + cobro + caja

## Venta directa

- venta/factura + cartera

## Cobranza

- modulo posterior para registrar cobros de cartera

## Caja

- solo para operaciones que realmente pasan por caja

## Cambios aplicados / esperados

## Venta directa

Se debe comportar como:

- condicion de pago a credito
- sin abono inicial dentro del mismo flujo
- con plazo para la cuenta por cobrar

## POS

Se mantiene como:

- cobro inmediato
- caja operativa
- collection real

## Cambios tecnicos asociados

## Bajo impacto

- UI de ventas directas:
  - quitar semantica de cobro inmediato
  - dejar condicion de pago a credito
  - dejar plazo

- route de venta directa:
  - `createImmediateCollections = false`
  - `createReceivableForPendingBalance = true`

## Medio impacto futuro

- modulo de `Cobros` o `Cobranzas`
- aplicacion de cobros a cartera
- reportes de cobranza

## Recomendacion final

Para salir a produccion:

1. `POS` queda como flujo de venta + cobro + caja.
2. `Venta directa` queda como flujo de venta/factura + cartera.
3. `Cobros` queda como modulo posterior.
4. `Contabilidad` queda encaminada, no cerrada.

## En una frase

`POS` cobra.
`Venta directa` factura.
`Cobranza` cobra despues.

