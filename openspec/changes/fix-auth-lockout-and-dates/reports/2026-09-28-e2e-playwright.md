# E2E con Playwright MCP: 2026-09-28

Ejecutado por el agente con Playwright MCP (Chromium, zona horaria del navegador `Europe/Madrid`). Frontend en Vite (`127.0.0.1:5173`, proxy de `/api` a `127.0.0.1:8000`) y backend de la rama contra la base desechable `fastapi_template_e2e` (ver el informe de curl).

| Paso | Qué se comprobó | Resultado |
| --- | --- | --- |
| 8.1 | Login de admin con contraseña incorrecta | Alerta "Credenciales inválidas. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos." Red: solo `POST /api/auth/login` 401 tras enviar; el único `/api/auth/refresh` es el del arranque de la página, anterior al envío. |
| 8.5 | Alta de usuario con email `ana@b` | El 422 de `EmailStr` se ve como texto: "value is not a valid email address: The part after the @-sign is not valid. It should have a period." Tras vaciar el email, el usuario `e2ebloq` se crea. |
| 8.2 | Usuario bloqueado (5 fallos con curl) en UsersPage | Píldora "Bloqueado" y botón "Desbloquear e2ebloq" solo en esa fila. Título: "bloqueado hasta 28 sept 2026, 20:30" con `locked_until` 18:30:55 UTC en la BD. Tras pulsar: la fila pasa a "Activo", desaparece el botón y la BD queda con contador 0 y `locked_until` nulo. `e2ebloq` inicia sesión. |
| 8.3 | SessionsPage | "Iniciada 28 sept 2026, 20:16" para un `created_at` de 18:16:33 UTC en la BD, igual a la hora local del navegador en ese momento. |
| 8.4 | Cambio de contraseña con la actual incorrecta | 400 sin refresh intermedio, alerta "La contraseña actual no es válida" y la URL sigue en `/perfil`. |
| 8.4 | Cambio de contraseña válido | Redirección a `/login` con el aviso (`role="status"`) "Contraseña cambiada. Inicia sesión de nuevo." y 0 refresh tokens sin revocar de `e2ebloq` en la BD. |

Notas:
- El mensaje de login del 429 (rama añadida en el plan de frontend) apareció de forma real: un login de admin dio 429 porque las pruebas de curl habían agotado la ventana del rate limit. Su texto lo cubre el test unitario de LoginPage.
- La lista de red de Playwright mostró duplicados de `change-password` y `logout`; el log de uvicorn confirma una sola petición de cada.

## Restauración (8.6)

Navegador cerrado, uvicorn y Vite parados, `DROP DATABASE fastapi_template_e2e`. `fastapi_template` sin cambios respecto al baseline del informe de tests (1 usuario, 0 refresh tokens, `admin:1:-`).
