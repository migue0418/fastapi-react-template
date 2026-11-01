---
artifact: decisions
feature: F001
---

# Decisions: Retirar OpenSpec

> Records every question, answer, and decision about a feature: what was put to the human and what they decided, the Discover questions and their answers, the notable choices made along the way, and the documentation the feature affects.
> This document is the feature's record of why it is the way it is. Together with the state record, it lets any later session resume the feature from the files alone.
> It is append-only: entries are added, never rewritten. It points to the artifacts by ID and version and never duplicates their content.

---

## 1. Human Decisions

### H-01: Aprobar el brief

- **Raised in:** Define / aprobación del brief
- **Concerns:** brief.md@1
- **Blocks:** Escribir los requirements
- **Context:** Ver `brief.md`.
- **Options:** Aprobar, aprobar con cambios o replantear
- **Recommendation (not binding):** Aprobar: el alcance es el que el mantenedor decidió en el onboarding, con las dos respuestas de la ronda 1.
- **Status:** Decided
- **Answer:** "Apruebo (Recomendado)"
- **Decided on:** 2026-11-01

### H-02: Aprobar los requirements

- **Raised in:** Define / aprobación de los requirements
- **Concerns:** requirements.md@1, construido desde brief.md@2
- **Blocks:** Pasar a Design
- **Context:** Ver `requirements.md`. Elecciones a confirmar: la lista cerrada de menciones históricas en AC-07.1 y la comprobación del build de Docker en NFR-01.
- **Options:** Aprobar, aprobar con cambios o replantear
- **Recommendation (not binding):** Aprobar: cubren el alcance del brief sin ampliarlo.
- **Status:** Open
- **Answer:**
- **Decided on:**

---

## 2. Discover Questions

### Round 1

#### Q-01: ¿Cómo seguimos con la rama base, dado que el PR #8 (`.sdd/`) sigue abierto?

- **Why it matters:** La feature debe salir de un `main` que tenga los archivos fundacionales, y el agente no hace merge (EP-003).
- **Recommended:** El mantenedor integra el PR #8 y la rama sale de `main`.
- **Answer:** "Ya hago merge de #8 (Recomendado)"; después: "Mergeado."
- **Answered on:** 2026-11-01

#### Q-02: ¿Se actualiza el `CLAUDE.md` local como parte de esta feature?

- **Why it matters:** No se versiona, pero seguiría dando instrucciones desfasadas a futuras sesiones.
- **Recommended:** Sí, retocarlo al terminar, fuera del PR.
- **Answer:** "Sí, actualízalo (Recomendado)"
- **Answered on:** 2026-11-01

---

## 3. Decided Along the Way

| Date | Decision | Why | Refs |
|---|---|---|---|
| 2026-11-01 | No preguntar de nuevo el destino de `openspec/` | El mantenedor ya lo decidió en el onboarding: mover las specs y borrar el resto | RM-08 |
| 2026-11-01 | Corregir la fuente de CON-01 tras la aprobación, sin cambiar el alcance | Citaba EP-003 sin relación con la restricción; la versión aprobada fue brief.md@1 y la corregida es brief.md@2 | H-01, CON-01 |

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-01 | `README.md` | Guía de inicio y nota del renombrado | brief.md@1 |
| 2026-11-01 | `docs/development_guide.md` | Nota sobre `openspec/` | brief.md@1 |
| 2026-11-01 | `docs/documentation-standards.md` | Nueva carpeta `docs/behaviour/` en la estructura | brief.md@1 |
| 2026-11-01 | `.sdd/documentation.yaml`, `.sdd/product.md`, `.sdd/architecture.md` | Ruta del contrato de comportamiento | brief.md@1 |
| 2026-11-01 | `CLAUDE.md` (local, sin versionar) | Nota sobre `openspec/` | Q-02 |

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
