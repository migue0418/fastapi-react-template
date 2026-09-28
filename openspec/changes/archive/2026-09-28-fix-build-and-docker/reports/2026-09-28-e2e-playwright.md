# E2E con Playwright MCP: 2026-09-28

Ejecutado por el agente. Sin logins correctos ni escrituras: el login incorrecto usa un usuario inexistente (`e2e_no_existe`).

## 6.1 Stack de Compose en http://localhost:8000

| Comprobación | Resultado |
| --- | --- |
| `/` | Redirige a `/login` y pinta el formulario. |
| Recursos del build | `/`, `/assets/index-*.js`, `/assets/index-*.css` y `/favicon.svg` con 200. Las fuentes de Google cargan. |
| Consola | Un único error, el 401 de `POST /api/auth/refresh` del arranque sin cookie (esperado). |
| Enlace profundo `/usuarios` | Fallback SPA y la app termina en `/login`. |
| Login incorrecto | Alerta "Credenciales invalidas o error de servidor." y sigue en `/login`. Red: `POST /api/auth/login` 401 seguido de `POST /api/auth/refresh` 401. Una llamada directa devuelve `{"detail":"Credenciales invalidas"}`. |

El texto fijo de la alerta y el refresh tras el 401 del login son el comportamiento de `main`; los corrige el cambio `fix-auth-lockout-and-dates` (PR #1), que no está en esta rama.

## 6.2 Vite en desarrollo (http://127.0.0.1:5173) con el backend de Compose

- `curl -i http://127.0.0.1:5173/api/auth/me`: 401 con `server: uvicorn` y `content-type: application/json`. El proxy de `/api` está activo y, como `vite.config.js` ya no existe, la configuración es la de `vite.config.ts`.
- En el navegador, `/` termina en `/login` y `POST /api/auth/refresh` pasa por el proxy (401 JSON).

Navegador cerrado y Vite parado al terminar. No hubo datos que restaurar.
