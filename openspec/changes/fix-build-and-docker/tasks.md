## 0. Setup (OBLIGATORIO - PRIMER PASO)

- [x] 0.1 Crear y cambiar a la rama `feature/fix-build-and-docker` desde `main`
- [x] 0.2 Generar el plan técnico con los agentes `backend-developer` y `frontend-developer` en `.claude/doc/fix-build-and-docker/{backend,frontend}.md` y leerlo antes de tocar código

## 1. Frontend: configuración de TypeScript y Vite

- [x] 1.1 `tsconfig.node.json`: quitar `composite`, añadir `noEmit` y `tsBuildInfoFile` en `node_modules/.tmp`; `tsconfig.app.json`: `tsBuildInfoFile` en `node_modules/.tmp`
- [x] 1.2 Borrar `vite.config.js` y `vite.config.d.ts`; sacar del índice los `*.tsbuildinfo`; actualizar `.gitignore` y quitar el `exclude` de `.pre-commit-config.yaml`
- [x] 1.3 Comprobar que `npm run build` no deja cambios en `git status` y que Vite arranca con `vite.config.ts`

## 2. Backend: Alembic con la URL de Settings (TDD)

- [x] 2.1 Test: `alembic.ini` no define `sqlalchemy.url`
- [x] 2.2 Test: `env.py` usa `Settings.database_url` (Alembic por línea de comandos contra la BD temporal de test aplica `head`)
- [x] 2.3 `alembic/env.py` construye el engine desde `get_settings().database_url` en modo online y offline; quitar `sqlalchemy.url` de `alembic.ini` y el `set_main_option` de la URL en `migrations.py`

## 3. Docker

- [x] 3.1 Crear `.dockerignore` en la raíz según `design.md`
- [x] 3.2 Dockerfile: uv `0.10.5` y usuario sin root
- [x] 3.3 `docker-compose.yml`: incorporar la retirada de Caddy (servicio, volúmenes y `caddy/Caddyfile`), `ports: 8000:8000` en backend y `127.0.0.1:5432:5432` en postgres

## 4. Backend: tests y estado de BD (OBLIGATORIO)

- [x] 4.1 Revisar y actualizar los tests unitarios afectados
- [x] 4.2 Capturar baseline de `fastapi_template` (usuarios, refresh tokens, revisión Alembic, bases temporales de test)
- [x] 4.3 `cd backend && uv run pytest -q` en verde
- [x] 4.4 Verificar el estado de la BD contra el baseline y guardar informe en `openspec/changes/fix-build-and-docker/reports/YYYY-MM-DD-backend-tests.md`

## 5. Verificación de despliegue con curl y Docker (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 5.1 `uv run alembic current` con `DATABASE_URL` apuntando a una base desechable muestra la revisión de esa base
- [x] 5.2 Migraciones al arrancar con una contraseña que contiene `%` codificado en la URL (rol de prueba en una base desechable)
- [x] 5.3 `docker compose build` y comprobar dentro de la imagen: sin `/app/backend/.env`, `id -u` distinto de 0
- [x] 5.4 `docker compose up`: `GET http://localhost:8000/health` 200, `GET /` sirve `index.html`, `GET /api/auth/me` 401; Postgres enlazado solo a `127.0.0.1`
- [x] 5.5 Restaurar: parar el stack, borrar bases y roles de prueba, dejar `fastapi_template` como en el baseline; documentar comandos y respuestas en el informe

## 6. Frontend: E2E con Playwright MCP (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 6.1 Con el stack de Compose en `localhost:8000` (antes de 5.5): la pantalla de login carga sin errores de recursos, los enlaces profundos caen en el fallback SPA y un login incorrecto recibe 401 del backend y muestra el error de login
- [x] 6.2 Con Vite en desarrollo: el proxy de `/api` funciona (confirma que se usa `vite.config.ts`)

## 7. Frontend: verificación (OBLIGATORIO)

- [x] 7.1 `cd frontend && npm run lint && npm run test && npm run build`

## 8. Cierre (OBLIGATORIO)

- [x] 8.1 Actualizar `README.md`, `docs/development_guide.md` y demás `docs/` afectadas (sin Caddy, sección de despliegue detrás de un proxy)
- [x] 8.2 Abrir el PR con `gh` usando la skill `write-pr-report`
