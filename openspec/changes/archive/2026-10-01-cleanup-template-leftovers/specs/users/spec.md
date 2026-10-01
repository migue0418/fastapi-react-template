## MODIFIED Requirements

### Requirement: Protección del último admin activo
El sistema MUST impedir que una operación deje al sistema sin ningún admin activo: no se puede
eliminar, desactivar ni quitar el rol `admin` al último administrador activo.

#### Scenario: Borrado del último admin activo
- **WHEN** se intenta borrar al único admin activo
- **THEN** responde 400 con detalle "No se puede eliminar o degradar al último admin activo"

#### Scenario: Degradación del último admin activo
- **WHEN** una actualización quitaría el rol `admin` o desactivaría al único admin activo
- **THEN** responde 400 con el mismo detalle, sin aplicar el cambio

#### Scenario: Sin rol admin
- **WHEN** un usuario autenticado sin rol `admin` intenta borrar o actualizar a otro usuario
- **THEN** responde 403
