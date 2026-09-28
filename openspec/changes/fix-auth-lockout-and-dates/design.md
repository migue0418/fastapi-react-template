## Context

El bloqueo por intentos fallidos llegó en el commit 2e63b63 sin spec. `AuthService.login` responde 429 solo a usuarios existentes y no pone a cero `failed_login_attempts` cuando caduca `locked_until`. Por eso, pasados los 15 minutos, un solo fallo vuelve a bloquear (6 >= 5).

Todas las fechas se guardan como UTC naive (`app/core/datetime.py::utcnow`) y la API las devuelve sin offset. En el frontend, `new Date(...)` las interpreta como hora local.

`shared/api/http.ts` intenta refrescar el token ante cualquier 401, incluido el de `/auth/login`. Además, trata `detail` como texto aunque en un 422 FastAPI devuelve una lista.

Decisiones ya tomadas con el usuario:
- Mensaje de login genérico en lugar de 429.
- Forzar un nuevo login tras cambiar la propia contraseña.

## Goals / Non-Goals

**Goals:**
- Fechas de la API con offset UTC, sin migración.
- Login que no revela si el usuario existe o está bloqueado.
- Contador de bloqueo correcto al expirar y desbloqueo manual por admin.
- Errores de la API legibles en el frontend, sin refrescos innecesarios.

**Non-Goals:**
- Guardar fechas como `timestamptz` en la base de datos.
- Rate limiting detrás de proxy, almacenamiento compartido del limiter, decodificación base64url en `AuthProvider`. Van en otros cambios.
- Mover el cambio de contraseña al slice `auth`.

## Decisions

### Fechas: tipo anotado en la serialización

`app/core/datetime.py` añade `UtcDatetime = Annotated[datetime, AfterValidator(...)]`. Ese validador marca como UTC un datetime naive y convierte a UTC uno con zona. Se usa en `SessionInfo.created_at`/`expires_at` y en `UserResponse.locked_until`.

Alternativas descartadas:
- `DateTime(timezone=True)` con migración: obliga a cambiar `utcnow()` y todas las comparaciones, que hoy son naive contra naive.
- Añadir `Z` en el frontend: repite la regla en cada consumidor y se rompe si otro cliente lee la API.

### Login uniforme y verificación de tiempo constante

- `security.py` calcula al importar un hash de una contraseña aleatoria (`_DUMMY_PASSWORD_HASH`, privado) y expone `verify_login_password(value, hash | None)`, que verifica contra ese hash si no hay usuario. `login` siempre lo llama, así que el coste de argon2 domina el tiempo de respuesta en los dos casos.
- El detalle vive en una constante del servicio, `INVALID_CREDENTIALS_DETAIL`.

Orden en `AuthService.login`:
1. Cargar el usuario y verificar la contraseña (siempre).
2. Si hay usuario y `locked_until` está vigente: 401 genérico, sin tocar el contador. Si no se incrementa mientras dura el bloqueo, un atacante no puede alargarlo indefinidamente.
3. Si `locked_until` está caducado: poner el contador a 0 y `locked_until` a nulo.
4. Si la contraseña es incorrecta: incrementar, bloquear al llegar a 5, hacer commit y devolver 401 genérico.
5. Si el usuario está inactivo: 401 "Usuario inactivo". Solo se alcanza con la contraseña correcta, así que no filtra nada a quien no la conoce.
6. Éxito: poner a cero y emitir tokens, igual que ahora.

### Desbloqueo

- `UsersService` gana un `_clear_lockout(user)` que comparten `reset_password` y el nuevo `unlock_user`.
- El router añade `POST /{user_id}/unlock` con `require_roles("admin")` y `Path(gt=0)`, y responde 204, igual que `reset-password`.
- No hace falta repository: reutiliza `_get_user_or_404`.

### Cambio de contraseña: 400 y re-login

El backend responde 400 si la contraseña actual es incorrecta, así que `http.ts` no lo confunde con un token caducado.

En el frontend, tras el 204, `ProfilePage` navega a `/login` con `state.notice` y después llama a `logout()`, ignorando su posible fallo. El orden importa: `BrowserRouter` aplica la navegación dentro de una transición, así que si `logout()` va primero, `ProtectedRoute` redirige a `/login` sin state y el aviso se pierde. LoginPage muestra ese aviso. El backend no cambia la revocación: ya revoca todo.

### http.ts

- Nueva clase exportada `ApiError extends Error` con `status`, para que las pantallas puedan distinguir errores de red de respuestas de la API.
- `parseError` acepta `detail` como texto o como lista de `{ msg }` (formato de error de validación de FastAPI) y en ese caso une los `msg`.
- No se intenta refrescar en `/auth/login` ni en `/auth/refresh` (lista `NO_REFRESH_URLS`).

### Frontend por capas

- `features/users/api.ts`: `unlockUserRequest(userId)`.
- `UsersPage`: botón de desbloqueo en las filas con `is_locked`, con `locked_until` formateado en el `title`; recarga la lista.
- `LoginPage`: muestra `error.message` si es `ApiError`, y un mensaje genérico de conexión si no lo es. También muestra `location.state.notice`.
- `ProfilePage`: logout y redirección tras el cambio.
- No hay rutas nuevas.

### Modelo de datos

Sin cambios, sin migración Alembic y sin modelos nuevos en `import_model_modules`.

## Risks / Trade-offs

- [Un usuario bloqueado legítimo no sabe que está bloqueado] → El mensaje genérico menciona la regla de bloqueo, y el admin ve el estado en UsersPage y puede desbloquear.
- [La verificación argon2 con usuarios inexistentes o bloqueados cuesta CPU] → El rate limit de 10/min por IP en `/login` lo acota.
- [La consulta a la base de datos sigue variando un poco entre usuario existente e inexistente] → Es despreciable frente a argon2 y lo aceptamos.
- [Cambios de contrato (fin del 429, change-password pasa a 400)] → El único cliente es el frontend de este repo, que se actualiza en el mismo cambio.

## Migration Plan

Backend y frontend se despliegan juntos (misma imagen Docker). No hay migración de datos. Para revertir, basta con revertir el commit.

## Open Questions

Ninguna.
