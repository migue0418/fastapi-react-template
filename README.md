# FastAPI Template

Plantilla de proyecto full-stack lista para usar. Incluye autenticación JWT, gestión de usuarios y roles, y una interfaz React moderna.

## Stack

- **Backend**: FastAPI, SQLAlchemy async, Alembic, PostgreSQL, uv
- **Frontend**: React 19, TypeScript, Vite, React Router 7
- **Auth**: JWT (access token 15 min) + refresh token en cookie HTTP-only
- **Deploy**: Docker Compose (backend + PostgreSQL)

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

Requiere PostgreSQL accesible en `127.0.0.1:5432`. Configura `TEST_DATABASE_ADMIN_URL` en `.env` si es necesario.

## Dependencias

Las dependencias se gestionan con `uv` y `pyproject.toml`:

- **Producción** (`[project.dependencies]`): instaladas en Docker con `uv sync --no-dev`
- **Desarrollo** (`[dependency-groups] dev`): `pytest`, `httpx` — solo en local, nunca en la imagen Docker

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

## Spec-Driven Development (OpenSpec)

La plantilla incluye un flujo SDD listo para usar con [OpenSpec](https://github.com/Fission-AI/OpenSpec).
Instala el CLI (`npm i -g @fission-ai/openspec` o usa `npx @fission-ai/openspec`) y trabaja así:

```
/opsx:explore   # explorar/aclarar una idea (opcional)
/opsx:propose   # crear el cambio y sus artefactos (proposal, specs, design, tasks)
plan técnico    # agentes backend/frontend-developer → .claude/doc/<cambio>/ (obligatorio)
/opsx:apply     # implementar las tareas
/opsx:archive   # fusionar specs y archivar el cambio
```

- **Guía paso a paso con prompts reales: [docs/SDD steps.md](docs/SDD%20steps.md).**
- Contexto del stack para los artefactos: `openspec/config.yaml`.
- Estándares y guías versionadas en `docs/` (empieza por `docs/development_guide.md` y `docs/base-standards.md`).
- Skills y agentes de apoyo en `.claude/` (skills `openspec-*`, `enrich-us`, `write-pr-report`; agentes `backend-developer`, `frontend-developer`, `product-strategy-analyst`).

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
