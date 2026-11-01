---
artifact: design
feature: F001
status: draft
version: 3
upstream: [brief.md@2, requirements.md@1]
---

# Design: Retirar OpenSpec

> Describes how a feature will be built: the components and interfaces it adds or changes, its data, the technologies it uses, how it meets its qualities and handles failure, and the tasks that will build it.
> Once approved, it is the approach every task is built and reviewed against. It must meet the approved requirements; it never changes them.
> Describe the feature's change to the system, not the whole system: the architecture description holds the system as a whole and is brought up to date in Document.

---

## Conventions

Every component and interface is defined by a heading that starts with its ID:

- Components: `### C-01: [Name]`
- Interfaces: `### IF-01: [Name]`

Each one names, in its **Covers** field, the requirements and non-functional requirements it serves. Every requirement and non-functional requirement MUST be covered by at least one component or interface.

IDs MUST remain stable once referenced by other artifacts. A withdrawn item keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Assumption (`ASM`), open-question (`OQ`) and risk (`RISK`) IDs continue the numbering already used in the feature's brief and requirements.

---

## 1. Context

La feature no toca la aplicación en ejecución. Cambia archivos del repositorio y una herramienta de línea de comandos:

- **`openspec/`:** 41 archivos versionados, de los que 33 están en `changes/archive/`. Quedan `config.yaml`, `specs/.gitkeep` y seis specs en `specs/<área>/spec.md`. En el índice de git están con LF; en este clon, con `core.autocrlf=true`, están con CRLF en disco.
- **`scripts/rename_project.py`:** `EXCLUDED_PREFIXES` y su uso en `list_candidate_files` excluyen el archivo de cambios, y la ayuda lo nombra. El propio script se excluye aparte, con `SCRIPT_PATH`, y los archivos que no son UTF-8 se saltan en `prepare_changes`.
- **`backend/tests/test_rename_project.py`:** `ARCHIVED_FILE` es un archivo de prueba bajo la ruta retirada, usado en `EXCLUDED_FILES`, en `TEMPLATE_FILES` y en `test_archived_changes_are_untouched`.
- **Referencias:** `.dockerignore`, `README.md`, `docs/development_guide.md`, `docs/documentation-standards.md`, `.sdd/documentation.yaml`, `.sdd/product.md` y `.sdd/architecture.md`.
- **Local, sin versionar:** `CLAUDE.md` está en `.gitignore`.

Se aplican `architecture.md` 10.1 y 10.2 (ubicación de los archivos). No hay ADR existentes que afecten a la feature.

Restricciones: CON-01 y CON-02 del brief; NC-005, NC-006, NC-008, NC-009 y EP-001 a EP-006 de la constitución. La feature no usa ninguna tecnología nueva ni cambia ninguna fijada en `stack.yaml`.

---

## 2. Overview

La feature mueve primero el contrato, sin cambiar su contenido, y redirige a la vez las referencias que lo catalogan. Después retira la exclusión del renombrado junto con la parte de la spec que la describe. Por último borra lo que queda de `openspec/` y las instrucciones que remiten a esa carpeta. Con este orden, cada referencia al contrato apunta siempre a una ruta que existe, y la exclusión del script y la de la spec cambian en la misma tarea. Hasta T-03, `README.md` y `docs/development_guide.md` siguen hablando de la carpeta heredada, que aún existe en parte, pero la línea del README que indica dónde está el contrato ya cambia en T-01.

Cada criterio de aceptación tiene una comprobación ejecutable que nombra su ID completo. Las de repositorio viven en la carpeta de la feature y no forman parte de la suite de backend (C-06).

```text
openspec/specs/<área>/spec.md ──git mv──► docs/behaviour/<área>.md     (T-01)
EXCLUDED_PREFIXES + requisito en la spec ──► retirados juntos           (T-02)
openspec/ restante + .dockerignore + instrucciones ──► retirados        (T-03)
CLAUDE.md local ──► alineado, fuera de git                              (T-04)
```

---

## 3. Components

### C-01: Contrato de comportamiento

- **Responsibility:** Conservar en `docs/behaviour/` un documento por área, con su historial de git.
- **Covers:** REQ-01, NFR-02
- **Status:** Changed
- **Owns:** `docs/behaviour/auth.md`, `deployment.md`, `health.md`, `project-rename.md`, `roles.md` y `users.md`
- **Depends on:** git, para detectar el movimiento
- **On failure:** Si la comparación con el original muestra diferencias no previstas, la tarea no se integra.

### C-02: Script de renombrado

- **Responsibility:** Sustituir el nombre de la plantilla en los archivos versionados de texto UTF-8, salvo en el propio script.
- **Covers:** REQ-03, NFR-01
- **Status:** Changed
- **Owns:** La lista de archivos candidatos
- **Depends on:** git (`ls-files`)
- **On failure:** Sin cambios en el tratamiento de errores actual: `RenameError` y código de salida distinto de 0.

### C-03: Retirada de la carpeta heredada

- **Responsibility:** Quitar de los archivos versionados lo que queda de `openspec/` y su entrada en `.dockerignore`.
- **Covers:** REQ-02, REQ-06, NFR-01
- **Status:** Changed
- **Owns:** Nada: elimina archivos
- **Depends on:** C-01, porque las specs ya deben estar movidas
- **On failure:** Lo borrado sigue en el historial (CON-01), y revertir el commit lo restaura.

### C-04: Referencias e instrucciones

- **Responsibility:** Hacer que la documentación y los archivos fundacionales nombren `docs/behaviour/` y dejen de remitir a `openspec/`.
- **Covers:** REQ-04, REQ-05, REQ-07
- **Status:** Changed
- **Owns:** Las líneas afectadas de `README.md`, `docs/development_guide.md`, `docs/documentation-standards.md`, `docs/base-standards.md`, `.sdd/documentation.yaml`, `.sdd/product.md` y `.sdd/architecture.md`
- **Depends on:** C-01 y C-03
- **On failure:** La búsqueda de AC-07.1 señala cualquier mención restante.

### C-05: Instrucciones locales del mantenedor

- **Responsibility:** Retirar de `CLAUDE.md` la nota sobre `openspec/`, sin que entre en ningún commit.
- **Covers:** REQ-08
- **Status:** Changed
- **Owns:** La línea afectada del `CLAUDE.md` local
- **Depends on:** `.gitignore`, que ya ignora el archivo, y C-06, que lo localiza y lo comprueba
- **On failure:** Si el archivo no existe en el directorio de trabajo del mantenedor o no se puede editar, T-04 queda retenida: no se crea el archivo y su comprobación falla, de modo que la feature no puede pasar Verify. Si se deshace el merge de T-04, la línea se restaura a mano, porque git no la gestiona.

El cambio se hace en T-04, la última tarea de Build, y no después de Verify. Verify tiene que demostrar AC-08.1 con una comprobación que pase, y en ese momento la carpeta ya está retirada en la rama. El directorio principal del mantenedor no se identifica por la copia de trabajo de la tarea, sino por `git rev-parse --git-common-dir`, que apunta a él también desde una copia de trabajo secundaria. Por eso T-04 debe ejecutarse en un worktree enlazado de este repositorio (`git worktree add`), no en un clon aparte; en un clon la comprobación fallaría y la tarea quedaría retenida.

### C-06: Comprobaciones de aceptación de la feature

- **Responsibility:** Demostrar con pytest los criterios sobre el repositorio y la documentación, con un test por criterio que nombra su ID completo (`F001:AC-nn.m`).
- **Covers:** REQ-01, REQ-02, REQ-03 (AC-03.3), REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, NFR-02
- **Status:** New (enabler de la verificación)
- **Owns:** `specs/001-retirar-openspec/checks/test_acceptance.py`
- **Depends on:** git y pytest, ya disponibles en el grupo de desarrollo de `backend/`. No usa PostgreSQL ni dependencias nuevas.
- **On failure:** El test del criterio falla, y la tarea que lo entrega no se integra.

Se ejecuta con `cd backend && uv run python -m pytest ../specs/001-retirar-openspec/checks -q`. No está en `backend/tests/`, por lo que no forma parte de la suite y no se ejecuta en los proyectos derivados, que no tienen el commit `de1d8a0` ni el `CLAUDE.md` del mantenedor. Es una prueba de esta feature en su momento: un cambio posterior del contrato puede invalidarla sin que eso sea un fallo. AC-03.1 y AC-03.2 se comprueban en cambio en `backend/tests/test_rename_project.py`, porque describen un comportamiento permanente del script.

---

## 4. Interfaces

### IF-01: Línea de comandos de `scripts/rename_project.py`

- **Kind:** Command
- **Covers:** REQ-03
- **Provided by:** C-02
- **Used by:** El mantenedor, al crear un proyecto derivado
- **Operations:** `uv run python scripts/rename_project.py "<nombre visible>" <identificador>` y `--help`. Las entradas, los códigos de salida y los errores no cambian. La única salida que cambia es el texto de ayuda, que deja de nombrar la carpeta excluida.
- **Guarantees:** Se mantienen las de `project-rename`: valida antes de escribir y conserva los finales de línea y el BOM. Cambia solo el conjunto de archivos candidatos: todos los que devuelve `git ls-files` menos `SCRIPT_PATH`. Los archivos que no son UTF-8 se siguen saltando.
- **Compatibility:** Un repositorio que aún tuviera la carpeta de cambios archivados vería esos archivos renombrados. No afecta a los proyectos derivados ya creados, que tienen su propia copia del script.

### IF-02: Ruta del contrato de comportamiento

- **Kind:** File
- **Covers:** REQ-01, REQ-05
- **Provided by:** C-01
- **Used by:** El mantenedor, los agentes y el onboarding de los proyectos derivados
- **Operations:** Lectura de `docs/behaviour/<área>.md`, con `<área>` en auth, deployment, health, project-rename, roles y users.
- **Guarantees:** Un documento por área, con el contenido original, salvo el cambio de AC-01.3.
- **Compatibility:** Las rutas anteriores dejan de existir. Todas las referencias versionadas se actualizan en esta feature.

---

## 5. Data

La feature no introduce ni cambia datos de la aplicación ni migraciones.

---

## 6. Technologies

- **From the stack:** `backend-language` y `backend-testing` para el script y sus tests; `backend-dependency-management` y `datastore` para ejecutar la suite; `packaging-and-deployment` para el build de la imagen.
- **New:** Ninguna.
- **Skills:** `superpowers:test-driven-development` y `superpowers:systematic-debugging` para el cambio del script y cualquier fallo de la suite. `write-pr-report` en Release. `frontend-design:frontend-design` no aplica: no cambia ninguna pantalla.

---

## 7. Qualities

- **NFR-01:** El único código de producción que cambia es la lista de candidatos del script. `.dockerignore` pierde una entrada de una carpeta que ya no existe, y `docs` sigue excluido. Verified by: suite completa de backend en cada tarea y `docker compose build backend` en T-03 y en Verify, con los comandos de `stack.yaml` y resultado en `evidence/`. PostgreSQL se levanta en un contenedor desechable, en un puerto distinto de 5432, y se elimina al terminar; así se respetan NC-005 y NC-006 sin usar la base de otro proyecto.

  Las demás comprobaciones de la sección 3 de `docs/verification-guide.md` (`up`, `/health`, usuario y puerto) no se ejecutan, por proporción. La imagen no cambia: `docs` sigue excluido y la entrada retirada corresponde a una carpeta que ya no existe. Además, `docker compose up` publica el puerto 5432, ocupado en esta máquina por otro proyecto (`architecture.md`, 9.2).
- **NFR-02:** El movimiento va en un commit propio con `git mv`, sin cambios de contenido, de modo que la similitud es del 100 % aunque project-rename cambie después. Verified by: test `F001:NFR-02` de C-06, que ejecuta `git log --follow` sobre los seis documentos y exige algún commit anterior a `de1d8a0`.

---

## 8. Failure Modes

| Failure | How it is detected | What the system does | How it recovers |
|---|---|---|---|
| Un documento se altera al moverlo, por ejemplo por los finales de línea | Comparación con `de1d8a0`, ignorando los finales de línea (AC-01.2, AC-01.3) | La tarea no se integra | Rehacer el movimiento con `git mv` |
| Un proyecto derivado recibe instrucciones de inicio incoherentes (RISK-01) | Lectura de AC-04.1 y búsqueda de AC-07.1 | Queda alguna mención | Corregir en la misma tarea |
| Se pierde el historial del documento | `git log --follow` (NFR-02) | El log se corta en el movimiento | Separar el movimiento y el cambio de contenido en commits distintos |
| El renombrado toca un archivo que no debe | Tests de `test_rename_project.py` | La suite falla | Corregir la lista de candidatos |
| `CLAUDE.md` entra en un commit | `git check-ignore` y diff del PR (AC-08.1) | Aparece en el diff | Sacarlo del commit; la regla de `.gitignore` ya lo impide salvo que se fuerce |
| El build de Docker no puede ejecutarse por el entorno, por ejemplo por falta de `backend/.env` | Salida de `docker compose build backend` | NFR-01 queda sin demostrar | RISK-02 |
| No se puede editar el `CLAUDE.md` local, o no existe | Test `F001:AC-08.1` | T-04 queda retenida y la feature no pasa Verify | El mantenedor decide; ver C-05 |
| Se deshace el merge de T-04 después de editar `CLAUDE.md` | Registro de la tarea | El archivo local queda editado, porque git no lo gestiona | Restaurar la línea a mano |

---

## 9. Decisions

- **ADRs:** Ninguno. La feature no toma decisiones arquitectónicas; la ubicación del contrato ya la fijó el mantenedor (CON-02).
- **Human decisions:** H-01 y H-02 (aprobaciones de Define), Q-01 y Q-02. No hay decisiones difíciles de revertir: ni el movimiento ni el borrado lo son, porque el historial se conserva.
- **Research:** Ninguna: la feature no depende de conocimiento externo.

### 9.1 Alternatives Considered

- **Forma de `docs/behaviour/`:** Se eligen archivos planos, `<área>.md`. Conservar `<área>/spec.md` dejaría seis carpetas de un solo archivo y el nombre `spec` del flujo retirado. `git log --follow` funciona igual con ambas formas.
- **`specs/.gitkeep`:** No se mueve. Solo mantenía una carpeta que ya tiene contenido, y `docs/behaviour/` no lo necesita.
- **Un solo commit para todo:** Se descarta porque mezcla el movimiento con el cambio de contenido, lo que empeora NFR-02 y dificulta la revisión.
- **Comprobaciones de repositorio en `backend/tests/`:** Se descarta. Ese test nombraría el término buscado fuera de la lista cerrada de AC-07.1 y fallaría en los proyectos derivados. La carpeta de la feature ya está exceptuada en AC-07.1 y no se ejecuta en ellos.
- **Búsquedas manuales en Verify en lugar de tests:** Se descarta. Verify exige un test que nombre cada criterio.
- **Editar `CLAUDE.md` tras Verify:** Se descarta. Verify no podría demostrar AC-08.1.

---

## 10. Assumptions, Open Questions, and Risks

ASM-01 y ASM-02 siguen como en `brief.md`.

### ASM-03: `git ls-files` no devuelve otras rutas bajo `openspec/` en el momento de T-03

- **Basis:** Inventario de esta fase, con 41 archivos en la carpeta, todos retirados o movidos.
- **Impact if incorrect:** AC-02.1 fallaría y T-03 tendría que incluirlas.
- **Status:** Unverified

### RISK-02: `docker compose build backend` depende del entorno local

- **Likelihood:** Unknown
- **Impact:** Medium
- **Mitigation:** El servicio declara `env_file`, y `backend/.env` no existe en la copia de trabajo de una tarea y no se ha comprobado en el directorio principal. Si el comando falla por eso, se usa un `backend/.env` temporal copiado de `backend/.example.env`, que está ignorado por git y solo contiene valores de ejemplo, y se retira al terminar. Nunca se sobrescribe un `backend/.env` existente. Si el comando falla por otro motivo, se trata como un fallo de NFR-01.

---

## 11. Task List

| Task | Delivers | Acceptance criteria | Technologies | Depends on |
|---|---|---|---|---|
| T-01 | Contrato movido a `docs/behaviour/`, referencias redirigidas y comprobaciones de aceptación iniciadas | AC-01.1, AC-01.2, AC-05.1, AC-05.2 | `backend-testing` | None |
| T-02 | Renombrado sin la exclusión, con sus tests, su spec y su descripción en el README | AC-01.3, AC-03.1, AC-03.2, AC-03.3 | `backend-language`, `backend-testing` | T-01 |
| T-03 | `openspec/` retirado e instrucciones alineadas | AC-02.1, AC-02.2, AC-04.1, AC-04.2, AC-05.3, AC-06.1, AC-07.1 | `backend-testing`, `packaging-and-deployment` | T-02 |
| T-04 | `CLAUDE.md` local actualizado y comprobado | AC-08.1 | `backend-testing` | T-03 |

T-01 añade también el puntero a `docs/behaviour/` en `docs/base-standards.md`, que ningún criterio exige pero el catálogo de documentación sí, y lo comprueba la revisión de la tarea. T-01 deja hecha la parte de `docs/documentation-standards.md` de AC-05.3, y T-03 completa la de `docs/development_guide.md` y añade su test. NFR-01 y NFR-02 no son criterios de una tarea: T-01 prepara NFR-02 y añade su test, cada tarea ejecuta la suite de backend, T-03 ejecuta el build de Docker, y ambos se demuestran en Verify.

---

## 12. Traceability and Coverage

Verificado antes de la revisión:

- **Coverage gaps:** None
- **Unresolved dependencies:** None

---

## 13. Maintenance Guidelines

This document MUST remain aligned with the approved requirements and with the way the feature is actually being built.

Bump `version` on every change made after the first review or approval, and keep `upstream` pointing to the versions of the brief and the requirements it is built from. When either of them changes, check this design again: confirm it by updating `upstream`, or revise it.

A change to the approved approach MUST be approved again by the human. Every artifact that lists an older version of this document in its `upstream` becomes stale and MUST be checked again.

### Source of Truth

- This document is the canonical reference for how the feature is built.
- The requirements define what the feature must do; this design meets them and never changes them.
- The plan defines each task in detail; the task list here is its approved overview.
- ADRs record the significant decisions; `stack.yaml` records the technologies; `architecture.md` describes the system as a whole.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
