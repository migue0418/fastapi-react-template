## MODIFIED Requirements

### Requirement: Cambiar la propia contraseña
El sistema MUST permitir a cualquier usuario autenticado cambiar su contraseña mediante
`POST /api/users/me/change-password`, verificando la contraseña actual y revocando todos sus refresh
tokens, incluido el de la sesión actual. Una contraseña actual incorrecta MUST responder 400 (no 401),
para que el cliente no la confunda con un access token caducado.

#### Scenario: Cambio válido
- **GIVEN** un usuario autenticado
- **WHEN** envía `current_password` correcta y una `new_password` válida
- **THEN** responde 204, actualiza el hash y revoca todos sus refresh tokens

#### Scenario: Contraseña actual incorrecta
- **WHEN** `current_password` no coincide con la del usuario
- **THEN** responde 400 con detalle "La contraseña actual no es válida"
- **AND** no revoca ningún refresh token

#### Scenario: Nueva contraseña demasiado corta
- **WHEN** `new_password` tiene menos de 8 caracteres
- **THEN** responde 422

#### Scenario: Sin autenticación
- **WHEN** se llama sin access token
- **THEN** responde 401

### Requirement: Restablecer contraseña (admin)
El sistema MUST permitir a un admin restablecer la contraseña de cualquier usuario mediante
`POST /api/users/{user_id}/reset-password`, revocando los refresh tokens del usuario afectado y
desbloqueando la cuenta (`failed_login_attempts` a 0 y `locked_until` a nulo).

#### Scenario: Reset válido
- **WHEN** un admin envía una `new_password` para un usuario existente
- **THEN** responde 204, actualiza el hash y revoca los refresh tokens de ese usuario

#### Scenario: Reset de un usuario bloqueado
- **GIVEN** un usuario con `locked_until` vigente
- **WHEN** un admin le restablece la contraseña
- **THEN** responde 204 y el usuario puede iniciar sesión de inmediato con la nueva contraseña

#### Scenario: Usuario inexistente
- **WHEN** el `user_id` no existe
- **THEN** responde 404

#### Scenario: Sin rol admin
- **WHEN** un usuario autenticado sin rol `admin` llama al endpoint
- **THEN** responde 403

## ADDED Requirements

### Requirement: Desbloquear usuario (admin)
El sistema MUST permitir a un admin desbloquear una cuenta mediante `POST /api/users/{user_id}/unlock`,
poniendo `failed_login_attempts` a 0 y `locked_until` a nulo sin cambiar la contraseña ni revocar
sesiones. La operación MUST ser idempotente.

#### Scenario: Desbloqueo de un usuario bloqueado
- **GIVEN** un usuario con `locked_until` vigente
- **WHEN** un admin llama a `POST /api/users/{user_id}/unlock`
- **THEN** responde 204
- **AND** el usuario puede iniciar sesión de inmediato con su contraseña actual

#### Scenario: Usuario no bloqueado
- **GIVEN** un usuario sin bloqueo
- **WHEN** un admin llama al endpoint
- **THEN** responde 204 sin otros efectos

#### Scenario: Usuario inexistente
- **WHEN** el `user_id` no existe
- **THEN** responde 404 con detalle "Usuario no encontrado"

#### Scenario: Sin rol admin
- **WHEN** un usuario autenticado sin rol `admin` llama al endpoint
- **THEN** responde 403

#### Scenario: Sin autenticación
- **WHEN** se llama sin access token
- **THEN** responde 401

#### Scenario: Identificador inválido
- **WHEN** `user_id` es 0 o negativo
- **THEN** responde 422

### Requirement: Estado de bloqueo en las respuestas de usuario
El sistema MUST incluir `is_locked` y `locked_until` en las respuestas de listado y detalle de usuarios,
serializando `locked_until` en ISO 8601 con offset UTC explícito.

#### Scenario: Usuario bloqueado en el listado
- **GIVEN** un usuario con `locked_until` vigente
- **WHEN** un admin consulta `GET /api/users`
- **THEN** ese usuario aparece con `is_locked` true y `locked_until` terminado en `+00:00` o `Z`

#### Scenario: Usuario sin bloqueo
- **GIVEN** un usuario sin bloqueo
- **WHEN** un admin consulta su detalle
- **THEN** `is_locked` es false y `locked_until` es nulo
