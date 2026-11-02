# Guía de desarrollo

Cómo arrancar y trabajar en la plantilla, y cómo usar el flujo SDD (sdd-kit).

## Requisitos

- Docker (para Postgres y/o todo el stack), uv (backend), Node + npm (frontend).
- Plugin sdd-kit de Claude Code para el flujo SDD (ver [Flujo SDD con sdd-kit](#flujo-sdd-con-sdd-kit)).

## Arrancar

### Todo con Docker
```powershell
cp backend/.example.env backend/.env
cp .example.env .env        # define POSTGRES_PASSWORD en este .env (raíz)
docker compose up --build
```
- `POSTGRES_PASSWORD` es obligatoria: mínimo 16 caracteres y distinta de `postgres`. Sin ella, o con una que no cumpla, Compose no arranca. Detalle, y qué hacer con un volumen ya inicializado, en el [README](../README.md#inicio-rápido-docker).
- App en `http://localhost:8000`; PostgreSQL solo en `127.0.0.1:5432`.
- Sin proxy incluido. Para HTTPS, ver [Despliegue detrás de un proxy](../README.md#despliegue-detrás-de-un-proxy).

### Backend en local (requiere uv)
```powershell
cd backend
uv sync                                  # crea .venv e instala deps + dev
uv run uvicorn app.main:app --reload
```

### Frontend en local
```powershell
cd frontend
npm install
npm run dev
```

## Dependencias del backend (uv)
```powershell
cd backend
uv add <paquete>        # producción
uv add --dev <paquete>  # solo dev/test
uv lock                 # regenerar lock file
```
No instales dependencias sin confirmación del usuario.

## Variables de entorno

- Backend: copia `backend/.example.env` a `backend/.env`. La configuración se lee vía
  `app.core.settings.get_settings()`. Nunca commitees secretos.
- Docker Compose: `POSTGRES_PASSWORD` va en el `.env` de la raíz (copia `.example.env`), no en `backend/.env`. Fuera de Compose, añade la contraseña a `DATABASE_URL` en `backend/.env`.
- Tests: `TEST_DATABASE_ADMIN_URL` es obligatoria y se define en el entorno de la shell (ver [Tests](../README.md#tests)).
- Alembic por línea de comandos usa la misma URL (`DATABASE_URL` o `backend/.env`); ejecútalo desde `backend/`.

## Flujo SDD con sdd-kit

Instala el plugin una vez en tu máquina y reinicia Claude Code:

```powershell
claude plugin marketplace add daniel-torresc/sdd-marketplace
claude plugin install sdd-kit@sdd-marketplace
```

Si la descarga falla con `Host key verification failed`, define `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` y repite la instalación.

```
/sdd-kit:sdd-onboarding → una vez por proyecto: archivos fundacionales en .sdd/ y primer roadmap
/sdd-kit:sdd-roadmap    → refinar, dividir y ordenar los próximos incrementos
/sdd-kit:sdd-define     → qué y por qué: brief y requirements (aprobación humana)
/sdd-kit:sdd-design     → cómo: design, tareas y plan (aprobación humana)
/sdd-kit:sdd-build      → implementar y revisar tarea a tarea
/sdd-kit:sdd-verify     → comprobar la feature completa y dejar evidencia
/sdd-kit:sdd-document   → alinear la documentación con lo construido
/sdd-kit:sdd-release    → abrir el PR en borrador; el merge lo hace una persona
```

- Cada feature vive en `specs/NNN-<slug>/`; el contexto de todo el proyecto, en `.sdd/`.
- Los pasos de verificación que el agente ejecuta están en [docs/verification-guide.md](./verification-guide.md).
- El contrato de comportamiento heredado de la plantilla está en `docs/behaviour/`: sirve de entrada para el onboarding.

## Verificación

Ver [guía de verificación](./verification-guide.md). Resumen:
```powershell
cd backend && uv run pytest -q
cd frontend && npm run lint && npm run test && npm run build
```

## Qué NO hacer

- No usar SQLite en tests del backend (usar PostgreSQL).
- No hacer `fetch` directo desde componentes (usar `shared/api/http.ts`).
- No duplicar lógica de negocio entre backend y frontend.
- No hacer cambios grandes no relacionados con la petición.
