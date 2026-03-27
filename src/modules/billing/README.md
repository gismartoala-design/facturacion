# Billing Module

Esta carpeta representa la extension de facturacion del sistema.

Decision de arquitectura:

1. a nivel de negocio la capacidad se llama `billing`
2. la implementacion actual usa componentes y servicios bajo el nombre tecnico `sri`
3. durante la Fase 1 no se mueve el runtime completo
4. en fases siguientes la logica actual de `src/services/sri` y `src/modules/sri` migrara hacia esta carpeta

Responsabilidades futuras:

1. facturacion electronica
2. XML y RIDE
3. autorizacion y reintentos
4. integraciones tributarias
5. documentos fiscales derivados

