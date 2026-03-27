# Plataforma por Piezas: Modulos, Ediciones, Policy Packs y Capabilities

## 1. Objetivo
Definir una forma interna de disenar `arg-mvp` como plataforma componible, en lugar de crecer por cliente, por parche o por forks funcionales.

La idea es que el sistema pueda atender:

1. clientes informales con una operacion simple
2. clientes medianos con procesos mas estructurados
3. clientes grandes con necesidades de control, auditoria y verticalizacion

sin convertir el producto en una mezcla de `ifs` por cliente.

## 2. Problema que se quiere evitar
Hay tres necesidades distintas que no deben mezclarse:

1. `que producto tiene el cliente`
   - ERP base
   - POS
   - Billing
   - Quotes

2. `que tipo de negocio opera`
   - generico
   - carniceria
   - restaurante
   - farmacia

3. `que nivel de complejidad y control necesita`
   - informal
   - pyme
   - enterprise

Si estas tres cosas se meten en una sola bandera tipo `profile`, el modelo termina degenerando en combinaciones dificiles de mantener:

1. `generic-basic`
2. `generic-enterprise`
3. `butchery-basic`
4. `restaurant-pro`
5. `restaurant-enterprise`

Eso escala mal y no representa bien la realidad del negocio.

## 3. Propuesta base
El sistema debe componerse con 4 conceptos separados:

1. `Module`
2. `Edition`
3. `PolicyPack`
4. `Capability`

Cada negocio debe describirse como una composicion de esas piezas.

## 4. Definiciones

### 4.1 Module
Representa un producto o bloque funcional grande que el cliente contrata o usa.

Ejemplos:

1. `POS`
2. `BILLING`
3. `QUOTES`
4. `REPORTS`
5. `ACCOUNTS_RECEIVABLE`

Regla:
Un modulo define una capacidad funcional grande, no una regla de negocio fina.

### 4.2 Edition
Representa el nivel de madurez, control y complejidad operativa del cliente.

Ejemplos:

1. `STARTER`
2. `GROWTH`
3. `ENTERPRISE`

Regla:
La edicion no dice si el cliente es carniceria o restaurante. Solo define que tan profundo llega el producto en controles, auditoria, aprobaciones, trazabilidad y reportes.

### 4.3 PolicyPack
Representa un paquete de reglas especializadas para una vertical o un flujo operativo.

Ejemplos:

1. `POS_GENERIC`
2. `POS_BUTCHERY`
3. `POS_RESTAURANT`
4. `POS_PHARMACY`

Regla:
Un policy pack cambia el comportamiento de un modulo, no su existencia.

Ejemplo:
`POS` existe como modulo.
`POS_BUTCHERY` cambia como interpreta codigos de balanza, pesos y cantidades.
`POS_RESTAURANT` cambiaria mesas, cocina, comandas y tiempos.

### 4.4 Capability
Representa una pieza puntual, activable, pequena y reutilizable.

Ejemplos:

1. `POS_SCALE_BARCODES`
2. `POS_WEIGHT_FROM_BARCODE`
3. `POS_TABLE_SERVICE`
4. `POS_KITCHEN_TICKETS`
5. `AR_CREDIT_SALES`
6. `AR_PAYMENT_SCHEDULES`
7. `AUDIT_LOG`
8. `APPROVAL_FLOWS`

Regla:
Una capability no define una vertical completa. Solo habilita una capacidad concreta.

## 5. Ejemplo de composicion

### 5.1 Carniceria pequena
```ts
{
  modules: ["POS", "BILLING"],
  edition: "STARTER",
  policyPacks: ["POS_BUTCHERY"],
  capabilities: ["POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"]
}
```

### 5.2 Restaurante mediano
```ts
{
  modules: ["POS", "BILLING", "REPORTS"],
  edition: "GROWTH",
  policyPacks: ["POS_RESTAURANT"],
  capabilities: ["POS_TABLE_SERVICE", "POS_KITCHEN_TICKETS"]
}
```

### 5.3 Cliente formal con mas control
```ts
{
  modules: ["BILLING", "REPORTS", "QUOTES"],
  edition: "ENTERPRISE",
  policyPacks: [],
  capabilities: ["AUDIT_LOG", "APPROVAL_FLOWS"]
}
```

## 6. Principios

1. Nunca crear logica por cliente.
2. Toda necesidad nueva debe mapear a `module`, `edition`, `policyPack` o `capability`.
3. El `core` no debe conocer la vertical concreta del cliente.
4. Las variantes especializadas deben vivir como composicion, no como bifurcacion del sistema.
5. El frontend no debe preguntar `si el cliente es carniceria`; debe consumir un runtime resuelto.

## 7. Traduccion al sistema actual
Hoy el proyecto ya tiene una parte de esta idea:

1. `BusinessFeature` se comporta como `modules`
2. `POS` ya existe como extension sobre el core
3. `useButcheryScaleBarcodeWeight` ya es una semilla de capability/policy

Lo que falta es dejar de tratar esas banderas como casos aislados y moverlas a un modelo mas expresivo.

## 8. Modelo recomendado a implementar

### 8.1 Contratos base
Crear un contrato central tipado para estas claves:

Archivo sugerido:
`src/core/platform/contracts.ts`

```ts
export type ModuleKey =
  | "POS"
  | "BILLING"
  | "QUOTES"
  | "REPORTS";

export type EditionKey =
  | "STARTER"
  | "GROWTH"
  | "ENTERPRISE";

export type PolicyPackKey =
  | "POS_GENERIC"
  | "POS_BUTCHERY"
  | "POS_RESTAURANT";

export type CapabilityKey =
  | "POS_SCALE_BARCODES"
  | "POS_WEIGHT_FROM_BARCODE"
  | "POS_TABLE_SERVICE"
  | "POS_KITCHEN_TICKETS"
  | "AUDIT_LOG"
  | "APPROVAL_FLOWS";
```

### 8.2 Blueprint del negocio
Representa la composicion activa para un negocio.

Archivo sugerido:
`src/core/platform/business-blueprint.ts`

```ts
export type BusinessBlueprint = {
  modules: ModuleKey[];
  edition: EditionKey;
  policyPacks: PolicyPackKey[];
  capabilities: CapabilityKey[];
};
```

### 8.3 Runtime resuelto por modulo
Cada modulo debe resolver su runtime a partir del blueprint, sin exponer al frontend las reglas crudas.

Archivo sugerido:
`src/modules/pos/policies/resolve-pos-runtime.ts`

```ts
export type PosRuntime = {
  policyPack: "POS_GENERIC" | "POS_BUTCHERY" | "POS_RESTAURANT";
  capabilities: {
    scaleBarcodes: boolean;
    weightFromBarcode: boolean;
    tableService: boolean;
    kitchenTickets: boolean;
  };
};
```

Regla:
El POS consume `PosRuntime`, no flags dispersas.

## 9. Distribucion de responsabilidades

### 9.1 Core
Debe quedarse neutral.

## Estado Actual
El modulo `POS` ya quedo migrado operativamente al modelo nuevo.

Hoy:

1. la configuracion principal del POS entra por `posPolicy`
2. el backend persiste un `blueprint` dentro del feature `POS`
3. `resolvePosRuntime()` resuelve comportamiento desde `blueprint`
4. el frontend del POS consume `posRuntime`
5. `trackInventoryOnSale` y el perfil `POS_BUTCHERY` ya fueron validados en funcionamiento real

Compatibilidad actual:

1. `trackInventoryOnSale` y `useButcheryScaleBarcodeWeight` todavia existen en el `config` legacy del feature `POS`
2. esos flags se conservan solo para lectura historica, sincronizacion y backfill
3. la UI de compania y el contrato publico ya consumen `posPolicy`, no esos flags
4. no deben seguir tratandose como la fuente conceptual principal del modulo

Pendiente natural:

1. repetir el patron en otros modulos cuando haga sentido
2. retirar lectura legacy donde ya no sea necesaria

Responsabilidades:

1. usuarios
2. clientes
3. productos
4. ventas
5. pagos
6. inventario
7. documentos
8. negocio

El core no debe saber:

1. si el negocio es carniceria
2. si el POS usa mesas
3. si el scanner interpreta peso o precio

### 9.2 Modulos
Ejemplo: `POS`, `Billing`, `Quotes`.

Responsabilidades:

1. UI especializada
2. flujos operativos
3. contratos de runtime
4. integracion con el core

### 9.3 Policy Packs
Responsabilidades:

1. resolver reglas de negocio verticales
2. interpretar entradas especializadas
3. alterar comportamiento del modulo sin alterar el core

Ejemplos:

1. parser de codigos de balanza
2. manejo de mesas y comandas
3. reglas de dispensacion por receta

### 9.4 Capabilities
Responsabilidades:

1. prender o apagar piezas pequenas
2. permitir composicion fina
3. evitar que un policy pack tenga que implicar todo el vertical

## 10. Como versionar sin bifurcar
No se recomienda versionar por cliente ni por rama funcional.

Se recomienda construir `blueprints` internos.

Ejemplo:

1. `starter-retail`
2. `starter-butchery`
3. `growth-restaurant`
4. `enterprise-generic`

Esos blueprints no son codigo duplicado. Son presets de composicion.

```ts
export const STARTER_BUTCHERY_BLUEPRINT: BusinessBlueprint = {
  modules: ["POS", "BILLING"],
  edition: "STARTER",
  policyPacks: ["POS_BUTCHERY"],
  capabilities: ["POS_SCALE_BARCODES", "POS_WEIGHT_FROM_BARCODE"],
};
```

## 11. Ruta de migracion recomendada

### Fase 1
Crear el lenguaje comun:

1. `ModuleKey`
2. `EditionKey`
3. `PolicyPackKey`
4. `CapabilityKey`
5. `BusinessBlueprint`

Sin cambiar comportamiento productivo todavia.

### Fase 2
Crear resolvers por modulo:

1. `resolvePosRuntime()`
2. `resolveBillingRuntime()`
3. futuros resolvers por extension

### Fase 3
Migrar flags sueltas actuales al nuevo modelo.

Ejemplo:

1. `useButcheryScaleBarcodeWeight`
2. `trackInventoryOnSale`

Pasan a ser parte de `policyPacks` y/o `capabilities`.

### Fase 4
Hacer que las pantallas y APIs consuman runtime resuelto, no configuraciones atomicas directas.

### Fase 5
Crear presets internos de negocio.

Ejemplo:

1. carniceria
2. restaurante
3. retail basico
4. cliente formal enterprise

## 12. Aplicacion al caso POS actual
Lo implementado hoy para carniceria debe considerarse una `v1 transitoria`.

Estado actual:

1. hay un switch POS para usar peso desde codigo de balanza
2. el POS interpreta ese valor y lo usa como cantidad

Estado objetivo:

1. `POS` sigue siendo el modulo base
2. `POS_BUTCHERY` se vuelve el policy pack
3. `POS_SCALE_BARCODES` y `POS_WEIGHT_FROM_BARCODE` se vuelven capabilities
4. el POS deja de depender de un booleano suelto

## 13. Regla de gobierno interno
Antes de implementar cualquier nueva necesidad, responder:

1. Esto es un `module` nuevo?
2. Esto es una `edition` distinta?
3. Esto es un `policy pack` vertical?
4. Esto es una `capability` puntual?

Si no encaja en ninguna, primero ajustar el modelo antes de escribir codigo.

## 14. Resultado esperado
Con este enfoque:

1. el sistema crece por composicion
2. se evita mezclar logica por cliente
3. el core se mantiene estable
4. los modulos siguen vendibles como productos
5. las verticales se pueden especializar sin ensuciar la base
6. las diferencias entre cliente informal y cliente grande se modelan como edicion, no como parches

## 15. Decision recomendada
La siguiente decision de arquitectura sugerida es:

1. no agregar mas flags aisladas de negocio
2. introducir el lenguaje `module + edition + policyPack + capability`
3. crear un `BusinessBlueprint`
4. resolver runtime por modulo
5. migrar el caso de carniceria a ese modelo como primer ejemplo real

Ese camino permite que el POS siga siendo generico, pero que existan variantes comerciales especializadas sin romper la base de la plataforma.
