## MODIFIED Requirements

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

## ADDED Requirements

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
