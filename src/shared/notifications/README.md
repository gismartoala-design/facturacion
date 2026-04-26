# Notificaciones

Esta carpeta documenta el estandar activo de notificaciones UI del proyecto.

## Regla principal

No montes `Snackbar` ni `Alert` locales para mensajes transitorios.

El proyecto ya usa un provider global unico para estas notificaciones:

- [app-notification-provider.tsx](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/components/providers/app-notification-provider.tsx)
- [app-mui-provider.tsx](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/components/providers/app-mui-provider.tsx)

## Hooks de dominio

Los modulos deben usar el preset de su dominio en lugar de configurar posicion o duracion manualmente:

- `useCompanyNotifier()`
- `useAccountingNotifier()`
- `useSalesNotifier()`
- `usePosNotifier()`
- `useRestaurantNotifier()`
- `usePurchasesNotifier()`
- `useInventoryNotifier()`
- `useUsersNotifier()`

Todos viven en [notifier-presets.ts](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/notifications/notifier-presets.ts).

## Uso recomendado

```tsx
const notifier = useSalesNotifier();

notifier.saved("Cotizacion guardada correctamente");
notifier.apiError(error, "No se pudo guardar la cotizacion");
notifier.info("No hay resultados para el filtro actual");
```

## Cuándo usar cada helper

- `apiError(error, fallback)`: para respuestas fallidas de API o excepciones.
- `saved(...)`: para confirmaciones de guardado o actualizacion.
- `deleted(...)`: para eliminaciones exitosas.
- `imported(...)`: para importaciones exitosas.
- `success/error/info/warning(...)`: cuando el mensaje no encaja en un helper semantico.
- `show(...)`: solo si necesitas controlar severidad u opciones explicitamente.

## Qué evitar

- `useState` local solo para abrir/cerrar un toast.
- repetir `error instanceof Error ? error.message : "..."` en cada pantalla.
- definir `anchorOrigin` y `autoHideDuration` en cada modulo si ya existe preset.
- tratar mensajes de accion como `Alert` embebido en la pagina cuando deben salir como notificacion transitoria.
