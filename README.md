# FastAPI Template

Plantilla de proyecto full-stack lista para usar. Incluye autenticación JWT, gestión de usuarios y roles, y una interfaz React moderna.

## Stack

- Backend: FastAPI, SQLAlchemy async, Alembic, PostgreSQL, uv
- Frontend: React 19, TypeScript, Vite, React Router 7
- Auth: JWT (access token 15 min) + refresh token en cookie HTTP-only
- Deploy: Docker Compose (backend + PostgreSQL)

## Empezar un proyecto nuevo

1. Crea el repositorio desde la plantilla y clónalo. Con el árbol de trabajo limpio, renómbralo desde la raíz (requiere [uv](https://docs.astral.sh/uv/getting-started/installation/)):

   ```powershell
   uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico
   ```

   El primer argumento es el nombre visible. El segundo es el identificador (minúsculas, dígitos y guiones bajos, hasta 25 caracteres): es el nombre de la base de datos y, con guiones, el de los paquetes. El script cambia el nombre de la plantilla en los archivos versionados, salvo en `openspec/changes/archive/`, lista los archivos modificados y avisa de las variantes que no reconoce. Revisa el resultado con `git diff` y confírmalo.
2. Si tienes configuración local de Claude Code (`CLAUDE.md` y `.claude/`), cópiala al proyecto: no se versiona.
3. Crea `backend/.env` desde `backend/.example.env`, con un `SECRET_KEY` y un `ADMIN_PASSWORD` nuevos. Para generar la clave: `python -c "import secrets; print(secrets.token_hex(32))"`.
4. Instala sdd-kit si aún no lo tienes y lanza `/sdd-kit:sdd-onboarding` (ver [Spec-Driven Development](#spec-driven-development-sdd-kit)).
5. Decide qué conservas de `openspec/`, el material heredado de la plantilla:
   - `openspec/specs/` describe el comportamiento que hereda el proyecto (auth, users, roles, health y despliegue). Úsalo como entrada del onboarding.
   - `openspec/changes/archive/` es el historial de cambios de la plantilla. Puedes borrarlo.

## Inicio rápido (Docker)

```powershell
# Copiar y rellenar variables de entorno
cp backend/.example.env backend/.env

docker compose up --build
```

App disponible en `http://localhost:8000`  
Credenciales por defecto: `admin` / `ChangeMe123!`

PostgreSQL se publica solo en `127.0.0.1:5432`. Para servir la app con HTTPS, ver [Despliegue detrás de un proxy](#despliegue-detrás-de-un-proxy).

## Desarrollo local

Requiere [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado.

```powershell
# Backend (uv crea .venv e instala todo, incluidas deps de dev)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

- Backend en `http://127.0.0.1:8000`
- Frontend Vite en `http://127.0.0.1:5173`

## Tests

```powershell
cd backend
uv run pytest -q
```

Requiere PostgreSQL accesible. Los tests de la API crean una base de datos temporal por test y la borran al terminar. Para crearlas se conectan con la URL de `TEST_DATABASE_ADMIN_URL`, que por defecto es `postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres`.

`TEST_DATABASE_ADMIN_URL` es una variable de entorno de la shell que lanza `pytest`: los tests no la leen de `backend/.env`. Para cambiarla en PowerShell:

```powershell
$env:TEST_DATABASE_ADMIN_URL = "postgresql+asyncpg://usuario:clave@127.0.0.1:5432/postgres"
uv run pytest -q
```

## Dependencias

Las dependencias se gestionan con `uv` y `pyproject.toml`:

- Producción (`[project.dependencies]`): instaladas en Docker con `uv sync --no-dev`
- Desarrollo (`[dependency-groups] dev`): `pytest`, `httpx`. Solo en local, nunca en la imagen Docker

```powershell
cd backend
uv add <paquete>             # añadir dependencia de producción
uv add --dev <paquete>       # añadir dependencia de desarrollo
uv lock                      # regenerar uv.lock (commitear)
```

## Añadir nuevas features

Sigue la arquitectura por slice:

```
backend/app/features/<feature>/
    router.py       # endpoints FastAPI
    schemas.py      # modelos Pydantic
    service.py      # lógica de negocio
    repository.py   # acceso a datos
    models.py       # modelos SQLAlchemy (si hay tabla nueva)

frontend/src/features/<feature>/
    api.ts          # llamadas HTTP
    types.ts        # interfaces TypeScript
    FeaturePage.tsx # componentes
```

Cuando añadas un modelo SQLAlchemy nuevo, impórtalo en `backend/app/core/database.py::import_model_modules` y genera la migración:

```powershell
cd backend
uv run alembic revision --autogenerate -m "descripcion"
uv run alembic upgrade head
```

Alembic toma la URL de la base de datos de `Settings` (`DATABASE_URL` o `backend/.env`), igual que la app. Ejecútalo desde `backend/`.

## Spec-Driven Development (sdd-kit)

La plantilla usa el plugin de Claude Code [sdd-kit](https://github.com/daniel-torresc/sdd-kit). No viene en el repo: instálalo una vez en tu máquina y reinicia Claude Code.

```powershell
claude plugin marketplace add daniel-torresc/sdd-marketplace
claude plugin install sdd-kit@sdd-marketplace
```

Si la descarga falla con `Host key verification failed`, define `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` y repite la instalación.

El ciclo:

```
/sdd-kit:sdd-onboarding  # una vez por proyecto: archivos fundacionales en .sdd/ y primer roadmap
/sdd-kit:sdd-roadmap     # refinar, dividir y ordenar los próximos incrementos
/sdd-kit:sdd-define      # qué y por qué: brief y requirements
/sdd-kit:sdd-design      # cómo: design, tareas y plan
/sdd-kit:sdd-build       # implementar y revisar tarea a tarea
/sdd-kit:sdd-verify      # comprobar la feature completa
/sdd-kit:sdd-document    # alinear la documentación con lo construido
/sdd-kit:sdd-release     # abrir el PR en borrador; el merge lo hace una persona
```

- Estándares y guías versionadas en `docs/` (empieza por `docs/development_guide.md` y `docs/base-standards.md`).

## Despliegue detrás de un proxy

La plantilla no incluye proxy: Compose publica el backend en el puerto 8000 del host. Para servirla con HTTPS, pon delante un proxy que termine TLS (nginx, Caddy, Traefik...) y que reenvíe al puerto 8000.

- TLS y cookies. Con `ENVIRONMENT=production`, la cookie de refresh lleva el atributo `Secure` y la app envía `Strict-Transport-Security`. Los navegadores no guardan cookies `Secure` recibidas por HTTP salvo en `localhost` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure)), así que en producción la sesión solo se mantiene por HTTPS.
- IP real del cliente. uvicorn solo acepta `X-Forwarded-For` y `X-Forwarded-Proto` de las IPs listadas en `FORWARDED_ALLOW_IPS`, que por defecto es `127.0.0.1` ([uvicorn](https://uvicorn.dev/settings/#http)). Define `FORWARDED_ALLOW_IPS` en el servicio `backend` con la IP o la red desde la que se conecta el proxy. Si no, el rate limit de login y refresh ve la IP del proxy y todos los clientes comparten cupo.
- Un solo camino de entrada. Con el proxy delante, publica el backend como `127.0.0.1:8000:8000` o quita `ports` y comparte red con el proxy. Si el 8000 queda accesible desde fuera y `FORWARDED_ALLOW_IPS` es amplio (o `*`), cualquiera puede falsificar `X-Forwarded-For` y saltarse el rate limit.
- Rate limit en memoria. Los contadores viven en la memoria de cada proceso y se pierden al reiniciar. Con varios workers de uvicorn o varias réplicas, cada proceso cuenta por separado y el límite real se multiplica.

## Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `APP_NAME` | Nombre de la aplicación |
| `ENVIRONMENT` | `development` / `production` / `test` |
| `SECRET_KEY` | Clave para firmar JWT (cambiar en producción) |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial |
| `TEST_DATABASE_ADMIN_URL` | Solo tests. URL de PostgreSQL con permiso para crear y borrar bases de datos. Se lee del entorno de la shell, no de `backend/.env`. Por defecto, `postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres` |
