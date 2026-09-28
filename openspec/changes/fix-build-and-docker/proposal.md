## Why

La revisión encontró que el build y el despliegue de la plantilla tienen trampas:

- Los cambios en `vite.config.ts` se ignoran porque hay un `vite.config.js` generado y versionado.
- La imagen Docker copia secretos y entornos locales.
- `alembic` por línea de comandos se conecta a una base de datos de otro proyecto.
- Sin Caddy, que el usuario ha decidido retirar de la plantilla, la aplicación no es accesible desde el host.

## What Changes

- Frontend:
  - `tsconfig.node.json` deja de emitir.
  - Se borran `vite.config.js` y `vite.config.d.ts`.
  - Los artefactos de `tsc -b` (`*.tsbuildinfo`) dejan de versionarse.
- Nuevo `.dockerignore` que excluye `.env`, entornos virtuales, `node_modules`, builds y archivos locales.
- Alembic toma la URL de la base de datos de `Settings` en todos los casos; `alembic.ini` deja de llevar una URL.
- **BREAKING (despliegue)**: se retira Caddy de la plantilla.
  - Se borran `caddy/Caddyfile` y el servicio `caddy`.
  - El backend publica `8000:8000`.
  - Postgres publica 5432 solo en `127.0.0.1`.
- Dockerfile: imagen de uv fijada a `0.10.5` (la versión con la que se genera `uv.lock`) y proceso sin root.
- Documentación:
  - README y `docs/` sin Caddy.
  - Cómo poner un proxy con TLS delante: `FORWARDED_ALLOW_IPS` para que el rate limit vea la IP real, y cookies `secure` en producción.
  - Aviso de que el rate limit vive en memoria por proceso.

## Capabilities

### New Capabilities

- `deployment`: cómo se construye y se sirve la aplicación. Contenido de la imagen Docker, puertos publicados por Compose, origen de la URL de la base de datos para las migraciones y proceso sin privilegios.

### Modified Capabilities

Ninguna. No cambia el comportamiento de la API.

## Impact

- Archivos: `frontend/tsconfig.node.json`, `frontend/tsconfig.app.json`, `.gitignore`, `.pre-commit-config.yaml`, `.dockerignore` (nuevo), `Dockerfile`, `docker-compose.yml`, `caddy/` (se borra), `backend/alembic.ini`, `backend/alembic/env.py`, `backend/app/core/migrations.py`, `README.md` y `docs/`.
- Sin cambios en slices de backend ni de frontend. Sin cambios de modelo de datos ni migraciones.
- Quien despliegue con el `docker-compose.yml` actual pierde Caddy y el TLS automático. Tendrá que poner su propio proxy o exponer el 8000.
