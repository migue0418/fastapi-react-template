# Modelo de datos (base de la plantilla)

Entidades base que trae la plantilla. Amplíalo al añadir nuevos slices con modelos.
Recuerda: todo modelo nuevo se importa en `app.core.database.import_model_modules()` y todo cambio de
schema requiere migración Alembic (`backend/alembic/versions/`).

## Entidades

### `User` (`users`): `app/features/users/models.py`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK, autoincrement |
| `username` | str(50) | único, indexado |
| `password_hash` | str(255) | hash argon2 (`pwdlib`) |
| `full_name` | str(255)? | nullable |
| `email` | str(255)? | nullable |
| `is_active` | bool | default `True` |
| `failed_login_attempts` | int | default `0`; se pone a cero al iniciar sesión, al expirar el bloqueo y al desbloquear |
| `locked_until` | datetime? | nullable; fin del bloqueo tras 5 intentos fallidos (15 minutos) |
| `created_at` / `updated_at` | datetime | `utcnow`, `onupdate=utcnow` |
| `roles` | M2M → `Role` | vía `user_roles`, `lazy="selectin"`: se cargan siempre con el usuario |

### `Role` (`roles`): `app/features/roles/models.py`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK, autoincrement |
| `name` | str(50) | único, indexado (p. ej. `admin`) |
| `description` | str(255) | default `""` |
| `created_at` / `updated_at` | datetime | |
| `users` | M2M → `User` | vía `user_roles`, `lazy="raise"`: no se carga nunca y leerla lanza `InvalidRequestError`; para saber qué usuarios tienen un rol, consulta desde `User` (p. ej. `UsersRepository.count_active_users_with_role`) |

### `UserRole` (`user_roles`): tabla de unión
- PK compuesta (`user_id`, `role_id`); FKs con `ondelete="CASCADE"`; `UniqueConstraint(user_id, role_id)`.

### `AuthRefreshToken` (`auth_refresh_tokens`): `app/features/auth/models.py`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int | PK, autoincrement |
| `user_id` | int | FK → `users.id`, `ondelete="CASCADE"` |
| `token_hash` | str(64) | único, indexado; SHA-256 del token (el token en claro solo viaja en la cookie) |
| `created_at` | datetime | `utcnow` |
| `expires_at` | datetime | |
| `revoked_at` | datetime? | nullable; se rellena al rotar, cerrar sesión o revocar |
| `user_agent` | str(255)? | nullable |
| `remember_me` | bool | default `False` |

- Refresh tokens revocables por usuario (login, refresh, logout). Al desactivar o eliminar un usuario, o al
  cambiar o restablecer su contraseña, se revocan sus refresh tokens. El acceso usa JWT.

## Reglas de negocio relevantes

- Último admin protegido: no se puede eliminar/desactivar/degradar al último admin activo
  (ver `UsersService._ensure_last_admin_is_not_removed`).
- `username` único: crear/actualizar con uno existente devuelve 409.
- Bloqueo por intentos: 5 fallos seguidos bloquean la cuenta 15 minutos. El login responde el mismo 401
  genérico si el usuario no existe, si la contraseña es incorrecta o si la cuenta está bloqueada. Un admin
  desbloquea con `POST /api/users/{id}/unlock` o al restablecer la contraseña.
- Fechas: se guardan como UTC sin zona (`utcnow`) y la API las devuelve con offset UTC (`UtcDatetime`).

## Invariantes al evolucionar el modelo

1. Define el modelo en `<feature>/models.py` heredando de `Base`.
2. Impórtalo en `app.core.database.import_model_modules()`.
3. Genera la migración Alembic y revísala antes de aplicarla.
4. Actualiza este documento.
