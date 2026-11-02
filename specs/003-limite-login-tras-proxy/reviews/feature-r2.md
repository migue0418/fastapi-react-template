---
artifact: review
feature: F003
kind: feature
target: feature/003-limite-login-tras-proxy@4ff5b88 + evidence/README.md (run 2, sin commitear)
sources: [requirements.md@1, design.md@3, plan.md@1, evidence/README.md (run 2)]
round: 2
verdict: approve
---

# Review: feature/003-limite-login-tras-proxy@4ff5b88 + evidence run 2, round 2

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 1. Earlier Findings

| Finding | Answer | Status | Note |
|---|---|---|---|
| R1-01 | Rejected as a fix task; Document reescribe las viñetas | Rejection accepted | No es bloqueante y el README subestima lo observado sin contradecirlo. La evidencia run 2 (3.2) lo mantiene como pendiente para Document. El README sigue igual en esta diferencia, como estaba previsto |
| R1-02 | Pending the human (H-06) | Resolved | `decisions.md` H-06 queda `Decided`, respuesta "A" (2026-11-02): el procedimiento ejecutado sirve de prueba de AC-01.1 a AC-03.2, como riesgo registrado. La run 2 guarda los comandos exactos del segundo contenedor (evidence 3), que era la condición de la opción A |
| R1-03 | Fixed (commit en el checkpoint de Verify) | Resolved | `evidence/README.md` y `t02-comprobacion-proxy.md` están en `4ff5b88`. Ver R2-01 para la run 2 |
| R1-04 | Rejected as a fix task; Document añade la salvedad | Rejection accepted | No es bloqueante; la frase viene de IF-01 y la evidencia run 2 (3.2 y 5) la declara no probada. El README no cambió, como estaba previsto |

---

## 2. Findings

Diferencia completa con `main` revisada de nuevo. Entre `14b4cc5` y `4ff5b88` solo cambian archivos de `specs/` (evidencia run 1, revisión r1 y respuestas); la afirmación de la evidencia ("no cambió ningún archivo fuera de `specs/`") es cierta. `git diff main -- backend/app` sigue vacío (NFR-02). Sobre `4ff5b88`, la run 2 solo modifica `decisions.md` (H-06 decidido) y `evidence/README.md`.

Comprobado: la tabla de trazabilidad de la run 2 cubre AC-01.1 a AC-04.2 con los escenarios S1 a S5, que concuerdan con el diseño (S5 con `*` falsifica desde host y desde otro contenedor; S3 y S4 mantienen a la conexión no confiada limitada). Cada fila "Pass (procedimiento, H-06)" está marcada como aceptada por el mantenedor, sin presentarla como un test automático. La evidencia declara sin adornos lo no ejecutado (suite de backend sin PostgreSQL, 8000 cerrado, varias entradas de `X-Forwarded-For`, uvicorn local) y que los casos extra `/16` y `no-es-una-ip` solo se ejecutaron en la run 1. La suite de backend no la ejecuté: me apoyo en la evidencia.

### R2-01: `evidence/README.md` de la run 2 declara `commit: 4ff5b88`, que contiene la run 1

- **Severity:** Minor
- **Where:** `specs/003-limite-login-tras-proxy/evidence/README.md`, frontmatter `commit: 4ff5b88`
- **What is wrong:** Es el mismo patrón que R1-03: el archivo está modificado y sin commitear. En `4ff5b88` ese archivo es la run 1 (`result: fail`), no la run 2 (`result: pass`), y `decisions.md` tampoco lleva H-06 decidido. Hasta que se commitee, la rama no contiene la evidencia que la respalda.
- **Evidence:** `git status --short` muestra `M` en `decisions.md` y `evidence/README.md`; `git show HEAD:specs/003-limite-login-tras-proxy/evidence/README.md` es la run 1.
- **Recommended fix:** Verify commitea la evidencia run 2, `decisions.md`, esta revisión y su respuesta juntas en el checkpoint, antes de pasar a Document.

### R2-02: Los resultados de los casos extra (`/16`, valor mal escrito) solo viven en el historial de git

- **Severity:** Minor
- **Where:** `evidence/README.md` sección 3, último párrafo, y 3.2
- **What is wrong:** La run 2 sustituye a la run 1, así que el registro vigente no contiene la observación de `/16` ni de `no-es-una-ip`, aunque el README (R1-01) se corregirá citándolas. Quien lea solo la run 2 no puede comprobar esa cita sin ir al historial. La evidencia lo declara y señala dónde mirar, así que no es un defecto de honestidad, solo de trazabilidad.
- **Evidence:** evidencia run 2, sección 3, "Los casos extra de la run 1 ... no se repitieron en la run 2", y sección 5.
- **Recommended fix:** Cuando Document reescriba las viñetas del README (R1-01), citar la run 1 por su commit `14b4cc5`, o repetir los dos casos si se quiere un registro autocontenido. No requiere tarea de corrección.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2 (R2-01, R2-02)
- **Converging:** Yes. La ronda 1 no tenía bloqueantes; las dos rondas aprueban y los menores de r1 están resueltos o aplazados a Document con una razón aceptada. R2-01 repite el patrón de R1-03 sobre la run nueva, no un defecto distinto.
- **Limits of this review:** No ejecuté Compose ni la suite de backend (sin PostgreSQL de tests, 49 errores conocidos): me apoyo en la evidencia de la run 2 y en la lectura de la diferencia. No verifiqué el comportamiento de uvicorn 0.47.0 más allá de lo que citan el diseño y la evidencia. Independiente: no usé el razonamiento del autor más allá de sus archivos.

### 3.1 What Should Be Kept

- La evidencia separa lo observado de lo aceptado por el mantenedor (H-06) y nombra cada límite.
- `backend/app` sigue sin cambios, y los comandos del segundo contenedor ahora constan completos.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `feature-r2-answers.md`, one line per finding: `R2-01: fixed (design.md@3)` or `R2-01: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
