# FastAPI Template

Plantilla de proyecto full-stack lista para usar. Incluye autenticación JWT, gestión de usuarios y roles, y una interfaz React moderna.

## Stack

- **Backend**: FastAPI, SQLAlchemy async, Alembic, PostgreSQL
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

```powershell
# Backend
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.in
.venv\Scripts\python.exe -m uvicorn app.main:app --reload

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
.venv\Scripts\python.exe -m pytest -q
```

Requiere PostgreSQL accesible en `127.0.0.1:5432`. Configura `TEST_DATABASE_ADMIN_URL` en `.env` si es necesario.

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
.venv\Scripts\python.exe -m alembic revision --autogenerate -m "descripcion"
.venv\Scripts\python.exe -m alembic upgrade head
```

## Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `APP_NAME` | Nombre de la aplicación |
| `ENVIRONMENT` | `development` / `production` / `test` |
| `SECRET_KEY` | Clave para firmar JWT (cambiar en producción) |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial |
