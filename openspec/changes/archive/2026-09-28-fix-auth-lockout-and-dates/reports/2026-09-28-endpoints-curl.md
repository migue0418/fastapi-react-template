# Pruebas de endpoints con curl: 2026-09-28

Ejecutadas por el agente contra el backend de la rama feature/fix-auth-lockout-and-dates (uvicorn en 127.0.0.1:8000).

Base de datos: `fastapi_template_e2e`, creada solo para estas pruebas y para el E2E, con el admin sembrado por variables de entorno (`ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=E2eAdmin123!`). Así no se toca `fastapi_template` ni hace falta leer `backend/.env`. Se borra al terminar el E2E.

Los tokens y las cookies se omiten en la salida. El rate limit de `/api/auth/login` (10 por minuto) obligó a repetir la pasada tras esperar a que caducara la ventana; abajo está la pasada completa.

Observación fuera de alcance: tras cambiar la contraseña, un refresh con el token revocado responde "Refresh token reuse detected", porque el backend trata cualquier token revocado como reutilizado. Ya ocurría antes de este cambio.

## Resultado

| Caso | Esperado | Obtenido |
| --- | --- | --- |
| Login válido | 200 | 200 |
| Login con usuario inexistente | 401 genérico | 401 genérico |
| 5 fallos seguidos | 401 genérico y bloqueo de 15 minutos | 401 genérico, `failed_login_attempts=5`, `locked_until` a 15 minutos |
| Contraseña correcta con la cuenta bloqueada | 401 genérico sin cookie y sin cambios en BD | 401 genérico sin `set-cookie`, BD sin cambios |
| Login con payload vacío | 422 | 422 |
| `GET /api/auth/sessions` | fechas con offset UTC | `...Z` |
| `GET /api/auth/sessions` sin token | 401 | 401 |
| `locked_until` en el detalle de usuario | offset UTC y misma hora que en la BD | `2026-09-28T18:29:27.252647Z`, igual al valor de la BD |
| `POST /unlock` sin token / id 0 / inexistente / válido / sin rol admin | 401 / 422 / 404 / 204 / 403 | 401 / 422 / 404 / 204 / 403 |
| Login tras el desbloqueo | 200 | 200 |
| change-password con la contraseña actual incorrecta | 400, sin revocar sesiones | 400, el refresh posterior responde 200 |
| change-password con una nueva contraseña corta | 422 | 422 |
| change-password válido | 204 y sesiones revocadas | 204, el refresh posterior responde 401 |

Restauración: se borró el usuario de prueba, se hizo logout del admin y la BD quedó igual que al empezar (`admin:0:-`, 0 refresh tokens sin revocar).

## Salida completa

```text
## 7.1 Estado inicial de fastapi_template_e2e
admin:0:-
refresh tokens: 2

## 7.2 Login
### Admin con credenciales válidas (200)
$ curl -c jar_admin.txt -H Content-Type: application/json -d {"username":"admin","password":"E2eAdmin123!","remember_me":false} /api/auth/login
{"access_token":"<omitido>","token_type":"bearer"}
[HTTP 200]

### Crear usuario de prueba curlbloq (201)
$ curl -H Authorization: Bearer <token> -H Content-Type: application/json -d {"username":"curlbloq","password":"Curlbloq123!","role_ids":[2]} /api/users
{"id":3,"username":"curlbloq","full_name":null,"email":null,"is_active":true,"roles":["user"],"is_locked":false,"locked_until":null,"role_ids":[2]}
[HTTP 201]

### Usuario inexistente (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"no-existe","password":"loquesea123","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

### curlbloq con contraseña incorrecta, intento 1 (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"incorrecta","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

### curlbloq con contraseña incorrecta, intento 2 (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"incorrecta","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

### curlbloq con contraseña incorrecta, intento 3 (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"incorrecta","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

### curlbloq con contraseña incorrecta, intento 4 (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"incorrecta","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

### curlbloq con contraseña incorrecta, intento 5 (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"incorrecta","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

BD tras 5 fallos: failed_login_attempts=5, locked_until=2026-09-28 18:29:27.252647
### curlbloq bloqueado con la contraseña correcta (401 genérico)
$ curl -H Content-Type: application/json -d {"username":"curlbloq","password":"Curlbloq123!","remember_me":false} /api/auth/login
{"detail":"Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}
[HTTP 401]

(la respuesta no trae set-cookie)
BD sin cambios: failed_login_attempts=5, locked_until=2026-09-28 18:29:27.252647

### Payload vacío (422)
$ curl -H Content-Type: application/json -d {} /api/auth/login
{"detail":[{"type":"missing","loc":["body","username"],"msg":"Field required","input":{}},{"type":"missing","loc":["body","password"],"msg":"Field required","input":{}}]}
[HTTP 422]

## 7.3 Fechas UTC
### Sesiones del admin (fechas con offset UTC)
$ curl -H Authorization: Bearer <token> /api/auth/sessions
[{"id":3,"created_at":"2026-09-28T18:14:25.723575Z","expires_at":"2026-10-05T18:14:25.723098Z","user_agent":"curl/8.10.1","is_current":false}]
[HTTP 200]

### Sesiones sin token (401)
$ curl /api/auth/sessions
{"detail":"Missing access token"}
[HTTP 401]

### Detalle de curlbloq: locked_until con offset UTC
$ curl -H Authorization: Bearer <token> /api/users/3
{"id":3,"username":"curlbloq","full_name":null,"email":null,"is_active":true,"roles":["user"],"is_locked":true,"locked_until":"2026-09-28T18:29:27.252647Z","role_ids":[2]}
[HTTP 200]

## 7.4 Desbloqueo
### Sin token (401)
$ curl -X POST /api/users/3/unlock
{"detail":"Missing access token"}
[HTTP 401]

### Id 0 (422)
$ curl -X POST -H Authorization: Bearer <token> /api/users/0/unlock
{"detail":[{"type":"greater_than","loc":["path","user_id"],"msg":"Input should be greater than 0","input":"0","ctx":{"gt":0}}]}
[HTTP 422]

### Usuario inexistente (404)
$ curl -X POST -H Authorization: Bearer <token> /api/users/999999/unlock
{"detail":"Usuario no encontrado"}
[HTTP 404]

### Desbloquear curlbloq (204)
$ curl -X POST -H Authorization: Bearer <token> /api/users/3/unlock

[HTTP 204]

BD tras unlock: failed_login_attempts=0, locked_until=-

### curlbloq inicia sesión tras el desbloqueo (200)
$ curl -c jar_user.txt -H Content-Type: application/json -d {"username":"curlbloq","password":"Curlbloq123!","remember_me":false} /api/auth/login
{"access_token":"<omitido>","token_type":"bearer"}
[HTTP 200]

### Usuario sin rol admin (403)
$ curl -X POST -H Authorization: Bearer <token> /api/users/3/unlock
{"detail":"No tienes permisos para acceder a este recurso"}
[HTTP 403]

## 7.5 Cambio de la propia contraseña
### Contraseña actual incorrecta (400)
$ curl -H Authorization: Bearer <token> -H Content-Type: application/json -d {"current_password":"Incorrecta1!","new_password":"Curlbloq456!"} /api/users/me/change-password
{"detail":"La contraseña actual no es válida"}
[HTTP 400]

### El refresh de curlbloq sigue vigente tras el 400 (200)
$ curl -X POST -b jar_user.txt -c jar_user.txt /api/auth/refresh
{"access_token":"<omitido>","token_type":"bearer"}
[HTTP 200]

### Nueva contraseña corta (422)
$ curl -H Authorization: Bearer <token> -H Content-Type: application/json -d {"current_password":"Curlbloq123!","new_password":"corta"} /api/users/me/change-password
{"detail":[{"type":"string_too_short","loc":["body","new_password"],"msg":"String should have at least 8 characters","input":"corta","ctx":{"min_length":8}}]}
[HTTP 422]

### Cambio válido (204)
$ curl -H Authorization: Bearer <token> -H Content-Type: application/json -d {"current_password":"Curlbloq123!","new_password":"Curlbloq456!"} /api/users/me/change-password

[HTTP 204]

### Refresh tras el cambio (401, sesiones revocadas)
$ curl -X POST -b jar_user.txt /api/auth/refresh
{"detail":"Refresh token reuse detected"}
[HTTP 401]

## 7.6 Restauración
### Borrar curlbloq (204)
$ curl -X DELETE -H Authorization: Bearer <token> /api/users/3

[HTTP 204]

### Logout del admin (204)
$ curl -X POST -b jar_admin.txt /api/auth/logout

[HTTP 204]

usuarios: admin:0:-
refresh tokens sin revocar: 0
```
