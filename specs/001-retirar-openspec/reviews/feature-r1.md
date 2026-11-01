---
artifact: review
feature: F001
kind: feature
target: feature/001-retirar-openspec@df75bbd
sources: [requirements.md@1, brief.md@2, design.md@3, plan.md@1, evidence/README.md (run 1), decisions.md, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: feature/001-retirar-openspec@df75bbd, round 1

> Revisión independiente de la feature entera (`git diff de1d8a0..df75bbd`) contra los requirements y el diseño. El commit 8925dc6 solo añade la evidencia y `state.yaml`.

---

## 2. Findings

### R1-01: el test de AC-07.1 exime archivos enteros y secciones enteras (minor)

- **Where:** `specs/001-retirar-openspec/checks/test_acceptance.py`, `test_f001_ac_07_1_closed_list_of_mentions`.
- **What is wrong:** AC-07.1 admite coincidencias "en la excepción de `.sdd/constitution.md`" y "en el item RM-08". El test exime todo `.sdd/constitution.md` y cualquier línea bajo el encabezado de RM-08. Una mención nueva en otra parte de la constitución o en el cuerpo de RM-08 pasaría. Hoy la lista es exacta (4 coincidencias: `constitution.md:255`, `roadmap.md:24`, `27`, `29`), así que el criterio se cumple.
- **Evidence:** mi `git grep -niI -e openspec -e opsx` sobre `df75bbd`, excluyendo `specs/001-retirar-openspec`, devuelve solo esas cuatro líneas.
- **Recommended fix:** Ninguno obligatorio. Opcional: fijar las líneas esperadas.
- **Severity:** minor

### R1-02: AC-04.2 y AC-05.3 se comprueban con cadenas, no con enlaces resueltos (minor)

- **Where:** `test_f001_ac_04_2_no_links_into_openspec`, `test_f001_ac_05_3_documentation_structure`.
- **What is wrong:** AC-04.2 pide que ningún enlace o ruta apunte bajo `openspec/`. El test busca la subcadena `openspec/` y no valida que los enlaces nuevos (por ejemplo `./behaviour/` en `docs/base-standards.md`) existan. Lo cumple el criterio tal como está escrito. La evidencia ya lo declara en sus límites.
- **Evidence:** compruebo a mano que `docs/behaviour/` existe en `df75bbd` con los seis documentos y que `./behaviour/` en `docs/base-standards.md` resuelve a esa carpeta. `git grep openspec` sobre `README.md` y `docs/` no devuelve nada.
- **Recommended fix:** Ninguno.
- **Severity:** minor

### R1-03: AC-08.1 solo es reproducible en el directorio principal del mantenedor (minor)

- **Where:** `test_f001_ac_08_1_local_claude_md_updated`; `evidence/README.md`, sección 5.
- **What is wrong:** `CLAUDE.md` no se versiona, así que en un clon el test falla. Es lo que el diseño (C-05) prevé y la evidencia lo declara.
- **Evidence:** en el directorio principal, `grep -i openspec CLAUDE.md` no devuelve nada, y `git check-ignore -v CLAUDE.md` lo atribuye a `.gitignore:28`. Las instrucciones de proyecto cargadas al inicio de esta sesión todavía incluían la línea de `openspec/`: son una copia anterior a la edición de T-04, no el archivo actual.
- **Recommended fix:** Ninguno. Que Release no incluya esta comprobación en ningún paso de CI.
- **Severity:** minor

No hay hallazgos bloqueantes.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 3 (R1-01, R1-02, R1-03)
- **Converging:** Yes (ronda 1)

### 3.0 Criterio a criterio (comprobado por mi cuenta)

- **AC-01.1:** `git ls-tree df75bbd docs/behaviour/` lista auth, deployment, health, project-rename, roles y users.
- **AC-01.2:** `git diff --ignore-space-at-eol` entre `de1d8a0:openspec/specs/<área>/spec.md` y `df75bbd:docs/behaviour/<área>.md` está vacío para auth, deployment, health, roles y users.
- **AC-01.3:** el diff de project-rename solo sustituye la frase de exclusiones (ya sin `openspec/changes/archive/`) y borra el escenario "Historial de cambios intacto". Nada más.
- **AC-02.1 y AC-02.2:** `git ls-tree -r df75bbd` no contiene rutas con `openspec`. `de1d8a0` es antecesor de `HEAD` y `openspec/config.yaml` existe en él.
- **AC-03.1 a AC-03.3:** `scripts/rename_project.py` solo pierde `EXCLUDED_PREFIXES`, su uso y la mención en `HELP`. No queda ninguna referencia suelta a la constante. Ejecuté `tests/test_rename_project.py`: 33 passed. Los tests son significativos: `test_behaviour_documents_are_renamed` fallaría si se reintrodujera una exclusión de `docs/`. `test_script_does_not_rename_itself` comprueba que el script contiene las variantes y aun así queda intacto.
- **AC-04.1 y AC-04.2:** el paso 4 de "Empezar un proyecto nuevo" nombra `docs/behaviour/` como comportamiento heredado y entrada del onboarding, y el antiguo paso 5 desaparece. El README describe ahora las exclusiones reales (el script y lo que no es UTF-8).
- **AC-05.1 a AC-05.3:** `.sdd/documentation.yaml` tiene `path: docs/behaviour/` con `status: active` (la línea no aparece en el diff, por lo que sigue activa). `product.md` y `architecture.md` apuntan a `docs/behaviour/`. `documentation-standards.md` lo incluye en su estructura y `development_guide.md` ya no presenta `openspec/` como material vigente.
- **AC-06.1:** `.dockerignore` pierde solo la línea `openspec`; `docs` sigue.
- **AC-07.1:** véase R1-01.
- **AC-08.1:** véase R1-03.
- **NFR-02:** la evidencia y el test se apoyan en `git log --follow`; los renombrados conservan similitud suficiente (project-rename cambia 7 líneas).
- **NFR-01:** no pude reproducirla (sin PostgreSQL). El diff de código es mínimo (el script, su test y `.dockerignore`), y los 33 tests de renombrado y las 15 comprobaciones de aceptación pasan localmente. La evidencia registra 87 de 87 y el build de Docker en un worktree temporal.

### 3.1 Alcance y diseño

- Los archivos modificados fuera de `openspec/` y `specs/001-*` son exactamente los que enumera el diseño (C-01 a C-04) y el plan. `docs/base-standards.md` no lo exige ningún criterio, pero el diseño (sección 8) y el plan (T-01, paso 5) lo prevén por el catálogo de documentación.
- No se tocó código de la aplicación, frontend, Dockerfile, `docker-compose.yml` ni `.gitignore`.
- Los cuatro tasks encajan sin huecos ni solapes.
- El diseño se siguió. La retirada de la exclusión de `rename_project.py` es la única variación de comportamiento y está cubierta por ASM-01.

### 3.2 Evidencia

La evidencia coincide con lo que comprobé: mismas cuatro coincidencias de AC-07.1, mismos archivos movidos, mismo estado del árbol. `git diff df75bbd..8925dc6` toca solo `evidence/README.md` y `state.yaml`, así que la evidencia corresponde al código revisado.

- **Limits of this review:** No ejecuté la suite completa de backend (no hay PostgreSQL levantado) ni `docker compose build`. Ejecuté `specs/001-retirar-openspec/checks` (15 passed) y `tests/test_rename_project.py` (33 passed), con `-p no:cacheprovider`. No comprobé el contenido de `CLAUDE.md` más allá de buscar `openspec`. El estado de `HEAD` es 8925dc6, no df75bbd; el código es idéntico. La revisión no fue ejecutada por quien produjo el trabajo y no recibió su razonamiento.

### 3.3 What Should Be Kept

- Comparación con el commit base normalizando los finales de línea, que prueba "contenido sin cambios".
- Test de renombrado con un fixture real de `docs/behaviour/`, y la comprobación de que el script no nombra `openspec`.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas van en `feature-r1-answers.md`.
