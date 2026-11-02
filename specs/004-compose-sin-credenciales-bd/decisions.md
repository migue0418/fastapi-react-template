---
artifact: decisions
feature: F004
---

# Decisions: Compose sin credenciales fijas de base de datos

> Records every question, answer, and decision about a feature: what was put to the human and what they decided, the Discover questions and their answers, the notable choices made along the way, and the documentation the feature affects.
> This document is the feature's record of why it is the way it is. Together with the state record, it lets any later session resume the feature from the files alone.
> It is append-only: entries are added, never rewritten. It points to the artifacts by ID and version and never duplicates their content.

---

## 1. Human Decisions

### H-01: El cambio se trata como «Pequeño»: feature SDD con una sola tarea

- **Raised in:** Define / clasificación del cambio (EP-007)
- **Concerns:** RM-03
- **Blocks:** Abrir la feature
- **Context:** RM-03 toca despliegue, seguridad y datos persistentes (el volumen de PostgreSQL), así que no es trivial. Es un solo comportamiento observable con pocos archivos y, por ahora, sin decisiones difíciles de revertir.
- **Options:** Pequeño (una sola tarea) / Normal (varias tareas) / Trivial (chore sin feature SDD)
- **Recommendation (not binding):** Pequeño. Se reclasifica a Normal si el Discover revela una decisión difícil de revertir.
- **Status:** Decided
- **Answer:** Pequeño (Recomendado)
- **Decided on:** 2026-11-02

---

## 2. Discover Questions

### Round 1

#### Q-01: ¿Compose exige una contraseña elegida también en desarrollo local, o solo en producción?

- **Why it matters:** Decide si `docker compose up` sigue funcionando sin configurar nada en desarrollo. Cambia el alcance y el flujo del inicio rápido del README.
- **Recommended:** Siempre exigida, también en desarrollo. Compose no sabe si es producción, y el resultado de RM-03 es que no haya ninguna fija en el archivo versionado. El coste es un paso más en el inicio rápido.
- **Answer:** _(pendiente)_
- **Answered on:** _(pendiente)_

#### Q-02: ¿Qué debe pasar con un volumen de PostgreSQL ya inicializado con la contraseña antigua?

- **Why it matters:** PostgreSQL solo aplica la contraseña la primera vez que crea el volumen. Con una contraseña nueva y un volumen viejo, el backend no podrá conectar. Define si la feature solo documenta la salida o también añade un aviso.
- **Recommended:** Documentar en el README las dos salidas (borrar el volumen y empezar de cero, o cambiar la contraseña dentro de la base) y no añadir detección automática. La plantilla la usa un solo mantenedor (PR-004) y el aviso exigiría mecanismo propio.
- **Answer:** _(pendiente)_
- **Answered on:** _(pendiente)_

#### Q-03: ¿Entra en esta feature el valor por defecto de los tests (`postgres:postgres` contra `127.0.0.1:5432`)?

- **Why it matters:** Sin la contraseña fija de Compose, los tests contra la base de Compose necesitan `TEST_DATABASE_ADMIN_URL`. Incluirlo ensancha el alcance más allá de `docker-compose.yml`.
- **Recommended:** Fuera de alcance. Ya lo cubre RM-09 en el inbox. Esta feature solo documenta en el README cómo apuntar los tests a la base de Compose con `TEST_DATABASE_ADMIN_URL`.
- **Answer:** _(pendiente)_
- **Answered on:** _(pendiente)_

#### Q-04: ¿Basta con exigir que la contraseña esté definida, o Compose debe rechazar además valores concretos como `postgres`?

- **Why it matters:** Rechazar valores concretos añade un requisito y un mecanismo de comprobación propio. Exigir solo que esté definida cumple el resultado de RM-03 (ninguna fija en el archivo versionado).
- **Recommended:** Basta con exigir que esté definida y no vacía. La elección de una contraseña débil queda en manos del mantenedor, igual que su `SECRET_KEY` fuera de producción.
- **Answer:** _(pendiente)_
- **Answered on:** _(pendiente)_

---

## 3. Decided Along the Way

| Date | Decision | Why | Refs |
|---|---|---|---|
| 2026-11-02 | La feature entrega RM-03 entera, sin dividirla. | Cumple los criterios de `ready` y ninguna señal de tamaño: un resultado, un usuario (Mantenedor), sin dependencias. | RM-03 |
| 2026-11-02 | Rama `feature/004-compose-sin-credenciales-bd` y commits convencionales en español. | EP-001 y EP-002 de la constitución. | F004 |

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-02 | `README.md` | El inicio rápido (Docker) ya no puede decir `admin` / `ChangeMe123!` junto a una base sin configurar; añadir el paso de la contraseña de PostgreSQL y el procedimiento para un volumen ya inicializado. | RM-03 |
| 2026-11-02 | `docs/behaviour/deployment.md` | Nuevo requisito sobre las credenciales de la base de datos de Compose. | RM-03 |
| 2026-11-02 | `.sdd/architecture.md` (9.2), `.sdd/product.md` (CAP-06), `.sdd/constitution.md` (NC-007) | El gap de `postgres:postgres` pasa a cerrado; NC-007 ya no cita `postgres:postgres` como valor por defecto versionado de Compose. | RM-03 |

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
