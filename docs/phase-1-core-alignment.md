# Fase 1 - Ordenamiento del Core Actual

## 1. Objetivo
Ejecutar la primera fase de evolucion arquitectonica sin cambiar el comportamiento funcional principal del sistema.

La meta de esta fase es ordenar el proyecto alrededor de una separacion clara entre:

1. `core`
2. `extensiones`
3. `shared`

Esta fase no busca introducir POS, nota de venta, multi-sucursal ni un rediseño tributario completo. Solo busca dejar el terreno listo para las siguientes fases.

## 2. Alcance

### Incluido
1. documentar la estructura objetivo del proyecto
2. mapear la estructura actual hacia `core`, `modules` y `shared`
3. formalizar que `sri` evolucionara a `billing`
4. definir responsabilidades por dominio
5. crear una estructura minima de carpetas guia
6. definir el orden de migracion sin romper imports de golpe

### No incluido
1. mover todas las carpetas fisicamente
2. cambiar el flujo de checkout
3. introducir nuevas tablas Prisma
4. crear modulo POS
5. crear modulo Sales Note
6. activar features por cliente

## 3. Resultado esperado
Al cerrar esta fase, el proyecto debe tener:

1. una estructura objetivo clara
2. una guia de migracion de carpetas y dominios
3. una definicion compartida de que pertenece al core
4. una definicion compartida de que pertenece a extensiones
5. una base documental suficiente para arrancar la Fase 2 sin improvisacion

## 4. Estado actual del repo
Hoy el proyecto mezcla varias capas:

1. `src/services/*` contiene logica de dominio
2. `src/modules/*` contiene componentes de secciones funcionales
3. `src/components/*` contiene UI compartida y tambien piezas de dashboard muy especificas
4. `src/app/*` contiene paginas y endpoints

Esto funciona para MVP, pero dificulta responder estas preguntas:

1. que es core y que es extension
2. donde vive cada regla de negocio
3. que piezas son compartidas y cuales dependen del tipo de cliente

## 5. Mapa actual -> objetivo

### 5.1 Core propuesto

#### Actual
1. `src/services/auth`
2. `src/services/inventory`
3. `src/services/sales`
4. parte de `src/services/quotes`
5. `src/app/api/v1/customers`
6. `src/app/api/v1/products`
7. `src/app/api/v1/stock`
8. `src/app/api/v1/sales`

#### Objetivo
1. `src/core/auth`
2. `src/core/users`
3. `src/core/customers`
4. `src/core/catalog`
5. `src/core/inventory`
6. `src/core/sales`
7. `src/core/payments`

### 5.2 Modulos / extensiones propuestas

#### Actual
1. `src/services/sri`
2. `src/modules/sri`
3. `src/app/(dashboard)/sri`

#### Objetivo
1. `src/modules/billing`

Notas:

1. En Fase 1 no se renombra el codigo productivo completo.
2. En Fase 1 solo se formaliza que `sri` es una extension llamada `billing`.
3. El renombre tecnico real puede hacerse en una fase controlada posterior.

### 5.3 Shared propuesto

#### Actual
1. `src/components/ui`
2. `src/lib`
3. parte de `src/components/*`
4. `src/modules/shared`

#### Objetivo
1. `src/shared/ui`
2. `src/shared/lib`
3. `src/shared/types`
4. `src/shared/dashboard`
5. `src/shared/document-composer`

## 6. Clasificacion de dominios para Fase 1

### Core
1. autenticacion
2. usuarios
3. clientes
4. productos
5. inventario
6. ventas
7. pagos

### Extensiones
1. billing
2. quotes
3. futuras piezas POS
4. futuras piezas de note sales

### Shared
1. UI reusable
2. helpers genericos
3. tipos de dashboard
4. adaptadores HTTP

## 7. Decisiones de esta fase

### 7.1 `sri` pasa a considerarse `billing`
Aunque el codigo actual use nombres como `sri`, la decision arquitectonica desde esta fase sera:

1. `sri` es una implementacion concreta
2. `billing` es la capacidad de negocio

Eso permitira en el futuro:

1. desacoplar venta y facturacion
2. admitir otros tipos documentales
3. ocultar el modulo a clientes que no lo necesiten

### 7.2 `quotes` no se promueve a core todavia
Cotizaciones son valiosas, pero no son imprescindibles para todos los clientes. En esta etapa se consideran una extension funcional.

### 7.3 `components/mvp-dashboard-*` no es core de dominio
Esas piezas seguiran existiendo, pero no deben confundirse con logica central del sistema. En la arquitectura objetivo se consideran shared/dashboard o UI administrativa.

## 8. Estructura objetivo de carpetas

```text
src/
  app/
  core/
    auth/
    users/
    customers/
    catalog/
    inventory/
    sales/
    payments/
  modules/
    billing/
    quotes/
    pos/
    sales-note/
  shared/
    ui/
    lib/
    types/
    dashboard/
    document-composer/
  theme/
```

## 9. Orden recomendado de migracion tecnica
El orden importa para no romper imports masivamente.

### Paso 1
Documentar la estructura objetivo y las responsabilidades.

### Paso 2
Crear carpetas guia sin mover logica productiva.

### Paso 3
Empezar a mover primero archivos de menor riesgo:

1. tipos
2. helpers
3. wrappers de UI

### Paso 4
Mover servicios de dominio por grupos:

1. auth
2. inventory
3. sales
4. customers / catalog

### Paso 5
Dejar `billing` como nueva referencia de arquitectura aunque por debajo siga consumiendo `sri` temporalmente.

## 10. Tareas concretas de Fase 1

### Tarea A. Documentacion base
1. crear documento de Fase 1
2. dejar enlazado desde la documentacion principal
3. definir criterio de salida

### Tarea B. Carpetas guia
1. crear `src/core`
2. crear `src/shared`
3. crear `src/modules/billing`
4. documentar el rol de cada carpeta

### Tarea C. Mapa de migracion
1. indicar que servicios actuales van al core
2. indicar que piezas actuales quedan como extension
3. indicar que piezas actuales son shared

### Tarea D. Naming de arquitectura
1. hablar de `billing` en documentacion nueva
2. mantener `sri` solo como nombre tecnico temporal donde ya existe codigo

## 11. Criterios de salida
La Fase 1 se considera cerrada cuando:

1. existe una definicion explicita de `core`, `modules` y `shared`
2. el equipo puede ubicar cada dominio actual dentro de una categoria
3. el repo tiene carpetas base para la arquitectura futura
4. no hay cambios funcionales ni regresiones visibles
5. la Fase 2 ya puede enfocarse en desacoplar `Sale` y `Document`

## 12. Riesgos de hacer mas de la cuenta en esta fase

1. mover demasiados archivos a la vez
2. tocar imports masivamente sin pruebas
3. renombrar `sri` a `billing` en runtime sin plan de compatibilidad
4. mezclar Fase 1 con cambios de dominio tributario

## 13. Entregables de esta fase

1. `docs/core-modular-architecture.md`
2. `docs/phase-1-core-alignment.md`
3. estructura minima de `src/core`, `src/shared` y `src/modules/billing`

## 14. Siguiente fase
La Fase 2 debe concentrarse solo en este cambio de dominio:

1. `Sale` deja de implicar automaticamente `Invoice`
2. se introduce la abstraccion `Document`
3. `billing` se vuelve opcional respecto del registro de venta

## 15. Estado de cierre de Fase 1
Estado actual de implementacion:

1. `Fase 1.1` completada:
   - shared/dashboard
   - shared/document-composer
   - limpieza de imports activos hacia shared
2. `Fase 1.2` completada:
   - `auth`, `inventory` y `sales` migrados a `src/core/*`
   - rutas API activas consumiendo `core`
3. `Fase 1.3` completada:
   - `billing` convertido en modulo real
   - implementacion operativa movida desde `sri` hacia `src/modules/billing/*`
4. `Fase 1.4` completada:
   - eliminados wrappers temporales ya no usados
   - eliminado codigo heredado sin referencias activas

Con esto la Fase 1 queda cerrada a nivel de estructura y organizacion del codigo.
