---
artifact: plan
feature: F001
status: checked
version: 1
upstream: [design.md@3, requirements.md@1]
---

# Plan: Retirar OpenSpec

> Describes how to approach each task in the design's task list: what it delivers, what it depends on, the technologies, skills and files it involves, how it is checked, and its risks.
> It is the approved design made concrete, detailed enough that a task can be started without guessing. It contains no code.
> Each task is defined here once. The design's task list is the overview the human approved; this plan never changes the design.

---

## Conventions

Every task is defined by a heading that starts with its ID: `### T-01: [Title]`.

The tasks and their IDs MUST match the design's task list. A task added later, such as a fix task after Verify, takes the next free number and is added to both.

IDs MUST remain stable once referenced by other artifacts, including commits and tests. A withdrawn task keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Comunes a todas las tareas:

- **Rama y commits:** `task/001-T-nn`, según EP-001 y EP-002, con `F001 T-nn` en el cuerpo del commit.
- **Comprobaciones de aceptación:** `cd backend && uv run python -m pytest ../specs/001-retirar-openspec/checks -q`. Cada test nombra su ID completo y no usa PostgreSQL. Comparan con el commit base `de1d8a0`.
- **Suite de backend:** `cd backend && uv run python -m pytest -q`, con `TEST_DATABASE_ADMIN_URL` apuntando a un `postgres:15` desechable, publicado en `127.0.0.1` en un puerto distinto de 5432 y eliminado al terminar. Nunca el contenedor de otro proyecto.

---

## 1. Tasks

### T-01: Mover el contrato y redirigir sus referencias

- **Delivers:** AC-01.1, AC-01.2, AC-05.1, AC-05.2, y la parte de `docs/documentation-standards.md` de AC-05.3
- **Implements:** C-01, C-04, C-06, IF-02
- **Depends on:** None
- **Stack:** `backend-testing`
- **Skills:** None
- **Files:** `openspec/specs/<área>/spec.md` movidos a `docs/behaviour/<área>.md`; `.sdd/documentation.yaml`; `.sdd/product.md`; `.sdd/architecture.md`; `docs/documentation-standards.md`; `docs/base-standards.md`; `README.md`; `specs/001-retirar-openspec/checks/test_acceptance.py`

**Approach:**

1. En un primer commit, y sin nada más, mover los seis documentos con `git mv`. `specs/.gitkeep` se queda hasta T-03.
2. En `.sdd/documentation.yaml`, poner `path: docs/behaviour/` en la entrada del contrato, mantenerla activa y quitar de su `purpose` la mención a RM-08.
3. En `.sdd/product.md`, apuntar las fuentes de BR-02 y BR-03 a `docs/behaviour/auth.md`, y la referencia de la sección 10 a `docs/behaviour/`, sin la mención al flujo anterior.
4. En `.sdd/architecture.md`, apuntar la referencia del despliegue a `docs/behaviour/deployment.md` y la del comportamiento detallado a `docs/behaviour/`. La línea de la carpeta heredada en 10.1 se queda hasta T-03.
5. Añadir `docs/behaviour/` a la estructura de `docs/documentation-standards.md` y un puntero en la lista de `docs/base-standards.md`.
6. Cambiar a `docs/behaviour/` la ruta de la línea del paso 5 de `README.md` que describe el contrato. El resto del paso se queda hasta T-03.
7. Crear el archivo de comprobaciones con los tests de esta tarea.

**How it is checked:** Tests `F001:AC-01.1` (los seis documentos existen), `F001:AC-01.2` (auth, deployment, health, roles y users iguales a `de1d8a0`, normalizando los finales de línea), `F001:AC-05.1`, `F001:AC-05.2` y `F001:NFR-02`. La parte de AC-05.3 de esta tarea se comprueba en la revisión, y su test llega en T-03. El puntero de `docs/base-standards.md` se comprueba en la revisión. Suite de backend.

**Technical requirements:** El primer commit no cambia contenido. Los seis documentos conservan su contenido exacto en esta tarea, project-rename incluido. El archivo de comprobaciones no lee `backend/.env` ni imprime secretos.

**Risks:** Con `core.autocrlf=true` el disco tiene CRLF y el índice LF; hay que normalizar al comparar. Una edición accidental del documento en el commit del movimiento rompería NFR-02 o AC-01.2.

### T-02: Quitar la exclusión del renombrado

- **Delivers:** AC-01.3, AC-03.1, AC-03.2, AC-03.3
- **Implements:** C-01, C-02, C-06, IF-01
- **Depends on:** T-01
- **Stack:** `backend-language`, `backend-testing`
- **Skills:** `superpowers:test-driven-development`, `superpowers:systematic-debugging`
- **Files:** `scripts/rename_project.py`; `backend/tests/test_rename_project.py`; `docs/behaviour/project-rename.md`; `README.md`; `specs/001-retirar-openspec/checks/test_acceptance.py`

**Approach:**

1. En `backend/tests/test_rename_project.py`, añadir a los archivos de prueba un documento bajo `docs/behaviour/` con el nombre de la plantilla, incluirlo en la lista `changed` y en la cuenta de archivos modificados, y añadir el test que comprueba que se renombra.
2. Retirar `ARCHIVED_FILE`, su uso en `EXCLUDED_FILES` y en `TEMPLATE_FILES`, y `test_archived_changes_are_untouched`. Marcar con su ID los tests que demuestran AC-03.2 (`test_script_does_not_rename_itself` y `test_non_utf8_file_is_skipped`).
3. En `scripts/rename_project.py`, retirar `EXCLUDED_PREFIXES` y su condición en `list_candidate_files`, y cambiar el texto de ayuda: reemplaza en los archivos versionados de texto UTF-8, salvo en este script.
4. En `docs/behaviour/project-rename.md`, cambiar el requisito de exclusiones para que deje sin modificar el propio script y los archivos que no sean UTF-8, y retirar el escenario "Historial de cambios intacto". Ningún otro cambio.
5. En la línea 20 de `README.md`, sustituir la excepción por la del propio script y los archivos que no son UTF-8.
6. Añadir los tests de aceptación de esta tarea.

**How it is checked:** `F001:AC-03.1` y `F001:AC-03.2` en `backend/tests/test_rename_project.py`. `F001:AC-01.3` (el documento es igual al original salvo los dos cambios previstos, normalizando los finales de línea) y `F001:AC-03.3` en el archivo de comprobaciones. Suite de backend.

**Technical requirements:** La línea de comandos cambia solo en el texto de ayuda (IF-01). Las variantes del nombre de la plantilla no se escriben de forma literal en el test (`OLD_DISPLAY_NAME` y similares), como ya hace el archivo. `backend/tests/` no nombra el término retirado (AC-07.1).

**Risks:** El test de AC-03.1 pasa también antes de quitar la exclusión, porque `docs/behaviour/` nunca estuvo excluido: no sirve como test en rojo. Es una excepción declarada a EP-004 (SHOULD), y lo que demuestra la retirada es AC-03.3.

### T-03: Retirar `openspec/` y alinear las instrucciones

- **Delivers:** AC-02.1, AC-02.2, AC-04.1, AC-04.2, AC-05.3, AC-06.1, AC-07.1
- **Implements:** C-03, C-04, C-06
- **Depends on:** T-02
- **Stack:** `backend-testing`, `packaging-and-deployment`
- **Skills:** `superpowers:systematic-debugging`, si falla la suite o el build
- **Files:** `openspec/` (borrado); `.dockerignore`; `README.md`; `docs/development_guide.md`; `.sdd/architecture.md`; `specs/001-retirar-openspec/checks/test_acceptance.py`

**Approach:**

1. Retirar con `git rm -r` lo que queda de `openspec/`.
2. Quitar la entrada de `.dockerignore` y dejar `docs`.
3. En "Empezar un proyecto nuevo" de `README.md`, sustituir el paso 5 por la indicación de que `docs/behaviour/` describe el comportamiento que hereda el proyecto y es entrada del onboarding. Puede ir en el paso 4, junto al onboarding.
4. Quitar de `docs/development_guide.md` la nota sobre la carpeta heredada y, en su lugar, indicar dónde está el contrato de comportamiento.
5. Quitar de `.sdd/architecture.md`, sección 10.1, la línea de la carpeta heredada, y añadir `docs/behaviour/` si la sección no lo recoge.
6. Añadir los tests de aceptación de esta tarea.

**How it is checked:** `F001:AC-02.1`, `F001:AC-02.2` (`git cat-file` sobre `openspec/config.yaml` en `de1d8a0`, que además es antecesor de `HEAD`), `F001:AC-04.1`, `F001:AC-04.2`, `F001:AC-05.3`, `F001:AC-06.1` y `F001:AC-07.1`. Este último busca con `git grep -i`, sin distinguir mayúsculas, y exige que cada coincidencia esté en la carpeta de la feature, en la excepción de `.sdd/constitution.md` o bajo el encabezado de RM-08 en `.sdd/roadmap.md`. Suite de backend y `docker compose build backend`.

**Technical requirements:** No se borra historial (CON-01). Si el build necesita `backend/.env` (RISK-02), se usa una copia temporal de `backend/.example.env` y se retira al terminar, sin sobrescribir nunca uno existente. No se ejecutan las demás comprobaciones de Compose (design.md, 7).

**Risks:** Un archivo de la carpeta no versionado seguiría en disco tras `git rm`, sin afectar a los criterios. Document debe mantener las menciones de `.sdd/roadmap.md` bajo RM-08 para que AC-07.1 siga pasando.

### T-04: Actualizar el `CLAUDE.md` local

- **Delivers:** AC-08.1
- **Implements:** C-05, C-06
- **Depends on:** T-03
- **Stack:** `backend-testing`
- **Skills:** None
- **Files:** `specs/001-retirar-openspec/checks/test_acceptance.py`. Fuera de git: `CLAUDE.md` del directorio principal del mantenedor.

**Approach:**

1. Trabajar en un worktree enlazado (`git worktree add`), no en un clon aparte.
2. Añadir el test `F001:AC-08.1`, que localiza `CLAUDE.md` junto al directorio que devuelve `git rev-parse --path-format=absolute --git-common-dir` y falla si no existe.
3. Retirar del `CLAUDE.md` de ese directorio la línea que presenta `openspec/` como material heredado, sin tocar el resto. Es el único cambio fuera de la copia de trabajo de la tarea.

**How it is checked:** `F001:AC-08.1`: no hay coincidencias de `openspec` en el archivo, sin distinguir mayúsculas; `git check-ignore` lo reconoce como ignorado; `git ls-files` no lo lista; y no aparece en `git diff --name-only de1d8a0...HEAD`. Suite de backend. La revisión de la tarea ejecuta el test, porque no ve el archivo en el diff.

**Technical requirements:** El archivo nunca se añade a git, ni se crea si falta. Si falta o no se puede editar, la tarea queda retenida y se avisa al mantenedor.

**Risks:** Si se deshace el merge de la tarea, la línea no se revierte y hay que restaurarla a mano (design.md, 8).

---

## 2. Order

| Group | Tasks | Waits for |
|---|---|---|
| 1 | T-01 | None |
| 2 | T-02 | Group 1 |
| 3 | T-03 | Group 2 |
| 4 | T-04 | Group 3 |

---

## 3. Consistency Check

Verificado sobre design.md@3 y requirements.md@1:

- **Consistency:** Clean
- **Issues:** None. Las cuatro tareas coinciden con las de la sección 11 del diseño. Los 16 criterios de aceptación están entregados por al menos una tarea, y AC-05.3 se reparte de forma declarada entre T-01 y T-03. Toda tarea nombra lo que entrega, su stack y sus archivos, e implementa componentes o interfaces del diseño. Las dependencias son lineales, sin ciclos. Ninguna tarea se ejecuta en paralelo, de modo que coincidir en `README.md` y en el archivo de comprobaciones no genera conflictos.

---

## 4. Maintenance Guidelines

This document MUST remain aligned with the approved design and the requirements.

Bump `version` on every change, and keep `upstream` pointing to the versions of the design and the requirements it is built from. When either of them changes, check this plan again: confirm it by updating `upstream`, or revise it.

The plan has no approval of its own: its status becomes `checked` once it passes the consistency check. A change that would alter the approved design is a change to the design, and goes back to the human through it.

### Source of Truth

- This document is the canonical reference for how each task is approached.
- The design defines the approach and the task list; this plan details it and never changes it.
- The requirements define the acceptance criteria each task delivers.
- The feature's state record tracks the status of each task during Build.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
