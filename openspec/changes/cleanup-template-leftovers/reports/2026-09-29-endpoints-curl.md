# Endpoints con curl: 2026-09-29

Ejecutado por el agente contra el backend de la rama (`uv run uvicorn app.main:app --port 8000`, sin `--reload`) y la base `fastapi_template`. En ese arranque se aplicó la migración 0003. El baseline (informe de tests) tenía un único admin activo, así que el paso del último admin no podía borrar nada. El guion no imprime contraseñas ni tokens.

| Paso | Petición | Respuesta |
| --- | --- | --- |
| 1 | `GET /api/auth/me` sin cabecera `Authorization` | 401 `{"detail":"Falta el token de acceso"}` |
| 2 | `GET /api/auth/me` con `Bearer no.es.un.jwt` | 401 `{"detail":"Token de acceso no válido"}` |
| 3 | `POST /api/auth/refresh` sin cookie | 401 `{"detail":"Falta el token de refresco"}` |
| 4 | `POST /api/auth/refresh` con `refresh_token=desconocido` | 401 `{"detail":"Token de refresco no válido"}` |
| 5 | `POST /api/auth/login` del admin (un solo login) | 200, access token recibido |
| 6 | `DELETE /api/auth/sessions/999999999` | 404 `{"detail":"Sesión no encontrada"}` |
| 7a | `DELETE /api/auth/sessions/{sesión actual}` | 204 |
| 7b | La misma petición otra vez | 400 `{"detail":"Sesión ya revocada"}` |
| 8 | `GET /api/roles` | 200 `[{"id":1,"name":"admin","description":"Administración del sistema"},{"id":2,"name":"user","description":"Usuario operativo"}]`, mismo formato que antes |
| 9 | `DELETE /api/users/{admin}` (único admin activo) | 400 `{"detail":"No se puede eliminar o degradar al último admin activo"}` |
| 10 | `GET /api/no-existe` | 404 `{"detail":"No encontrado"}` |
| 11a | `POST /api/users` (`curl-temporal`, rol `user`) | 201, `roles: ["user"]` |
| 11b | `PUT /api/users/{id}` (rol `admin`) | 200, `roles: ["admin"]` |
| 11c | `DELETE /api/users/{id}` | 204 |

Los pasos 11a a 11c ejercitan `Role.users` con `lazy="raise"` en alta, edición y borrado: ninguno da 500.

No se prueban con curl:

- La reutilización de un refresh token y el refresh caducado: la reutilización revocaría todas las sesiones reales del admin. Los cubre pytest.
- El `detail` del SPA sin build: `frontend/dist` existe en local. Lo cubre `test_spa_without_build_returns_spanish_detail`.

## Restauración (6.2)

Script de restauración fuera del repo, con los valores del baseline (`max_refresh_token_id` 0 y `failed_login_attempts` 1):

- Borrados los refresh tokens con id mayor que 0: `DELETE 1`.
- `failed_login_attempts` del admin devuelto a 1 (el login lo había puesto a 0).
- `curl-temporal`: 0 filas restantes.

Snapshot posterior: igual al baseline salvo la revisión Alembic (0003) y la descripción del rol `admin`, cambios esperados de la migración 0003. No se restaura el avance de las secuencias de `users` y `auth_refresh_tokens`.
