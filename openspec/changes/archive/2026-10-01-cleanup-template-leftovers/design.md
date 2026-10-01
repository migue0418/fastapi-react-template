## Context

Estado verificado en `main` (d83f3f1 más el archivado de #3):

- **Código sin usar en el frontend:** `useBarcodeScanner`, `BarcodeScannerModal` y `SearchableSelect` no se importan desde ningún componente. `useBarcodeScanner` es el único que usa `@undecaf/barcode-detector-polyfill`.
- **Dashboard (`features/home/dashboard.ts` y `HomePage.tsx`):** usa tipos de inventario del proyecto de origen:
  - `InventoryAlert` con `reference`, `location` y `stock`;
  - `RecentMovement`;
  - `CategoryHighlight`;
  - clases CSS `home-alert-*` y `home-movement-*`.
  Tres de las cuatro listas están vacías.
- **Modelo de refresh tokens:** `AuthRefreshToken` está definido en `auth/repository.py`, y `import_model_modules` importa ese módulo para registrar el modelo.
- **Relaciones entre usuarios y roles:**
  - `Role.users` tiene `lazy="selectin"` y ningún código lo lee. Cargar roles (`list_roles`, `get_roles_by_ids` en cada alta o edición de usuario, `get_role_by_name` en el seed) trae todos los usuarios de esos roles.
  - `User.roles` también es `selectin`, así que el `selectinload` de `UsersRepository._user_query` sobra, y `get_user_by_username_without_roles` sí carga roles.
- **Migración 0001:** comprueba si las tablas existen y, si existen, añade columnas "legacy" de un esquema anterior a Alembic que la plantilla nunca tuvo. `test_legacy_schema_is_migrated_and_seeded` y `_seed_legacy_schema` prueban esa rama.
- **Mensajes:**
  - En inglés: `security.py`, `auth/service.py` y `web/spa.py`.
  - Sin tilde: "Sesion no encontrada", "Sesion ya revocada", "ultimo admin", la descripción "Administracion del sistema" del seed y varios textos del frontend.

## Goals / Non-Goals

**Goals:**
- Plantilla sin código ni vocabulario del proyecto de origen.
- Modelos en `models.py`, según la convención del repo.
- Cargas de BD sin consultas que nadie usa.
- Mensajes al usuario en español con tildes.

**Non-Goals:**
- Documentación editorial de `docs/` y README (cambio 4).
- Mover `/health` bajo `/api`.
- Validar `ADMIN_PASSWORD` en producción y retirar `X-XSS-Protection`.
- Cambiar el comportamiento de "reuse detected" tras cambiar la contraseña: solo cambia el texto.
- Traducir los mensajes de validación 422 de Pydantic.

## Decisions

### Frontend: borrar en lugar de mover

Se borran `shared/hooks/useBarcodeScanner.ts`, `shared/ui/BarcodeScannerModal.{tsx,css}` y `shared/ui/SearchableSelect.{tsx,css}`, y se ejecuta `npm uninstall @undecaf/barcode-detector-polyfill`, que actualiza `package.json` y `package-lock.json`. No se deja ninguna versión "genérica": quien los necesite los recupera del historial.

### Dashboard con nombres genéricos

| Antes | Después |
| --- | --- |
| `InventoryAlert` (`reference`, `description`, `location`, `stock`) | `HighlightItem` (`title`, `description`, `meta`, `value`) |
| `inventoryAlerts` | `highlights` |
| `RecentMovement` (`reference`, `summary`, `time`, `status`) | `ActivityItem` (`title`, `summary`, `time`, `status`) |
| `recentMovements` | `recentActivity` |
| `CategoryHighlight` | `DistributionItem` |
| `categoryHighlights` | `distribution` |
| `.home-alert-*` | `.home-highlight-*` |
| `.home-movement-*` | `.home-activity-*` |

La estructura visual no cambia.

### AuthRefreshToken en auth/models.py

- El modelo se mueve sin cambios de columnas.
- `repository.py` lo importa y conserva `AuthRepository` y sus funciones de token.
- `import_model_modules` importa `app.features.auth.models` en lugar del repositorio.
- Sin migración de esquema. `alembic check` ya da en `main` un falso positivo sobre la restricción única de `user_roles` (la PK compuesta cubre el mismo par). El criterio es que su salida sea idéntica antes y después del movimiento.

### Role.users sin carga ansiosa

`Role.users` pasa a `lazy="raise"`: una lectura accidental en código async falla con un error claro, en lugar de hacer una consulta oculta o un `MissingGreenlet`.

Verificado con SQLAlchemy 2.0.49 en el plan técnico:
- Asignar `user.roles` (alta, edición y seed) no consulta `Role.users`: el backref usa flags pasivos.
- Borrar un rol con usuarios sí carga la colección, pero lo hace el unit of work sin lanzar error, con el mismo SQL que con `select`.
- `User.roles` no cambia.

En `UsersRepository`:
- se quita el `selectinload` redundante, porque la carga de roles la define el modelo;
- se elimina `get_user_by_username_without_roles`, y sus llamadas pasan a `get_user_by_username`.

### Migración 0001 sin ramas legacy

- `upgrade()` crea las cuatro tablas y sus índices sin inspeccionar lo que ya existe.
- Se eliminan los helpers `_existing_*`, `_seed_legacy_schema` y `test_legacy_schema_is_migrated_and_seeded`.
- Editar una migración ya aplicada es seguro aquí: Alembic no la vuelve a ejecutar en bases que ya están en `0001` o posterior, y en una base vacía el resultado es el mismo que antes.

### Migración de datos 0003

Aplica `UPDATE roles SET description = 'Administración del sistema' WHERE name = 'admin' AND description = 'Administracion del sistema'`, con el `downgrade` simétrico. Solo toca el valor original para respetar descripciones que un admin haya editado. El seed se corrige para las bases nuevas.

### Mensajes

| Antes | Después |
| --- | --- |
| Missing access token | Falta el token de acceso |
| Invalid access token | Token de acceso no válido |
| Access token expired | El token de acceso ha caducado |
| Refresh token missing | Falta el token de refresco |
| Invalid refresh token | Token de refresco no válido |
| Refresh token expired | El token de refresco ha caducado |
| Refresh token reuse detected | Se ha detectado la reutilización del token de refresco |
| Sesion no encontrada | Sesión no encontrada |
| Sesion ya revocada | Sesión ya revocada |
| ...al ultimo admin activo | ...al último admin activo |
| Not found (SPA) | No encontrado |
| Frontend build not found. Run `npm run build` inside frontend. | No se encuentra el build del frontend. Ejecuta `npm run build` en frontend. |

Frontend:
- "Abrir menú", "Plegar menú" y "Expandir menú".
- "Acciones rápidas" y "Esta acción".
- En `shared/ui/Pagination.tsx`: "Paginación" (es un landmark), "Elementos por página" y "por página".
- `Sidebar` repite `aria-label="Navegacion principal"` en el `<aside>` y en el `<nav>`, lo que da dos landmarks con el mismo nombre. El `<aside>` pasa a "Barra lateral" y el `<nav>` queda como "Navegación principal".

El frontend no compara ninguno de estos textos: `http.ts` refresca ante cualquier 401 y las pantallas muestran `message`.

### Documentación que queda desfasada con este cambio

Se actualiza aquí, no en el cambio 4:
- `docs/data-model.md`: ubicación del modelo de refresh tokens y relación `Role.users`.
- `docs/backend-standards.md`: sus ejemplos citan `get_user_by_username_without_roles` y `selectinload(User.roles)`.
- `docs/frontend-standards.md`: lista `shared/hooks/`, que desaparece.

## Risks / Trade-offs

- [Un cliente externo compara los textos en inglés] → No hay otro cliente que el frontend del repo. Es un cambio de contrato documentado como BREAKING en la propuesta.
- [`lazy="raise"` rompe una ruta no cubierta por tests] → Solo se lee `Role.users` si alguien accede explícitamente; los tests de usuarios y roles y el E2E cubren alta, edición y listado. Si aparece un fallo, el plan cae a `lazy="select"`.
- [Editar 0001 en bases que se crearon con la rama legacy] → La plantilla nunca tuvo ese esquema; una base así ya está migrada y 0001 no se vuelve a ejecutar.

## Migration Plan

Hay que aplicar la migración 0003 (se ejecuta sola al arrancar). Para revertir: `alembic downgrade 0002` y revertir el commit.

## Open Questions

Ninguna.
