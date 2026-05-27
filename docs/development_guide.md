# Guía de desarrollo

Cómo arrancar y trabajar en la plantilla, y cómo usar el flujo SDD (OpenSpec).

## Requisitos

- Docker (para Postgres y/o todo el stack), **uv** (backend), Node + npm (frontend).
- **OpenSpec CLI** para el flujo SDD: `npm i -g @fission-ai/openspec` (o usar `npx @fission-ai/openspec`).

## Arrancar

### Todo con Docker
```powershell
docker compose up --build
```

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

## Flujo SDD con OpenSpec (perfil core)

Guía detallada con prompts reales: **[docs/SDD steps.md](./SDD%20steps.md)**.

```
/opsx:explore        → pensar/aclarar una idea (opcional)
/opsx:propose        → crear el cambio y sus artefactos (proposal, specs, design, tasks)
plan técnico         → agentes backend-developer/frontend-developer (OBLIGATORIO, → .claude/doc/<cambio>/)
/opsx:apply          → implementar las tareas (el agente ejecuta también las pruebas)
write-pr-report + gh → abrir el PR
/opsx:archive        → fusionar los delta specs en openspec/specs/ y archivar el cambio
```

- Antes de `/opsx:apply` DEBE existir el plan técnico de los agentes en `.claude/doc/<cambio>/`; no es opcional.
- Antes de escribir/implementar `tasks.md`, se aplica `.claude/rules/openspec-tasks-mandatory-steps.md`.
- Contexto del stack inyectado en todos los artefactos: `openspec/config.yaml`.
- Comandos CLI útiles: `openspec list`, `openspec show <c>`, `openspec validate --all`, `openspec status --change <c>`.

### Agentes y skills de apoyo
- Agentes de planificación (`.claude/agents/`): `backend-developer`, `frontend-developer` (plan técnico obligatorio), `product-strategy-analyst` (ideación/refinamiento).
- Skills (`.claude/skills/`): `enrich-us` (refinar user stories de Jira), `write-pr-report` (descripción de PR + `gh`).

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
