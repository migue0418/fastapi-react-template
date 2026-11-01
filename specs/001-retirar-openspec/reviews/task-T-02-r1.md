---
artifact: review
feature: F001
kind: task
target: task/001-T-02@e087d80
sources: [plan.md@1, requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/001-T-02@e087d80, round 1

> Revisión independiente de T-02 (diff `9e43b9f..e087d80`). Juzga el cambio contra el plan, los requisitos y el diseño, no contra la explicación de su autor.

---

## 2. Findings

No hay hallazgos. Comprobado:

- **AC-03.1:** `test_behaviour_documents_are_renamed` (marcado `F001:AC-03.1`) añade `docs/behaviour/example.md` con las variantes de la plantilla, lo incluye en `changed` y comprueba el contenido renombrado. Como declara el plan (Risks), pasa también sin el cambio; la retirada la demuestra AC-03.3.
- **AC-03.2:** `test_script_does_not_rename_itself` y `test_non_utf8_file_is_skipped` llevan `F001:AC-03.2`; la exclusión del script y de los no UTF-8 se mantiene en el código.
- **AC-03.3:** se retiran `EXCLUDED_PREFIXES`, su condición y el texto de ayuda; `rename_project.py` no contiene `openspec` (el test `F001:AC-03.3` lo comprueba sin distinguir mayúsculas). La línea de comandos solo cambia en el texto de ayuda (IF-01).
- **AC-01.3:** el diff de `project-rename.md` son exactamente los dos cambios previstos (requisito de exclusiones y escenario "Historial de cambios intacto"); el test lo compara con el original de `de1d8a0` normalizando finales de línea.
- **Dentro de la tarea:** solo cambian los cinco archivos de la lista del plan; el README solo cambia la línea 20 (las demás menciones quedan para T-03). `backend/tests/` no nombra el término retirado y los tests no escriben literales de la plantilla.
- **R1-01 de T-01:** corregido; los tests nuevos y los de esta tarea llevan el ID completo en su docstring.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 0
- **Converging:** Yes (ronda 1)
- **Limits of this review:** Se ejecutaron en un clon local en `e087d80`: `specs/001-retirar-openspec/checks/test_acceptance.py` (7 passed) y `backend/tests/test_rename_project.py` con `TEST_DATABASE_ADMIN_URL` en el puerto 55432 (33 passed). No se ejecutó la suite completa de backend ni lint. La revisión no fue ejecutada por quien produjo el trabajo, y no recibió su razonamiento.

### 3.1 What Should Be Kept

- Cambio mínimo y limpio: retirada de la exclusión sin tocar la lógica restante del script.
- La excepción de AC-03.1 (test no rojo) está declarada en el plan y compensada con AC-03.3.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas van en `task-T-02-r1-answers.md`.
