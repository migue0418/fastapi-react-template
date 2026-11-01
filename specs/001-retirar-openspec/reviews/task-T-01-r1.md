---
artifact: review
feature: F001
kind: task
target: task/001-T-01@05304bd
sources: [plan.md@1, requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/001-T-01@05304bd, round 1

> Revisión independiente de T-01 (diff `5018f7c..05304bd`). Juzga el cambio contra el plan, los requisitos y el diseño, no contra la explicación de su autor.

---

## 2. Findings

### R1-01: Los tests de aceptación no contienen el ID completo `F001:AC-nn.m`

- **Severity:** Minor
- **Where:** `specs/001-retirar-openspec/checks/test_acceptance.py` (nombres de los cinco tests)
- **What is wrong:** El plan y el diseño (sección 1) piden que cada test "nombre su ID completo" (`F001:AC-01.1`, etc.). Los tests se llaman `test_f001_ac_01_1_...`, sin docstring ni marca con el ID literal. Una búsqueda del ID en el archivo, por ejemplo para la matriz de trazabilidad de Verify, no los encuentra.
- **Evidence:** `grep "AC-01.1"` sobre el archivo no da coincidencias; los nombres son `test_f001_ac_01_1_six_areas_present`, `test_f001_ac_01_2_content_unchanged`, `test_f001_ac_05_1_catalogue_entry`, `test_f001_ac_05_2_product_and_architecture_references`, `test_f001_nfr_02_history_traceable`. No bloquea porque el ID es inequívoco en el nombre y el mapeo es unívoco.
- **Recommended fix:** Añadir a cada test un docstring de una línea con el ID literal (`F001:AC-01.1`), o fijar la convención en T-02 y T-03 y alinear estos cinco.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 1 (R1-01)
- **Converging:** Yes (ronda 1)
- **Limits of this review:** La suite completa de backend (`uv run python -m pytest -q`) no se ejecutó: exige un `postgres:15` desechable y el cambio solo toca documentación y un archivo de comprobaciones que no forma parte de esa suite. Las comprobaciones de aceptación sí se ejecutaron sobre un clon local en el scratchpad, en `05304bd` (5 passed). El clon no pudo materializar por completo `openspec/changes/archive/` por rutas demasiado largas en Windows; no afecta a los tests de T-01. La revisión no fue ejecutada por quien produjo el trabajo, y no recibió su razonamiento.

### 3.1 What Should Be Kept

- El movimiento va en un commit propio (`bcad08d`) con similitud del 100 % en los seis documentos, así que AC-01.2 y NFR-02 se cumplen por construcción y `git log --follow` conserva el historial. project-rename queda sin cambios, como pide el plan.
- Delivers cubierto: AC-01.1, AC-01.2, AC-05.1 (`path: docs/behaviour/`, activa, sin mención a RM-08) y AC-05.2 (BR-02, BR-03, sección 10 de product, y las dos referencias de architecture). La parte de AC-05.3 de `docs/documentation-standards.md` está hecha, y el puntero de `docs/base-standards.md` también.
- Dentro de la tarea: solo cambian los archivos de la lista del plan; `specs/.gitkeep`, la línea de carpeta heredada de architecture 10.1 y el resto del paso 5 del README se dejan para T-03, como indica el plan.
- Los tests comparan con `de1d8a0` normalizando finales de línea, no usan PostgreSQL ni leen `backend/.env`, y fallarían si el contenido o la ruta cambiaran.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas van en `task-T-01-r1-answers.md`.
