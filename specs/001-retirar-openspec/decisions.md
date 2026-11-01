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
- **Status:** Decided
- **Answer:** "Apruebo (Recomendado)"
- **Decided on:** 2026-11-01

### H-03: Aprobar el diseño

- **Raised in:** Design / aprobación del diseño
- **Concerns:** design.md@3, construido desde brief.md@2 y requirements.md@1
- **Blocks:** Escribir el plan y pasar a Build
- **Context:** Ver `design.md`. Revisado en `reviews/design-r1.md` y `reviews/design-r2.md`, sin hallazgos rechazados. Elecciones a confirmar: no ejecutar `up`, `/health`, usuario y puerto de la guía de verificación, aunque EP-006 es MUST; y editar `CLAUDE.md` en T-04, antes de Verify, en vez de después (Q-02).
- **Options:** Aprobar, aprobar con cambios o replantear
- **Recommendation (not binding):** Aprobar: es el enfoque más simple que cumple los requirements, y las dos elecciones tienen su motivo en la sección 3 de este registro.
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
| 2026-11-01 | Archivos planos `docs/behaviour/<área>.md` | Evita seis carpetas de un archivo y el nombre `spec` del flujo retirado; `git log --follow` funciona igual | design.md@1, IF-02 |
| 2026-11-01 | Mover las specs en un commit propio, sin cambios de contenido | Asegura la detección del movimiento para NFR-02 | design.md@1, NFR-02 |
| 2026-11-01 | Comprobar AC-07.1 y AC-03.3 con una búsqueda, sin test de repositorio | El test tendría que nombrar el término buscado y fallaría en los proyectos derivados | design.md@1 |
| 2026-11-01 | Corrige la entrada anterior: los criterios de repositorio se comprueban con tests en `specs/001-retirar-openspec/checks/`, fuera de la suite de backend | Verify exige un test que nombre cada criterio (R1-01); esa carpeta ya está exceptuada en AC-07.1 y no se ejecuta en los derivados | design.md@2, C-06 |
| 2026-11-01 | Actualizar el `CLAUDE.md` local en T-04, última tarea de Build, antes de Verify | Una tarea de Build no ve el archivo desde su copia de trabajo y Verify debe demostrar AC-08.1 (R1-02). Q-02 decía "al terminar, fuera del PR"; sigue fuera del PR y es lo último de Build | design.md@2, C-05, Q-02 |
| 2026-11-01 | No ejecutar `up`, `/health`, usuario y puerto de la guía de verificación | La imagen no cambia y el puerto 5432 está ocupado por otro proyecto; `docker compose build backend` sí se ejecuta (R1-05) | design.md@2, NFR-01 |

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-01 | `README.md` | Guía de inicio y nota del renombrado | brief.md@1 |
| 2026-11-01 | `docs/development_guide.md` | Nota sobre `openspec/` | brief.md@1 |
| 2026-11-01 | `docs/documentation-standards.md` | Nueva carpeta `docs/behaviour/` en la estructura | brief.md@1 |
| 2026-11-01 | `.sdd/documentation.yaml`, `.sdd/product.md`, `.sdd/architecture.md` | Ruta del contrato de comportamiento | brief.md@1 |
| 2026-11-01 | `CLAUDE.md` (local, sin versionar) | Nota sobre `openspec/` | Q-02 |
| 2026-11-01 | `docs/base-standards.md` | Puntero a `docs/behaviour/` en su lista de documentos | design.md@2, R1-04 |

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
