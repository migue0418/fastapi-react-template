---
artifact: review
feature: F001
kind: design
target: specs/001-retirar-openspec/design.md@2
sources: [specs/001-retirar-openspec/brief.md@2, specs/001-retirar-openspec/requirements.md@1, specs/001-retirar-openspec/decisions.md, .sdd/constitution.md@1.0.0, .sdd/stack.yaml@1, .sdd/architecture.md@1, .sdd/product.md@1, .sdd/skills.yaml@1, .sdd/documentation.yaml@1, .sdd/roadmap.md@2]
round: 2
verdict: approve
---

# Review: specs/001-retirar-openspec/design.md@2, round 2

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 1. Earlier Findings

| Finding | Answer | Status | Note |
|---|---|---|---|
| R1-01 | Fixed | Resolved | C-06 define un test por criterio con su ID completo, y `backend/tests/test_rename_project.py` cubre AC-03.1 y AC-03.2. La sección 11 reparte los 16 criterios entre T-01 y T-04. `decisions.md` añade una entrada que corrige la anterior y la nombra, como exige la sección 5 de ese archivo. El comando de C-06 recoge y ejecuta un test en esa carpeta (simulación en un clon). `checks/` queda dentro de la excepción de AC-07.1 y fuera de la suite. |
| R1-02 | Fixed | Resolved | La entrega pasa a T-04, que depende de T-03, y el fallo ya no permite terminar sin el cambio: T-04 queda retenida y Verify no pasa. `git rev-parse --git-common-dir` resuelve al `.git` principal desde una copia de trabajo secundaria (comprobado), con el matiz de R2-02. El orden se registra en `decisions.md` frente a Q-02: el archivo sigue fuera del PR y AC-08.1 solo pide el resultado al terminar la feature. También se cubre deshacer el merge. `CLAUDE.md` sigue ignorado (`.gitignore:28`), y su única mención está en la línea 158, como supone C-05. |
| R1-03 | Fixed | Resolved | El Overview declara el intervalo hasta T-03 y adelanta a T-01 la línea del README que localiza el contrato (`README.md:25`). |
| R1-04 | Fixed | Resolved | `docs/base-standards.md` figura en C-04 y en el impacto documental de `decisions.md`. Falta asignarlo a una tarea: ver R2-01. |
| R1-05 | Fixed | Resolved | T-03 ejecuta `docker compose build backend`, y la sección 7 justifica por proporción lo que no se ejecuta. Los hechos que alega son ciertos: `Dockerfile` solo copia `frontend/` y `backend/`, de modo que la entrada retirada no afecta a su contenido, y `docker-compose.yml:16` publica `127.0.0.1:5432`. |
| R1-06 | Fixed | Resolved | IF-01 declara el texto de ayuda como única salida que cambia, de acuerdo con `scripts/rename_project.py:46-48` y AC-03.3. |

---

## 2. Findings

### R2-01: `docs/base-standards.md` está en C-04, pero ninguna tarea lo entrega

- **Severity:** Minor
- **Where:** `design.md`, sección 11 (tabla de tareas y nota final)
- **What is wrong:** La revisión añadió el documento a C-04, pero la sección 11 no lo nombra, y ningún criterio de aceptación lo comprueba. La búsqueda de AC-07.1 tampoco lo señalaría, porque hoy no menciona `openspec`. Quien escriba el plan debe deducir a qué tarea corresponde, y puede omitirlo sin que falle ninguna comprobación. El riesgo es limitado, porque Document lo recoge por el impacto documental.
- **Evidence:** `design.md#C-04`, Owns, incluye `docs/base-standards.md`. La nota de la sección 11 reparte `documentation-standards.md` y `development_guide.md`, pero no este archivo. `docs/base-standards.md`, líneas 23 a 28: lista de documentos, sin `docs/behaviour/`. `.sdd/documentation.yaml`: se actualiza cuando cambia "la lista de documentos". EP-005 pide actualizar la documentación dentro del mismo cambio.
- **Recommended fix:** Nombrarlo en la nota de la sección 11 junto con la tarea que lo actualiza, probablemente T-01. También puede dejarse en el plan.

### R2-02: La localización de `CLAUDE.md` supone que la copia de trabajo es un worktree, sin declararlo

- **Severity:** Minor
- **Where:** `design.md#C-05`, párrafo final; sección 10
- **What is wrong:** C-05 confía en `git rev-parse --git-common-dir` para llegar al directorio del mantenedor. Eso solo funciona si la copia de trabajo es un worktree enlazado. El proceso habla solo de una "working copy", y en un clon el comando devuelve el `.git` del propio clon. En ese caso T-04 no encontraría el archivo y quedaría retenida por una causa ajena al criterio. El fallo es seguro, porque no se crea el archivo ni se da por bueno, pero costaría una interrupción y un diagnóstico.
- **Evidence:** `sdd-build`, sección 1: "its own working copy and branch", sin precisar el mecanismo. Simulación en un clon temporal: desde un worktree enlazado, el comando devuelve la ruta absoluta del `.git` principal; en el propio clon, `.git`.
- **Recommended fix:** Registrarlo como una suposición (`ASM-nn`) en la sección 10, o indicar en el plan de T-04 que la tarea se ejecuta en un worktree enlazado.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2
- **Converging:** Yes: los 2 bloqueos de la ronda 1 están resueltos, ninguno vuelve y no aparecen otros nuevos.
- **Limits of this review:** Revisión independiente, desde los archivos, sin explicación del autor. Se revisó lo que cambió entre `design.md@1` y `design.md@2` y lo que dejaron abierto las respuestas, no todo el diseño desde cero. Se simularon en un clon temporal, fuera del repositorio, el movimiento con `git mv`, los merges `--no-ff` de T-01 a T-03 y `git log --follow`: los seis documentos llegan a commits anteriores a `de1d8a0`, que es ancestro de `main` y base de la rama. También se ejecutó el comando de C-06 con un test trivial, usando el entorno virtual de `backend/`. No se ejecutaron la suite de backend, `docker compose build backend` ni los tests reales de C-06, que aún no existen, por lo que RISK-02 sigue abierto y se resolverá en T-03. El plan aún no existe. De `README.md` y `docs/` solo se revisaron las líneas relevantes. `sdd-build` y `sdd-implement` se consultaron como evidencia del proceso, aunque no figuran en la lista de fuentes. Ningún skill del catálogo aplica a esta revisión: `frontend-design` es el único con `use-when: design`, y la feature no cambia pantallas.

Fuera del objetivo de esta revisión: `state.yaml` sigue describiendo `design.md@1` y la ronda 1, aunque `design.md@2` ya está en un commit. Hay que reconciliarlo en el próximo checkpoint.

Para la aprobación del mantenedor: dos elecciones de la revisión las tomó el autor y solo constan en la sección 3 de `decisions.md`. Son no ejecutar `up`, `/health`, usuario y puerto, aunque EP-006 sea MUST, y editar `CLAUDE.md` en T-04 en lugar de "al terminar". Esta revisión no las objeta, pero conviene que la aprobación las nombre.

### 3.1 What Should Be Kept

- La separación entre C-06, prueba puntual de esta feature, y `backend/tests/`, comportamiento permanente que heredan los derivados.
- El orden lineal de T-01 a T-04, que evita conflictos en `test_acceptance.py` y mantiene válidas las rutas del contrato.
- El uso de `de1d8a0` como referencia: sigue en el historial de `main` tanto si la rama se integra con merge como con squash.
- El tratamiento de RISK-02, que nunca sobrescribe un `backend/.env` existente y separa un fallo del entorno de un fallo de NFR-01.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `design-r2-answers.md`, one line per finding: `R2-01: fixed (design.md@3)` or `R2-01: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
