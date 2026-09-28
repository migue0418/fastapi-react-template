## 0. Setup (OBLIGATORIO - PRIMER PASO)

- [x] 0.1 Crear y cambiar a la rama `feature/fix-auth-lockout-and-dates` desde `main`
- [x] 0.2 Generar el plan técnico con los agentes `backend-developer` y `frontend-developer` en `.claude/doc/fix-auth-lockout-and-dates/{backend,frontend}.md` y leerlo antes de tocar código

## 1. Backend: fechas UTC (TDD)

- [x] 1.1 Test: `GET /api/auth/sessions` devuelve `created_at` y `expires_at` con offset UTC
- [x] 1.2 Test: `GET /api/users` devuelve `locked_until` con offset UTC para un usuario bloqueado
- [x] 1.3 Añadir `UtcDatetime` en `app/core/datetime.py` y usarlo en `SessionInfo` y `UserResponse`

## 2. Backend: login uniforme y bloqueo (TDD)

- [x] 2.1 Actualizar `test_login_invalid_credentials` y `test_account_lockout_after_failed_attempts`: 401 con el detalle genérico en lugar de 429
- [x] 2.2 Test: una cuenta bloqueada con la contraseña correcta responde 401 genérico y no emite cookie
- [x] 2.3 Test: un username inexistente y un usuario bloqueado reciben exactamente el mismo cuerpo de respuesta
- [x] 2.4 Test: tras expirar `locked_until` (forzado en la BD de test), un fallo deja el contador en 1 sin bloquear, y un acierto pone el contador a cero
- [x] 2.5 Añadir `_DUMMY_PASSWORD_HASH` en `auth/security.py` y reescribir `AuthService.login` según el orden de `design.md`, con la constante `INVALID_CREDENTIALS_DETAIL`

## 3. Backend: desbloqueo y cambio de contraseña (TDD)

- [x] 3.1 Tests de `POST /api/users/{user_id}/unlock`: 204 bloqueado, 204 no bloqueado, 404, 403, 401 y 422
- [x] 3.2 Test: `reset-password` desbloquea (el usuario inicia sesión justo después)
- [x] 3.3 Test: contraseña actual incorrecta en `change-password` responde 400 con "La contraseña actual no es válida" y no revoca sesiones
- [x] 3.4 `UsersService`: `_clear_lockout`, `unlock_user`, usarlo en `reset_password` y responder 400 en `change_own_password`
- [x] 3.5 `users/router.py`: endpoint `POST /{user_id}/unlock` con `require_roles("admin")`

## 4. Frontend: cliente HTTP

- [x] 4.1 Tests de Vitest para `http.ts`: `detail` en lista se convierte en texto legible, un 401 de `/auth/login` no llama a `/auth/refresh` y `ApiError` expone `status`
- [x] 4.2 Implementar `ApiError`, `parseError` con `detail` en lista y `NO_REFRESH_URLS`

## 5. Frontend: pantallas

- [x] 5.1 Test de LoginPage: muestra el mensaje del backend cuando `login` rechaza con `ApiError` y muestra `state.notice`
- [x] 5.2 LoginPage: mostrar `error.message` de `ApiError` (genérico de conexión si no lo es) y el aviso de `location.state.notice`
- [x] 5.3 ProfilePage: tras el cambio correcto, `logout()` y navegar a `/login` con el aviso "Contraseña cambiada. Inicia sesión de nuevo."
- [x] 5.4 `features/users/api.ts`: `unlockUserRequest`; UsersPage: botón de desbloqueo en filas con `is_locked`, `locked_until` en el `title` y recarga

## 6. Backend: tests y estado de BD (OBLIGATORIO)

- [x] 6.1 Revisar y actualizar los tests unitarios afectados en `backend/tests/test_api.py`
- [x] 6.2 Con PostgreSQL en marcha (`docker compose up -d postgres`), capturar baseline de `fastapi_template` (conteo de `users`, `auth_refresh_tokens` y bases `autorecambios_test_%`)
- [x] 6.3 `cd backend && uv run pytest -q` en verde
- [x] 6.4 Verificar que no quedan bases de test y que los conteos coinciden con el baseline; guardar informe en `openspec/changes/fix-auth-lockout-and-dates/reports/YYYY-MM-DD-backend-tests.md`

## 7. Backend: endpoints con curl (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 7.1 Arrancar el backend y guardar el estado inicial de la BD (usuarios y su `failed_login_attempts`/`locked_until`)
- [x] 7.2 `POST /api/auth/login`: 200, 401 genérico (usuario inexistente, contraseña incorrecta, cuenta bloqueada tras 5 fallos), 422
- [x] 7.3 `GET /api/auth/sessions`: fechas con offset UTC; 401 sin token
- [x] 7.4 `POST /api/users/{id}/unlock`: 204, 404, 403, 401, 422; comprobar login posterior
- [x] 7.5 `POST /api/users/me/change-password`: 400 con contraseña actual incorrecta, 422 con nueva corta, 204 válida
- [x] 7.6 Restaurar la BD (borrar usuarios de prueba, restaurar contraseñas y contadores, revocar sesiones creadas) y documentar comandos y respuestas en el informe

## 8. Frontend: E2E con Playwright MCP (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 8.1 Login con credenciales incorrectas: se ve el mensaje genérico del backend y no hay llamada a `/api/auth/refresh`
- [x] 8.2 Bloquear un usuario de prueba, verlo como bloqueado en UsersPage, desbloquearlo y comprobar que puede entrar
- [x] 8.3 SessionsPage muestra la hora local correcta
- [x] 8.4 Cambio de contraseña: redirige al login con el aviso; con contraseña actual incorrecta se muestra el error sin salir de la página
- [x] 8.5 Error de validación visible como texto (no "[object Object]")
- [x] 8.6 Restaurar datos de prueba

## 9. Frontend: verificación (OBLIGATORIO)

- [x] 9.1 `cd frontend && npm run lint && npm run test && npm run build`

## 10. Cierre (OBLIGATORIO)

- [x] 10.1 Actualizar `docs/data-model.md` (campos de bloqueo, fechas UTC en la API), `docs/backend-standards.md` (los datetimes de respuesta usan `UtcDatetime`) y `docs/frontend-standards.md` (refresco solo fuera de `NO_REFRESH_URLS`, `ApiError`)
- [x] 10.2 Abrir el PR con `gh` usando la skill `write-pr-report`
