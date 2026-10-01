# CLAUDE.md — FastAPI Template

Fuente de verdad para Claude Code en este repositorio. Léelo antes de actuar.

---

## Proyecto

Monorepo con backend FastAPI, frontend React + TypeScript + Vite y PostgreSQL. El backend expone la API, gestiona autenticación/autorización, ejecuta migraciones Alembic y sirve el build del frontend.

---

## Estructura

```text
/
├── backend/
│   ├── app/
│   │   ├── core/                  # settings, DB, migraciones, lifespan
│   │   ├── features/              # auth, users, roles, health
│   │   ├── web/                   # servido SPA
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── .example.env
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── src/
│   │   ├── app/                   # bootstrap, router, estilos
│   │   ├── features/              # slices UI
│   │   └── shared/                # http client, ui components
│   └── package.json
├── docker-compose.yml
└── Dockerfile
```

---

## Backend

Stack: Python, FastAPI, SQLAlchemy async, asyncpg, Alembic, Pydantic Settings, JWT, pwdlib[argon2], pytest.

Arquitectura por slice en `backend/app/features/<feature>/`:

```
router.py       # endpoints y dependencias HTTP
schemas.py      # modelos Pydantic
service.py      # casos de uso y reglas de negocio
repository.py   # acceso a datos con AsyncSession
models.py       # modelos SQLAlchemy, si aplica
```

Reglas:

- Mantener routers delgados; la lógica de negocio vive en `service.py`.
- El acceso a DB vive en `repository.py`; no escribir queries complejas en routers.
- Endpoints nuevos bajo `/api/...`.
- Si añades un router, incluirlo en `backend/app/main.py`.
- Si añades un modelo SQLAlchemy, importarlo en `backend/app/core/database.py::import_model_modules`.
- Cambios de schema siempre con migración Alembic en `backend/alembic/versions/`.
- Usar `AsyncSession` y APIs async; no mezclar sesiones sync.
- Usar `Settings` de `backend/app/core/settings.py`; no leer env vars desde código de dominio.

---

## Frontend

Stack: React 19, TypeScript, Vite, React Router 7, Vitest, Testing Library, ESLint.

Arquitectura por slice en `frontend/src/features/<feature>/`.

Reglas:

- Compartir HTTP solo mediante `frontend/src/shared/api/http.ts`.
- Los `api.ts` de cada feature envuelven `api.get/post/put/delete`.
- No hacer `fetch` directo desde componentes.
- Mantener componentes dentro de su slice; mover genéricos a `frontend/src/shared/ui/`.
- Usar alias `@` para imports desde `frontend/src`.
- No introducir estado global nuevo sin necesidad clara.

---

## Comandos

Docker:

```powershell
docker compose up --build
```

Backend local (requiere uv):

```powershell
cd backend
uv sync                                  # crea .venv e instala deps + dev
uv run uvicorn app.main:app --reload
```

Frontend local:

```powershell
cd frontend
npm install
npm run dev
```

Verificación:

```powershell
cd backend && uv run pytest -q
cd frontend && npm run lint && npm run test && npm run build
```

Dependencias backend:

```powershell
cd backend
uv add <paquete>        # producción
uv add --dev <paquete>  # solo dev/test
uv lock                 # regenerar lock file
```

---

## SDD: OBLIGATORIO al planificar (Plan Mode incluido)

**REGLA CRÍTICA — sin excepciones:** Cuando el usuario exprese intención de planificar, proponer, crear, implementar o diseñar una funcionalidad nueva — ya sea en conversación normal, en Plan Mode o en cualquier otro contexto — el **primer paso siempre es el flujo SDD**:

1. Si la idea necesita refinamiento o hay dudas → invoca `/opsx:explore`
2. Si la idea está clara → invoca directamente `/opsx:propose`

**NO** analices el código, **NO** planifiques directamente, **NO** propongas implementaciones sin haber pasado antes por `/opsx:explore` o `/opsx:propose`. El flujo SDD genera los artefactos (proposal, specs, design, tasks) que son el prerequisito de todo lo demás.

---

## SDD / OpenSpec

Este repo trae un flujo de **Spec-Driven Development** listo para usar. Requiere el CLI de OpenSpec
(`npm i -g @fission-ai/openspec` o `npx @fission-ai/openspec`).

Guía paso a paso con prompts reales: `docs/SDD steps.md`.

Flujo (perfil core):

```
/opsx:explore        # pensar/aclarar una idea (opcional)
/opsx:propose        # crear el cambio + artefactos (proposal, specs, design, tasks)
plan técnico         # agentes backend/frontend-developer → .claude/doc/<cambio>/ (OBLIGATORIO)
/opsx:apply          # implementar tareas (el agente también ejecuta las pruebas)
write-pr-report + gh # abrir el PR
/opsx:archive        # fusionar delta specs en openspec/specs/ y archivar
```

- **El plan técnico es obligatorio**: antes de `/opsx:apply` deben existir los planes de los agentes en `.claude/doc/<cambio>/{backend,frontend}.md`, y `apply` debe leerlos.
- Estándares detallados (referencia versionada): `docs/base-standards.md`, `docs/backend-standards.md`, `docs/frontend-standards.md`, `docs/data-model.md`, `docs/development_guide.md`, `docs/verification-guide.md`, `docs/documentation-standards.md`.
- Contexto del stack inyectado en todos los artefactos: `openspec/config.yaml`.
- Antes de escribir/implementar `tasks.md` se aplica `.claude/rules/openspec-tasks-mandatory-steps.md` (el agente ejecuta las pruebas: `uv run pytest`, curl, Playwright MCP; `npm run lint/test/build`; PR con `gh`).
- Agentes (`.claude/agents/`): `backend-developer`, `frontend-developer` (plan técnico obligatorio), `product-strategy-analyst` (ideación).
- Skills propias: `enrich-us` (refinar user stories de Jira), `write-pr-report` (descripción de PR + `gh`).

---

## Comentarios, docstrings y documentación

General:

- Nada de relleno: sin introducciones, sin resúmenes de lo obvio, sin repetir lo que se ha pedido.
- No inventes nada. Cada afirmación técnica se comprueba en el código de la rama de referencia; si algo no está verificado, dilo. Las afirmaciones sobre librerías o protocolos llevan enlace a la fuente oficial.
- Sigue el estilo, los nombres y los patrones que ya tiene el repo. No añadas dependencias ni patrones nuevos sin avisar.
- Sin emojis.
- Sin rayas para incisos: usa paréntesis, o quita el inciso si no aporta.
- Tildes y ortografía correctas siempre.

Comentarios y docstrings:

- Comenta el porqué, nunca el qué. Borra cualquier comentario que repita lo que dice el código.
- Una línea por idea. Nada de párrafos explicativos.
- Documenta solo lo que no es obvio: el motivo de una decisión y las trampas que pisaría quien lea el código. Si no hay nada de eso, una línea o ninguna.
- Un docstring largo en una función corta es un error.
- Si un nombre necesita un comentario, cambia el nombre.

ADR:

- Formato MADR: contexto, opciones, decisión y consecuencias. Solo para decisiones costosas de revertir.
- Lenguaje llano, como lo escribiría una persona, no una IA. Di solo lo necesario.
- Sin acentos graves, sin comillas simples y sin negritas ni asteriscos decorativos. Los nombres de código, rutas e identificadores van en texto plano, sin formato de código.

---

## NO hacer

- NO instalar dependencias sin confirmación del usuario.
- NO commitear ni imprimir secretos, tokens o passwords.
- NO usar SQLite para tests del backend.
- NO hacer `fetch` directo desde componentes frontend.
- NO duplicar lógica de negocio entre backend y frontend.
- NO hacer cambios grandes no relacionados con la petición.
