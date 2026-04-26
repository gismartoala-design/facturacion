# Shared

Esta carpeta agrupa piezas reutilizables que no representan un dominio principal ni una extension de negocio por si mismas.

Aqui deben vivir gradualmente:

1. UI reusable
2. helpers genericos
3. tipos compartidos
4. utilidades de dashboard
5. componentes de soporte documental reutilizables
6. infraestructura transversal de UI como notificaciones
7. patrones de interacción compartidos
8. estados base de página

Regla:

1. `shared` no debe cargar reglas pesadas de negocio
2. si una pieza contiene reglas centrales del sistema, debe vivir en `core`
3. si una pieza depende de una capacidad opcional, debe vivir en `modules`

## Notificaciones

El proyecto usa una sola implementacion global para mensajes transitorios.

Regla:

1. no montar `Snackbar` locales en paginas o modulos
2. usar `useAppNotifier(...)` o, preferiblemente, un preset de dominio desde `src/shared/notifications/notifier-presets.ts`
3. usar helpers semanticos como `apiError`, `saved`, `deleted` e `imported` antes de construir mensajes manuales
4. tratar esto como estandar vigente del proyecto, no como convencion opcional

Referencia:

1. [README de notificaciones](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/notifications/README.md)

## Interacciones

Confirmaciones y patrones de interacción compartidos deben centralizarse.

Regla:

1. no usar `window.confirm` en pantallas productivas
2. usar el `Dialog` global mediante `useAppConfirm()`
3. tratar esto como estandar vigente del proyecto, no como convencion opcional

Referencia:

1. [README de interacciones](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/interactions/README.md)

## Estados de Página

Loaders y errores de carga inicial deben reutilizar componentes base compartidos.

Regla:

1. no duplicar `Paper + CircularProgress + Typography` para cargas de página
2. no duplicar paneles simples de error recuperable
3. usar `PageLoadingState` y `PageErrorState` desde `src/shared/states`
4. tratar esto como estandar vigente del proyecto, no como convencion opcional

Referencia:

1. [README de estados](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/states/README.md)
