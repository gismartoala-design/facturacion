# Estados de página

Esta carpeta documenta los estados base reutilizables que ya usa el proyecto para carga y error de página.

## Componentes

- [page-loading-state.tsx](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/states/page-loading-state.tsx)
- [page-error-state.tsx](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/shared/states/page-error-state.tsx)

## Regla

Antes de crear loaders o paneles de error ad hoc, usar estos componentes como primera opción.

## Uso

```tsx
if (loading) {
  return <PageLoadingState message="Cargando clientes..." />;
}

if (error) {
  return <PageErrorState message={error} onRetry={() => void reload()} />;
}
```

## Variantes

- `fullScreen`: para cargas de rutas completas o shells dedicados
- `centered`: para pantallas de módulo con un panel centrado
- `onRetry`: para errores recuperables de carga inicial

## Qué evitar

- duplicar `Paper + CircularProgress + Typography` para una carga de página simple
- mostrar errores iniciales recuperables con `Alert` embebido cuando corresponde un estado de página
