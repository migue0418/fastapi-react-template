# FastAPI Template

Plantilla de proyecto full-stack lista para usar. Incluye autenticación JWT, gestión de usuarios y roles, y una interfaz React moderna.

## Stack

- **Backend**: FastAPI, SQLAlchemy async, Alembic, PostgreSQL, uv
- **Frontend**: React 19, TypeScript, Vite, React Router 7
- **Auth**: JWT (access token 15 min) + refresh token en cookie HTTP-only
- **Deploy**: Docker Compose con Caddy como reverse proxy

## Inicio rápido (Docker)

```powershell
# Copiar y rellenar variables de entorno
cp backend/.example.env backend/.env

docker compose up --build
```

App disponible en `http://localhost:8000`  
Credenciales por defecto: `admin` / `ChangeMe123!`

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

## Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `APP_NAME` | Nombre de la aplicación |
| `ENVIRONMENT` | `development` / `production` / `test` |
| `SECRET_KEY` | Clave para firmar JWT (cambiar en producción) |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial |
