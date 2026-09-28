## Why

La revisión del proyecto encontró errores en autenticación y fechas que el usuario ve directamente: horas de sesión desplazadas, errores de validación mostrados como "[object Object]", un bloqueo de cuenta que nunca se comunica y que se reactiva con un solo fallo, y una expulsión silenciosa tras cambiar la contraseña. Además, el login permite averiguar qué usernames existen.

## What Changes

- Las fechas de la API (`created_at` y `expires_at` de sesiones, `locked_until` de usuarios) se serializan con offset UTC. Hoy salen sin zona y el navegador las lee como hora local.
- Login con respuesta uniforme: cualquier fallo de credenciales, incluido el de una cuenta bloqueada, responde 401 con el mismo detalle ("Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."). Se verifica la contraseña también cuando el usuario no existe, para igualar tiempos. **BREAKING**: desaparece el 429 de cuenta bloqueada.
- Al expirar un bloqueo, el contador de intentos fallidos vuelve a cero.
- El restablecimiento de contraseña por un admin desbloquea la cuenta.
- Nuevo endpoint `POST /api/users/{user_id}/unlock` (solo admin) para desbloquear sin cambiar la contraseña.
- La contraseña actual incorrecta en `POST /api/users/me/change-password` responde 400 en lugar de 401. **BREAKING** para clientes que esperen 401.
- Frontend:
  - `http.ts` convierte el `detail` en lista de un 422 en un mensaje legible.
  - `http.ts` no intenta refrescar el token ante un 401 de `/auth/login`.
  - LoginPage muestra el mensaje que devuelve el backend.
  - Tras cambiar la propia contraseña, se cierra la sesión y se lleva al login con un aviso.
  - UsersPage ofrece desbloquear usuarios bloqueados.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `auth`: el login responde de forma uniforme ante credenciales inválidas y cuenta bloqueada, y se especifica el bloqueo por intentos fallidos (hoy implementado pero sin spec). Las fechas de sesiones llevan offset UTC.
- `users`: nuevo desbloqueo por admin, el reset de contraseña desbloquea, la contraseña actual incorrecta pasa a 400 y `locked_until` lleva offset UTC.

## Impact

- Backend, slices `auth` (service, schemas) y `users` (router, service, schemas); `app/core/datetime.py` para el tipo de fecha serializada. Sin cambios en el modelo de datos ni migración Alembic.
- Frontend: `shared/api/http.ts`, `features/auth` (LoginPage), `features/profile` (ProfilePage), `features/users` (api, UsersPage).
- Contrato de API: el login pierde el 429, change-password pasa de 401 a 400 y aparece `POST /api/users/{user_id}/unlock`. El único cliente es el frontend de este repo.
- Tests: `backend/tests/test_api.py` (bloqueo, cambio de contraseña, fechas) y tests de Vitest nuevos para `http.ts` y LoginPage.
