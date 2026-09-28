# Auth Specification

## Purpose

Autenticación de usuarios y gestión de sesiones bajo el prefijo `/api/auth`: emisión de un JWT de
acceso (HS256, expira a los `access_token_expire_minutes`) y un refresh token rotatorio almacenado en
una cookie HttpOnly (`refresh_token`, `path=/api/auth`, `secure` en producción, `samesite=lax`).
## Requirements
### Requirement: Login con usuario y contraseña
El sistema MUST autenticar mediante `POST /api/auth/login` (`username`, `password`, `remember_me`) y, si
las credenciales son válidas, la cuenta no está bloqueada y el usuario está activo, devolver un
`access_token` (tipo `bearer`) y emitir un refresh token en la cookie HttpOnly. Ante cualquier fallo de
credenciales o cuenta bloqueada MUST responder siempre 401 con el mismo detalle, de modo que la
respuesta no revele si el username existe ni si la cuenta está bloqueada. El sistema MUST verificar la
contraseña contra un hash también cuando el username no existe.

#### Scenario: Credenciales válidas
- **GIVEN** un usuario activo y no bloqueado
- **WHEN** envía username y password correctos
- **THEN** responde 200 con `access_token`
- **AND** establece la cookie `refresh_token` (con `max_age` solo si `remember_me` es true)
- **AND** pone a cero `failed_login_attempts` y `locked_until`

#### Scenario: Credenciales inválidas
- **WHEN** el username no existe o la contraseña es incorrecta
- **THEN** responde 401 con detalle "Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."

#### Scenario: Cuenta bloqueada
- **GIVEN** un usuario con `locked_until` posterior al instante actual
- **WHEN** envía cualquier contraseña, incluida la correcta
- **THEN** responde 401 con el mismo detalle que ante credenciales inválidas
- **AND** no emite tokens ni modifica `failed_login_attempts` ni `locked_until`

#### Scenario: Usuario inactivo
- **GIVEN** un usuario inactivo y no bloqueado
- **WHEN** envía username y password correctos
- **THEN** responde 401 con detalle "Usuario inactivo"

#### Scenario: Payload inválido
- **WHEN** falta `username` o `password`
- **THEN** responde 422

### Requirement: Endpoint de token compatible con OAuth2
El sistema MUST exponer `POST /api/auth/token` que acepta un formulario OAuth2
(`username`/`password`) y devuelve un `access_token`, para compatibilidad con el flujo password bearer.

#### Scenario: Obtener token vía formulario OAuth2
- **WHEN** se envía el formulario con credenciales válidas
- **THEN** responde 200 con `access_token` (equivale a login con `remember_me=false`)

### Requirement: Rotación de refresh token
El sistema MUST permitir renovar el acceso mediante `POST /api/auth/refresh` usando la cookie
`refresh_token`: revoca el token usado, emite uno nuevo y devuelve un nuevo `access_token`.

#### Scenario: Refresh válido
- **WHEN** la cookie contiene un refresh token vigente y no revocado
- **THEN** responde 200 con un nuevo `access_token`
- **AND** rota la cookie a un nuevo refresh token

#### Scenario: Falta el refresh token
- **WHEN** la petición no incluye la cookie `refresh_token`
- **THEN** responde 401

#### Scenario: Refresh token expirado
- **WHEN** el refresh token existe pero ha expirado
- **THEN** responde 401, revoca ese token y limpia la cookie

### Requirement: Detección de reuso de refresh token
El sistema MUST detectar el reuso de un refresh token ya revocado y, ante ello, revocar todos los
refresh tokens del usuario como medida de seguridad.

#### Scenario: Reuso de un token revocado
- **WHEN** se presenta un refresh token que ya estaba revocado
- **THEN** responde 401 con detalle "Refresh token reuse detected"
- **AND** revoca todas las sesiones (refresh tokens) de ese usuario

### Requirement: Logout
El sistema MUST permitir cerrar sesión mediante `POST /api/auth/logout`, revocando el refresh token
actual (si existe y no estaba revocado) y limpiando la cookie.

#### Scenario: Logout con sesión activa
- **WHEN** un usuario con cookie `refresh_token` válida hace logout
- **THEN** responde 204, revoca ese refresh token y borra la cookie

### Requirement: Usuario autenticado actual
El sistema MUST exponer `GET /api/auth/me` que, con un access token válido, devuelve los datos del
usuario (`id`, `username`, `full_name`, `email`, `is_active`, `roles`).

#### Scenario: Token válido
- **WHEN** se llama a `/api/auth/me` con un Bearer token válido
- **THEN** responde 200 con los datos del usuario autenticado

#### Scenario: Token ausente, inválido o expirado
- **WHEN** no hay token, o es inválido/expirado, o el usuario está inactivo/no existe
- **THEN** responde 401

### Requirement: Autorización por roles
El sistema MUST proteger los endpoints que lo requieran exigiendo que el usuario autenticado posea al
menos uno de los roles requeridos; en caso contrario responde 403.

#### Scenario: Falta de rol requerido
- **WHEN** un usuario autenticado sin el rol requerido accede a un recurso protegido por rol
- **THEN** responde 403 con detalle "No tienes permisos para acceder a este recurso"

### Requirement: Listado y revocación de sesiones
El sistema MUST permitir a un usuario autenticado listar sus sesiones activas
(`GET /api/auth/sessions`) y revocar una sesión concreta (`DELETE /api/auth/sessions/{session_id}`),
marcando cuál es la sesión actual.

#### Scenario: Listar sesiones
- **WHEN** un usuario autenticado consulta sus sesiones
- **THEN** responde 200 con las sesiones activas (`id`, `created_at`, `expires_at`, `user_agent`, `is_current`)

#### Scenario: Revocar una sesión propia
- **WHEN** el usuario revoca una sesión activa que le pertenece
- **THEN** responde 204 y la sesión queda revocada
- **AND** si era la sesión actual, limpia la cookie

#### Scenario: Sesión inexistente o ajena
- **WHEN** el `session_id` no existe o pertenece a otro usuario
- **THEN** responde 404

#### Scenario: Sesión ya revocada
- **WHEN** se intenta revocar una sesión que ya estaba revocada
- **THEN** responde 400 con detalle "Sesion ya revocada"

### Requirement: Usuario administrador inicial (seed)
El sistema MUST garantizar en el arranque la existencia de los roles `admin` y `user` y de un usuario
administrador inicial (según `ADMIN_USERNAME`/`ADMIN_PASSWORD`).

#### Scenario: Primer arranque sin admin
- **WHEN** la base de datos no contiene el usuario administrador configurado
- **THEN** se crean los roles `admin` y `user` y el usuario administrador con el rol `admin`

### Requirement: Bloqueo de cuenta por intentos fallidos
El sistema MUST contar los intentos de login fallidos de un usuario existente y, al llegar a 5, bloquear
la cuenta durante 15 minutos (`locked_until`). Cuando un bloqueo ha expirado, el sistema MUST poner el
contador a cero antes de evaluar el siguiente intento.

#### Scenario: Quinto intento fallido
- **GIVEN** un usuario con 4 intentos fallidos y sin bloqueo vigente
- **WHEN** envía una contraseña incorrecta
- **THEN** responde 401
- **AND** `locked_until` queda 15 minutos después del instante actual

#### Scenario: Fallo tras un bloqueo expirado
- **GIVEN** un usuario cuyo `locked_until` ya ha pasado y con 5 intentos fallidos registrados
- **WHEN** envía una contraseña incorrecta
- **THEN** responde 401
- **AND** `failed_login_attempts` queda en 1 y la cuenta no se bloquea

#### Scenario: Login correcto tras un bloqueo expirado
- **GIVEN** un usuario activo cuyo `locked_until` ya ha pasado
- **WHEN** envía la contraseña correcta
- **THEN** responde 200 y el contador y `locked_until` quedan a cero

### Requirement: Fechas de sesiones con zona horaria UTC
El sistema MUST serializar `created_at` y `expires_at` de `GET /api/auth/sessions` en ISO 8601 con
offset UTC explícito.

#### Scenario: Listado de sesiones
- **GIVEN** un usuario autenticado con al menos una sesión activa
- **WHEN** consulta `GET /api/auth/sessions`
- **THEN** cada `created_at` y `expires_at` termina en `+00:00` o `Z`

#### Scenario: Sin autenticación
- **WHEN** se consulta `GET /api/auth/sessions` sin token
- **THEN** responde 401

