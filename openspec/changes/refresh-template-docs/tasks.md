## 0. Setup (OBLIGATORIO - PRIMER PASO)

- [x] 0.1 Crear y cambiar a la rama `feature/refresh-template-docs` desde `main`
- [x] 0.2 Generar el plan técnico con el agente `backend-developer` en `.claude/doc/refresh-template-docs/backend.md` (script, test, `config.yaml` y el detalle de cada documento) y leerlo antes de tocar nada. No hay `frontend.md`: el cambio no toca el frontend

## 1. Script de renombrado (TDD)

- [x] 1.1 Tests en `backend/tests/test_rename_project.py` para cada escenario de la spec `project-rename`, sobre repos git temporales en `tmp_path`; verlos fallar
- [x] 1.2 `scripts/rename_project.py` (solo librería estándar) hasta que los tests pasen
- [x] 1.3 Confirmar 1.1 y 1.2 en un commit (el clon se hace desde la rama) y hacer una prueba real en un clon temporal fuera del repo:
  - ejecutar `uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico`;
  - `git grep -i` sin variantes fuera de `openspec/changes/archive/` y del script;
  - `uv lock --check` en `backend/`;
  - `npm install --package-lock-only --ignore-scripts` en `frontend/` sin cambios en el lock;
  - borrar el clon

## 2. Docs y OpenSpec: frontera SDD

- [x] 2.1 `openspec/config.yaml`:
  - `rules.tasks` remite a `docs/verification-guide.md` y el paso final es el PR con `gh`;
  - `rules.design` sin el plan técnico con agentes;
  - el contexto de `repository.py` alineado con `docs/backend-standards.md`
- [x] 2.2 `git mv "docs/SDD steps.md" docs/sdd-guide.md` en un commit propio (si va junto a la reescritura, git lo registra como borrado y alta) y después reescribir la guía con el ciclo de OpenSpec, sin agentes ni skills propias
- [x] 2.3 `README.md`:
  - sección SDD sin `.claude/` y con `openspec init --tools claude`;
  - enlace a `docs/sdd-guide.md`;
  - sección "Empezar un proyecto nuevo";
  - `TEST_DATABASE_ADMIN_URL` como variable de entorno, en Tests y en la tabla de variables
- [x] 2.4 `docs/development_guide.md`, `docs/base-standards.md`, `docs/verification-guide.md` (con lo que solo estaba en la regla local: rama, baseline y restauración de BD, informe) y `docs/documentation-standards.md`
- [x] 2.5 Quitar `TEST_DATABASE_ADMIN_URL` de `backend/.example.env`

## 3. Docs: estilo

- [x] 3.1 Quitar rayas de inciso (también en encabezados) y negritas decorativas de `README.md`, todos los `docs/*.md` y `openspec/config.yaml`
- [x] 3.2 Comprobaciones, documentando la salida en el informe:
  - `—` y `**` no aparecen en los archivos de 3.1;
  - fuera de `openspec/changes/` no quedan referencias a `CLAUDE.md`, `.claude/`, agentes, `enrich-us`, `write-pr-report` ni `SDD steps`;
  - los enlaces relativos de los `.md` apuntan a archivos que existen;
  - los docs no escriben las tres variantes del nombre de forma literal (salvo el título del README)

## 4. Backend: tests y estado de BD (OBLIGATORIO)

- [x] 4.1 Revisar los tests afectados (solo el nuevo `test_rename_project.py`)
- [x] 4.2 Capturar baseline de `fastapi_template` (revisión Alembic, usuarios, refresh tokens, roles, bases de test)
- [x] 4.3 `cd backend && uv run pytest -q` en verde
- [x] 4.4 Verificar que la BD no cambia. Informe en `openspec/changes/refresh-template-docs/reports/YYYY-MM-DD-backend-tests.md`, con la prueba del clon temporal (1.3) y las comprobaciones de 3.2

## 5. Backend: endpoints con curl (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 5.1 No aplica: no hay endpoints nuevos ni cambiados. Dejarlo indicado en el informe

## 6. Frontend: E2E con Playwright MCP (OBLIGATORIO si aplica - EL AGENTE LO EJECUTA)

- [x] 6.1 No aplica: no hay cambios de frontend. Dejarlo indicado en el informe

## 7. Frontend: verificación (OBLIGATORIO)

- [x] 7.1 `cd frontend && npm run lint && npm run test && npm run build`

## 8. Cierre (OBLIGATORIO)

- [x] 8.1 `openspec validate refresh-template-docs` sin errores
- [x] 8.2 Local, no versionado: en el `CLAUDE.md` del autor, cambiar `docs/SDD steps.md` por `docs/sdd-guide.md`
- [x] 8.3 Marcar en `tmp/revision-pendientes.md` los puntos 14b, 20 y el de `TEST_DATABASE_ADMIN_URL`
- [x] 8.4 Abrir el PR con `gh` usando la skill `write-pr-report`
