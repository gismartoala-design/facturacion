# Shared

Esta carpeta agrupa piezas reutilizables que no representan un dominio principal ni una extension de negocio por si mismas.

Aqui deben vivir gradualmente:

1. UI reusable
2. helpers genericos
3. tipos compartidos
4. utilidades de dashboard
5. componentes de soporte documental reutilizables

Regla:

1. `shared` no debe cargar reglas pesadas de negocio
2. si una pieza contiene reglas centrales del sistema, debe vivir en `core`
3. si una pieza depende de una capacidad opcional, debe vivir en `modules`

