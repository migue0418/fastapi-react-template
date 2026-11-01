---
artifact: decisions
feature: F002
---

# Decisions: Producción rechaza la contraseña de administrador por defecto

> Records every question, answer, and decision about a feature: what was put to the human and what they decided, the Discover questions and their answers, the notable choices made along the way, and the documentation the feature affects.
> This document is the feature's record of why it is the way it is. Together with the state record, it lets any later session resume the feature from the files alone.
> It is append-only: entries are added, never rewritten. It points to the artifacts by ID and version and never duplicates their content.

---

## 1. Human Decisions

### H-01: Aprobar el brief

- **Raised in:** Define / aprobación del brief
- **Concerns:** brief.md@1
- **Blocks:** Escribir los requirements
- **Context:** Ver `brief.md`. Alcance según Q-01 a Q-03. Supuestos a revisar: ASM-01 (comparación exacta, sensible a mayúsculas) y ASM-02 (el mensaje no imprime contraseñas). Riesgo aceptado: RISK-01.
- **Options:** Aprobar, aprobar con cambios o replantear
- **Recommendation (not binding):** Aprobar: el alcance es el de RM-01 con las tres respuestas de la ronda 1.
- **Status:** Answered
- **Answer:** "Apruebo el brief de la spec 002" (aprueba brief.md@1)
- **Decided on:** 2026-11-01

### H-02: Aprobar los requirements

- **Raised in:** Define / aprobación de los requirements
- **Concerns:** requirements.md@1 (construido desde brief.md@1)
- **Blocks:** Cerrar Define y pasar a Design
- **Context:** Ver `requirements.md`. Supuestos a revisar: ASM-03 (si fallan a la vez `SECRET_KEY` y `ADMIN_PASSWORD`, basta con que el mensaje nombre una de las dos) y el criterio AC-01.3 (la regla se aplica aunque el administrador ya exista y aunque la base no responda). Cinco requisitos y dos cualidades.
- **Options:** Aprobar, aprobar con cambios o replantear
- **Recommendation (not binding):** Aprobar: cubren todo el alcance del brief sin añadir nada.
- **Status:** Answered
- **Answer:** "Aprobar (Recomendado)" (aprueba requirements.md@1, incluido ASM-03)
- **Decided on:** 2026-11-01

---

## 2. Discover Questions

### Round 1

#### Q-01: ¿Camino pequeño (feature SDD con una sola tarea) o normal?

- **Why it matters:** Fija cuántas tareas y revisiones tendrá la feature (EP-007). RM-01 toca seguridad, así que nunca es trivial.
- **Recommended:** Pequeño: un solo comportamiento observable, pocos archivos y sin decisiones difíciles de revertir.
- **Answer:** "Pequeño (Recomendado)"
- **Answered on:** 2026-11-01

#### Q-02: ¿Qué valores de ADMIN_PASSWORD rechaza producción?

- **Why it matters:** Cambia el alcance del brief y los criterios de aceptación.
- **Recommended:** Solo el valor por defecto `ChangeMe123!`, como dice RM-01; una regla de contraseñas débiles ampliaría el item.
- **Answer:** "Solo el valor por defecto (Recomendado)"
- **Answered on:** 2026-11-01

#### Q-03: Con el valor por defecto en producción y el administrador ya creado en la base, ¿el arranque se niega igualmente?

- **Why it matters:** Decide si la regla mira solo la configuración o también el estado de la base, y qué ocurre con un derivado ya desplegado.
- **Recommended:** Sí, siempre se niega: misma regla que `SECRET_KEY`, validada al arrancar sin mirar la base.
- **Answer:** "Sí, siempre se niega (Recomendado)"
- **Answered on:** 2026-11-01

---

## 3. Decided Along the Way

| Date | Decision | Why | Refs |
|---|---|---|---|
| 2026-11-01 | La feature se abre con el número 002 y la rama `feature/002-admin-password-defecto`. | Siguiente número libre (F001 ya existe) y convención de EP-001. | state.yaml |

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-01 | README.md | La tabla de variables y la guía de inicio deben decir que en producción `ADMIN_PASSWORD` no puede ser el valor por defecto. | RM-01 |
| 2026-11-01 | docs/behaviour/ | Si hay una spec de despliegue o configuración, recoger el nuevo rechazo; hoy `docs/behaviour/auth.md` solo cita `ADMIN_PASSWORD` para el administrador inicial. | RM-01 |
| 2026-11-01 | .sdd/architecture.md, .sdd/product.md, .sdd/roadmap.md, .sdd/constitution.md | Cerrar el gap de 9.2, la limitación de 9.2 de product, cerrar RM-01, y actualizar NC-007 (hoy dice que solo se rechaza `SECRET_KEY`). | RM-01 |

---

## 5. Maintenance Guidelines

This document is append-only.

- Add entries at the end of their section. Never rewrite or delete an earlier entry.
- The only change allowed to an existing entry is filling in its answer fields once, when the human answers.
- To correct an entry, add a new one that names the entry it corrects and why.
- Record the human's answers verbatim. A summary or an interpretation is never recorded as their answer.
- Date every entry, and name the IDs and versions it concerns.

### Source of Truth

- This document is the canonical record of what was asked, answered, and decided about the feature.
- The feature's state record says where the feature stands and points to the open entries here; it never repeats them.
- An approval is recorded here, and mirrored by the `status` of the approved artifact. If the two disagree, this document is correct and the artifact is fixed.
- The artifacts hold the content that was decided. This document records the decision, not the content.
