## Why

Desde el PR #5, `CLAUDE.md` y `.claude/` no se versionan, pero el README, varios documentos de `docs/` y `openspec/config.yaml` siguen presentándolos como parte de la plantilla. Quien clona encuentra instrucciones que no puede seguir, y `config.yaml` manda leer un archivo que no existe.

Además:

- los docs no siguen las reglas de estilo del autor (rayas para incisos, negritas decorativas);
- el README dice que `TEST_DATABASE_ADMIN_URL` se configura en `.env`, pero los tests no leen ese archivo;
- empezar un proyecto desde la plantilla obliga a renombrar a mano en unos 12 archivos.

## What Changes

- Los docs versionados describen el flujo SDD solo con OpenSpec:
  - El ciclo es explore, propose, apply y archive.
  - Los comandos `/opsx:*` y las skills `openspec-*` se regeneran con `openspec init --tools claude`.
  - Desaparecen las referencias a `CLAUDE.md`, `.claude/agents`, `.claude/rules`, `enrich-us`, `write-pr-report` y al plan técnico con agentes. Pasan a ser configuración local del autor.
- `openspec/config.yaml` deja de depender de archivos no versionados:
  - Sus reglas apuntan a `docs/verification-guide.md` en lugar de a `.claude/rules`, y quitan los agentes y `write-pr-report`.
  - El contexto deja de recomendar `selectinload` para relaciones, igual que `docs/backend-standards.md` desde el cambio 3.
- Se limpian el README, `docs/*.md` y `openspec/config.yaml`: sin rayas para incisos (también en encabezados) y sin negritas decorativas. Las reglas de estilo no se copian a los docs.
- `docs/SDD steps.md` pasa a `docs/sdd-guide.md`, sin espacio en el nombre.
- `TEST_DATABASE_ADMIN_URL`:
  - sale de `backend/.example.env`;
  - el README explica que es una variable de entorno que los tests leen del entorno, no de `.env`.
- Nuevo script `scripts/rename_project.py`:
  - Reemplaza en los archivos versionados las tres variantes del nombre de la plantilla (nombre visible, nombre con guion bajo y nombre con guion) por las del proyecto nuevo.
  - Deja fuera `openspec/changes/archive`.
  - Solo usa la librería estándar.
- Nueva sección del README, "Empezar un proyecto nuevo": el script y los pasos manuales que lo acompañan.

## Capabilities

### New Capabilities

- `project-rename`: renombrado de un proyecto creado desde la plantilla con `scripts/rename_project.py`.

### Modified Capabilities

Ninguna. Los cambios de documentación no alteran requisitos de las specs existentes.

## Impact

- Docs:
  - `README.md`;
  - `docs/sdd-guide.md` (antes `docs/SDD steps.md`), `docs/development_guide.md`, `docs/base-standards.md`, `docs/verification-guide.md`, `docs/documentation-standards.md`;
  - `docs/backend-standards.md`, `docs/frontend-standards.md` y `docs/data-model.md`, solo por estilo.
- `openspec/config.yaml`.
- `backend/.example.env`.
- Código nuevo:
  - `scripts/rename_project.py`;
  - su test, `backend/tests/test_rename_project.py`, que no usa la base de datos.
- No toca slices de backend ni de frontend, ni el modelo de datos. No hay migración Alembic.
- Configuración local del autor (no versionada): su `CLAUDE.md` cita `docs/SDD steps.md` y hay que actualizar esa referencia.
