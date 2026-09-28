# Users Specification

## Purpose

Gestión de cuentas de usuario y sus roles, bajo el prefijo `/api/users`. La administración (listar,
ver, crear, actualizar, borrar, restablecer contraseña) está restringida al rol `admin`; cualquier
usuario autenticado puede cambiar su propia contraseña.
## Requirements
### Requirement: Listar usuarios (admin)
El sistema MUST exponer `GET /api/users` accesible solo para usuarios con rol `admin` y devolver el
listado de usuarios ordenado por `username` ascendente, con `id`, `username`, `full_name`, `email`,
`is_active` y la lista de nombres de roles.

#### Scenario: Acceso autorizado
- **WHEN** un admin autenticado llama a `GET /api/users`
- **THEN** responde 200 con la lista de usuarios ordenada por username asc

#### Scenario: Acceso sin rol admin
- **WHEN** un usuario autenticado sin rol `admin` llama al endpoint
- **THEN** responde 403

### Requirement: Detalle de usuario (admin)
El sistema MUST exponer `GET /api/users/{user_id}` (solo admin) que devuelve el detalle del usuario
incluyendo `role_ids` además de los nombres de roles.

#### Scenario: Usuario existente
- **WHEN** un admin solicita un usuario existente
- **THEN** responde 200 con el detalle incluyendo `role_ids`

#### Scenario: Usuario inexistente
- **WHEN** el `user_id` no existe
- **THEN** responde 404 con detalle "Usuario no encontrado"

### Requirement: Crear usuario (admin)
El sistema MUST permitir crear usuarios mediante `POST /api/users` (solo admin) hasheando la
contraseña con argon2 y asignando al menos un rol válido.

#### Scenario: Creación válida
- **WHEN** un admin envía un payload válido con al menos un `role_id` existente
- **THEN** responde 201 con el detalle del usuario creado

#### Scenario: Username duplicado
- **WHEN** ya existe un usuario con ese `username`
- **THEN** responde 409 con detalle "Ya existe un usuario con ese username"

#### Scenario: role_ids inválidos
- **WHEN** alguno de los `role_ids` no corresponde a un rol existente
- **THEN** responde 400 con detalle "Uno o varios roles no existen"

#### Scenario: Payload inválido
- **WHEN** falta `username`/`password` o `role_ids` está vacío
- **THEN** responde 422

### Requirement: Actualizar usuario (admin)
El sistema MUST permitir actualizar `username`, `full_name`, `email`, `is_active` y `role_ids` de un
usuario mediante `PUT /api/users/{user_id}` (solo admin), validando duplicados de username y la
existencia de los roles.

#### Scenario: Actualización válida
- **WHEN** un admin actualiza un usuario existente con datos válidos
- **THEN** responde 200 con el detalle actualizado

#### Scenario: Username duplicado al actualizar
- **WHEN** el nuevo `username` ya pertenece a otro usuario
- **THEN** responde 409

#### Scenario: Desactivar usuario
- **WHEN** la actualización pone `is_active=false`
- **THEN** además de aplicarse, se revocan todos los refresh tokens de ese usuario

### Requirement: Eliminar usuario (admin)
El sistema MUST permitir eliminar usuarios mediante `DELETE /api/users/{user_id}` (solo admin),
revocando sus refresh tokens.

#### Scenario: Eliminación válida
- **WHEN** un admin elimina un usuario existente
- **THEN** responde 204 y se revocan sus refresh tokens

#### Scenario: Usuario inexistente
- **WHEN** el `user_id` no existe
- **THEN** responde 404

### Requirement: Protección del último admin activo
El sistema MUST impedir que una operación deje al sistema sin ningún admin activo: no se puede
eliminar, desactivar ni quitar el rol `admin` al último administrador activo.

#### Scenario: Borrado del último admin activo
- **WHEN** se intenta borrar al único admin activo
- **THEN** responde 400 con detalle "No se puede eliminar o degradar al ultimo admin activo"

#### Scenario: Degradación del último admin activo
- **WHEN** una actualización quitaría el rol `admin` o desactivaría al único admin activo
- **THEN** responde 400 con el mismo detalle, sin aplicar el cambio

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

