## Context

Estado actual verificado en `main` (be969e6):

- **Configuración de TypeScript en el frontend:**
  - `frontend/tsconfig.node.json` tiene `composite: true` y no tiene `noEmit`, así que `tsc -b` emite `vite.config.js` y `vite.config.d.ts` junto al `.ts`. Los dos están versionados.
  - Vite busca primero `vite.config.js` (`DEFAULT_CONFIG_FILES`, https://github.com/vitejs/vite/blob/main/packages/vite/src/node/constants.ts), así que carga el compilado.
  - Los `*.tsbuildinfo` también están versionados y cada build los modifica.
  - `tsconfig.app.json` ya usa `noEmit` sin `composite` y `tsc -b` lo construye como referencia sin problemas con la TypeScript instalada (^5.9).
- **Imagen Docker:** no hay `.dockerignore`, y `COPY backend/` y `COPY frontend/` meten en la imagen `backend/.env`, `backend/.venv` y `frontend/node_modules` del host.
- **Alembic:**
  - `backend/alembic.ini` define `sqlalchemy.url` apuntando a la base de datos de otro proyecto.
  - `alembic/env.py` lee esa opción, y solo `app/core/migrations.py` la sustituye (con `set_main_option`) al arrancar la app. Ejecutado por línea de comandos, Alembic usa la del `.ini`.
  - `set_main_option` pasa por la interpolación de ConfigParser, así que un `%` en la URL (contraseñas codificadas) tiene que escaparse como `%%` (https://alembic.sqlalchemy.org/en/latest/api/config.html#alembic.config.Config.set_main_option).
- **Docker Compose:**
  - El usuario tiene sin commitear el borrado de `caddy/Caddyfile` y del servicio `caddy`.
  - Sin Caddy, `backend` solo tiene `expose: 8000`, así que la app no es accesible desde el host.
  - `postgres` publica `5432:5432` en todas las interfaces con `postgres/postgres`.
- **Dockerfile:** usa `ghcr.io/astral-sh/uv:latest` y ejecuta uvicorn como root. `uv.lock` se genera con uv 0.10.5, y el tag `0.10.5` existe en ghcr.io (verificado con `docker manifest inspect`).

## Goals / Non-Goals

**Goals:**
- Que Vite cargue `vite.config.ts` y que el build no ensucie `git status`.
- Imagen construida solo con código fuente y dependencias instaladas dentro del build.
- Una sola fuente para la URL de la base de datos en las migraciones.
- Compose usable sin proxy: la app en `localhost:8000` y Postgres solo en local.
- Documentar cómo poner un proxy con TLS delante.

**Non-Goals:**
- Limpiar el resto de restos de otros proyectos (código sin usar, textos): cambio 3.
- Un health check que compruebe la base de datos.
- Varios workers de uvicorn o un almacenamiento compartido para el rate limit.
- Cambiar la contraseña por defecto de Postgres en Compose.

## Decisions

### tsconfig: sin emisión, tsbuildinfo fuera del repo

En `tsconfig.node.json`:
- quitar `composite`;
- añadir `noEmit: true`;
- añadir `tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo"`.

En `tsconfig.app.json`, añadir `tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo"`.

Borrar `vite.config.js` y `vite.config.d.ts`, y sacar del índice los dos `*.tsbuildinfo`. Añadir `*.tsbuildinfo` a `.gitignore`. `vite.config.js` y `vite.config.d.ts` no se ignoran: si alguien vuelve a activar la emisión, deben aparecer en `git status` en lugar de cargarse en silencio. Quitar de `.pre-commit-config.yaml` el `exclude` de tsbuildinfo, que ya no hace falta.

Alternativa descartada: mantener `composite` con `outDir` en `node_modules/.tmp`. Funciona, pero sigue emitiendo JavaScript que nadie usa.

### .dockerignore en la raíz

El contexto de build es la raíz del repo, así que el archivo va ahí. Excluye:
- `.git`, `.claude`, `.playwright-mcp`, `.vscode`, `.idea`, `tmp`, `docs` y `openspec`;
- `**/.env` y `**/.env.*`, pero no `!**/.example.env`;
- `**/.venv`, `**/__pycache__`, `**/.pytest_cache`;
- `**/node_modules`, `frontend/dist` y `frontend/coverage`.

`backend/tests` se queda: no afecta a la imagen final de forma relevante y quitarlo complicaría ejecutar los tests en contenedor en el futuro.

### Alembic: la URL sale siempre de Settings

- `alembic/env.py` obtiene la URL con `get_settings().database_url`.
- Modo online: crea el engine con `create_async_engine(url, poolclass=NullPool)`, en lugar de `async_engine_from_config` sobre la sección del `.ini`.
- Modo offline: pasa esa misma URL a `context.configure`.
- `alembic.ini` pierde `sqlalchemy.url`.
- `migrations.py` deja de hacer `set_main_option("sqlalchemy.url", ...)`, así que desaparece el problema de interpolación con `%`.

Alternativa descartada: seguir con `set_main_option` escapando `%` como `%%`. Mantiene dos caminos y una trampa.

### Docker Compose sin proxy

- Se incorpora el borrado de Caddy que el usuario ya tiene en el working tree (servicio, volúmenes y `caddy/Caddyfile`).
- `backend` cambia `expose` por `ports: ["8000:8000"]`.
- `postgres` publica `127.0.0.1:5432:5432`: así siguen funcionando los tests y el desarrollo local, y la base de datos no queda abierta a la red.

### Dockerfile

- `COPY --from=ghcr.io/astral-sh/uv:0.10.5 /uv /bin/uv`.
- Antes de `CMD`: `RUN useradd --uid 10001 --no-create-home app` y `USER app`.
- La app no escribe en disco (`PYTHONDONTWRITEBYTECODE=1`, migraciones y logs van a la base de datos y a stdout), así que los archivos pueden seguir siendo de root con permisos de lectura.

### Documentación de despliegue

- README:
  - La línea de "Deploy" pasa a "Docker Compose (backend + PostgreSQL)".
  - "Inicio rápido" mantiene `http://localhost:8000`, que ahora es correcto.
  - Nueva sección breve "Despliegue detrás de un proxy".
- La sección de proxy cubre tres cosas:
  - El proxy termina TLS. En producción la cookie de refresh es `secure` y el navegador no la guarda por HTTP salvo en `localhost`.
  - Hay que definir `FORWARDED_ALLOW_IPS` con la IP o red del proxy en el servicio `backend`, porque uvicorn solo confía en `127.0.0.1` por defecto (https://uvicorn.dev/settings/#http). Sin eso, el rate limit ve la IP del proxy y todos los clientes comparten cupo.
  - El rate limit guarda los contadores en memoria por proceso: con varios workers o réplicas cada uno cuenta por separado.
- `docs/development_guide.md` enlaza esa sección.

## Risks / Trade-offs

- [Quien use la plantilla con Caddy pierde TLS automático] → La sección de proxy del README explica qué hace falta, y es una decisión explícita del usuario.
- [Uso de `useradd` en la imagen base] → El usuario sin root depende de que la imagen `python:3.13-slim` (Debian) lo incluya; se comprueba en el build de verificación.
- [Los tsbuildinfo pasan a `node_modules/.tmp`] → El primer build tras actualizar es completo, sin caché incremental. Es aceptable.
- [Alembic por línea de comandos lee `backend/.env` a través de Settings] → Es lo esperado. Hay que ejecutarlo desde `backend/` o con `DATABASE_URL` definido.

## Migration Plan

Quien despliegue con Compose:
1. Actualizar.
2. `docker compose up --build`: Caddy desaparece y la app queda en el 8000.
3. Si necesita TLS, poner su proxy delante siguiendo el README.

Para revertir, basta con revertir el commit.

## Open Questions

Ninguna.
