## MODIFIED Requirements

### Requirement: Detección de reuso de refresh token
El sistema MUST detectar el reuso de un refresh token ya revocado y, ante ello, revocar todos los
refresh tokens del usuario como medida de seguridad.

#### Scenario: Reuso de un token revocado
- **GIVEN** un refresh token que ya estaba revocado
- **WHEN** se presenta en `POST /api/auth/refresh`
- **THEN** responde 401 con detalle "Se ha detectado la reutilización del token de refresco"
- **AND** revoca todas las sesiones (refresh tokens) de ese usuario

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
- **THEN** responde 404 con detalle "Sesión no encontrada"

#### Scenario: Sesión ya revocada
- **WHEN** se intenta revocar una sesión que ya estaba revocada
- **THEN** responde 400 con detalle "Sesión ya revocada"

### Requirement: Usuario administrador inicial (seed)
El sistema MUST garantizar en el arranque la existencia de los roles `admin` y `user` y de un usuario
administrador inicial (según `ADMIN_USERNAME`/`ADMIN_PASSWORD`). Las descripciones de los roles MUST
ser "Administración del sistema" (`admin`) y "Usuario operativo" (`user`).

#### Scenario: Primer arranque sin admin
- **WHEN** la base de datos no contiene el usuario administrador configurado
- **THEN** se crean los roles `admin` y `user` y el usuario administrador con el rol `admin`
- **AND** el rol `admin` tiene la descripción "Administración del sistema"

#### Scenario: Base existente con la descripción antigua
- **GIVEN** una base de datos con el rol `admin` y la descripción "Administracion del sistema"
- **WHEN** se aplican las migraciones
- **THEN** la descripción pasa a "Administración del sistema"

#### Scenario: Descripción personalizada
- **GIVEN** una base de datos donde un admin cambió la descripción del rol `admin`
- **WHEN** se aplican las migraciones
- **THEN** la descripción no cambia

## ADDED Requirements

### Requirement: Mensajes de error de autenticación en español
El sistema MUST devolver en español los `detail` de los errores de autenticación, sin cambiar los
códigos de estado.

#### Scenario: Sin access token
- **WHEN** se llama a un endpoint protegido sin cabecera `Authorization`
- **THEN** responde 401 con detalle "Falta el token de acceso"

#### Scenario: Access token no válido
- **WHEN** se llama con un Bearer token mal formado o con firma incorrecta
- **THEN** responde 401 con detalle "Token de acceso no válido"

#### Scenario: Access token caducado
- **WHEN** se llama con un Bearer token caducado
- **THEN** responde 401 con detalle "El token de acceso ha caducado"

#### Scenario: Sin refresh token
- **WHEN** se llama a `POST /api/auth/refresh` sin la cookie `refresh_token`
- **THEN** responde 401 con detalle "Falta el token de refresco"

#### Scenario: Refresh token desconocido
- **WHEN** la cookie `refresh_token` no corresponde a ningún token emitido
- **THEN** responde 401 con detalle "Token de refresco no válido"

#### Scenario: Refresh token caducado
- **WHEN** la cookie contiene un refresh token caducado
- **THEN** responde 401 con detalle "El token de refresco ha caducado"
