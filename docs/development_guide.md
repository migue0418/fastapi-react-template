# Guía de desarrollo

Cómo arrancar y trabajar en la plantilla, y cómo usar el flujo SDD (OpenSpec).

## Requisitos

- Docker (para Postgres y/o todo el stack), uv (backend), Node + npm (frontend).
- OpenSpec CLI para el flujo SDD: `npm install -g @fission-ai/openspec@latest` (Node.js 20.19.0 o superior; ver [guía SDD](./sdd-guide.md#0-requisitos-previos-una-vez)).

## Arrancar

### Todo con Docker
```powershell
docker compose up --build
```
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
- Alembic por línea de comandos usa la misma URL (`DATABASE_URL` o `backend/.env`); ejecútalo desde `backend/`.

## Flujo SDD con OpenSpec (perfil core)

Guía detallada con prompts reales: [docs/sdd-guide.md](./sdd-guide.md).

```
/opsx:explore        → pensar/aclarar una idea (opcional)
/opsx:propose        → crear el cambio y sus artefactos (proposal, specs, design, tasks)
/opsx:apply          → implementar las tareas (el agente ejecuta también las pruebas)
gh pr create         → abrir el PR
/opsx:archive        → fusionar los delta specs en openspec/specs/ y archivar el cambio
```

- Los comandos `/opsx:*` se generan con `openspec init --tools claude` y no se versionan (ver [guía SDD](./sdd-guide.md#0-requisitos-previos-una-vez)).
- Los pasos de verificación que debe incluir `tasks.md` están en [docs/verification-guide.md](./verification-guide.md); las reglas de `openspec/config.yaml` remiten a ella.
- Contexto del stack inyectado en todos los artefactos: `openspec/config.yaml`.
- Comandos CLI útiles: `openspec list`, `openspec show <c>`, `openspec validate --all`, `openspec status --change <c>`.

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
