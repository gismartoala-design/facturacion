# Core

Esta carpeta representa el sistema principal del producto.

Reglas:

1. aqui vive la logica que casi todos los clientes necesitan
2. el core no debe depender de extensiones como `billing` o futuros modulos POS
3. las reglas de negocio centrales deben migrar hacia esta carpeta por fases

Dominios objetivo:

1. `auth`
2. `users`
3. `customers`
4. `catalog`
5. `inventory`
6. `sales`
7. `payments`

Nota:

1. durante la Fase 1 esta carpeta funciona como estructura guia
2. los servicios actuales siguen viviendo en `src/services/*` hasta una migracion controlada

