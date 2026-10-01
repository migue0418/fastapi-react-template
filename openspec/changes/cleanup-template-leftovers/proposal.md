## Why

La plantilla arrastra código del proyecto del que salió y pequeñas incoherencias que confunden a quien parte de ella:

- componentes y una dependencia que nadie usa;
- un dashboard con tipos de inventario;
- una migración preparada para un esquema que nunca existió;
- un modelo fuera de su sitio;
- una relación que carga todos los usuarios de un rol sin que nadie los pida;
- mensajes de la API en inglés o sin tildes.

## What Changes

- Frontend:
  - Se borran `useBarcodeScanner`, `BarcodeScannerModal` y `SearchableSelect` (con sus CSS), que nada usa, y se desinstala `@undecaf/barcode-detector-polyfill`.
  - El dashboard de inicio usa nombres genéricos en lugar de tipos de inventario (`InventoryAlert`, `RecentMovement`, `CategoryHighlight`, clases `home-movement-*`).
  - Textos de la interfaz con tildes: `aria-label` del menú y de la navegación, "Acciones rápidas" y "Esta acción".
- Backend, modelos y repositorios:
  - `AuthRefreshToken` pasa de `auth/repository.py` a `auth/models.py`.
  - `Role.users` deja de cargarse de forma ansiosa.
  - `UsersRepository` pierde el `selectinload` redundante y `get_user_by_username_without_roles`, cuyo nombre no se correspondía con lo que hace.
- Migraciones:
  - La migración 0001 pierde las ramas del esquema "legacy", y se borra su test.
  - Nueva migración de datos 0003: corrige la descripción del rol `admin` sembrada sin tilde, solo si conserva el valor original.
- **BREAKING (textos de la API)**: todos los `detail` de error pasan a español con tildes, incluidos los de tokens (`Missing access token`, `Refresh token reuse detected`...), los de sesiones, el del último admin y los del servido de la SPA. No cambian los códigos de estado.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `auth`: cambia el texto del detalle en la detección de reutilización del refresh token y en la revocación de una sesión ya revocada. Además, el seed crea los roles con descripciones con tilde.
- `users`: cambia el texto del detalle al intentar eliminar o degradar al último admin activo.

## Impact

- Backend:
  - Slice `auth`: `models.py` (nuevo), `repository.py`, `security.py`, `service.py`, `seed.py`.
  - Slice `users`: `repository.py`, `service.py`.
  - Slice `roles`: `models.py`.
  - `core/database.py` (`import_model_modules`), `web/spa.py`.
  - Migraciones: `alembic/versions/0001_initial.py` y la nueva `0003`.
  - Tests: `backend/tests/test_api.py`.
- Hay migración Alembic (0003, solo de datos); el esquema no cambia.
- Frontend:
  - Slices `app-shell`, `home` y `users`.
  - `shared/ui`, `shared/hooks`.
  - `package.json` y `package-lock.json` (se desinstala una dependencia).
- Clientes que comparen los textos en inglés del `detail`: el único cliente, el frontend de este repo, no los compara.
- Docs: `data-model.md`, `backend-standards.md` y `frontend-standards.md`, que citan código que este cambio mueve o borra.
