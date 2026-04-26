# Interacciones

Esta carpeta documenta patrones de interacción compartidos ya implementados entre módulos.

## Confirmaciones

No uses `window.confirm`.

El proyecto ya expone un `Dialog` global para confirmaciones:

- [app-confirm-provider.tsx](/Users/emersoncajape/Documents/Desarrollos/ARGSOFT/arg-mvp/src/components/providers/app-confirm-provider.tsx)

Uso base:

```tsx
const confirm = useAppConfirm();

const accepted = await confirm({
  title: "Anular registro",
  message: "Esta accion no se puede deshacer.",
  confirmLabel: "Anular",
  severity: "error",
  destructive: true,
});

if (!accepted) return;
```

Regla:

1. usar `severity: "error"` o `destructive: true` en acciones irreversibles
2. usar títulos y botones explicitos, no genéricos
3. no dejar `window.confirm` en código de aplicación ni documentarlo como alternativa del flujo normal
4. las pantallas nuevas deben usar `useAppConfirm()` como flujo por defecto
