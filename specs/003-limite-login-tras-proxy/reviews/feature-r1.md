---
artifact: review
feature: F003
kind: feature
target: feature/003-limite-login-tras-proxy@14b4cc5
sources: [requirements.md@1, design.md@3, plan.md@1, evidence/README.md (run 1)]
round: 1
verdict: approve
---

# Review: feature/003-limite-login-tras-proxy@14b4cc5, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

Diferencia completa con `main` (`git diff main`): `backend/.example.env`, `backend/tests/test_settings.py`, la sección del proxy de `README.md`, `docs/adr/ADR-0001-...md` y los archivos de `specs/003-limite-login-tras-proxy/`. `git diff main -- backend/app` está vacío, lo que confirma que `limiter.py`, los decoradores y `docker-compose.yml`/`Dockerfile` no cambian (NFR-02, design.md@3 sección 7).

Comprobado y correcto: AC-04.1 (la variable está comentada, con `203.0.113.10`, nota en español, y el test `F003:AC-04.1` falla si se rompe cualquiera de esas condiciones); la tabla de trazabilidad de la evidencia coincide con la lista de tareas del diseño; las tres tareas encajan sin huecos ni duplicados; el único archivo fuera de la lista de T-01 (el test) está justificado en `decisions.md`; la lista de impacto documental de `decisions.md` sección 4 cubre README, `.example.env`, `.sdd/` y ADR-0001.

### R1-01: El README dice "no se ha ejecutado" de dos casos que Verify sí ejecutó

- **Severity:** Minor
- **Where:** `README.md`, sección "Despliegue detrás de un proxy", viñetas "Usa el valor más estrecho..." y "Un valor mal escrito..."
- **What is wrong:** El texto afirma que la red amplia ("no se ha ejecutado con una red amplia") y el valor mal escrito ("Este caso no se ha ejecutado") no se ejecutaron. La run 1 de Verify los ejecutó: `172.25.0.0/16` con 401 x11 y sin 429, y `no-es-una-ip` con cupo compartido (B recibe 429). AC-04.2 pide que cada afirmación coincida con lo observado o se corrija; aquí el texto subestima lo comprobado, no lo contradice.
- **Evidence:** `evidence/README.md` sección 3, filas "Extra"; sección 3.2, quinta viñeta ("ya no de la feature").
- **Recommended fix:** En Document, reescribir ambas viñetas como observadas, citando la red `/16` y el valor mal escrito. No hace falta tarea de corrección.

### R1-02: Siete criterios sin test automático que nombre su ID; el procedimiento no es reproducible desde el repo

- **Severity:** Minor
- **Where:** `evidence/README.md` sección 4 (Failure 1) y `evidence/t02-comprobacion-proxy.md`
- **What is wrong:** AC-01.1 a AC-03.2 se apoyan solo en una ejecución con Compose cuyo bucle de `X-Forwarded-For` y script del segundo contenedor no constan en ningún archivo versionado (evidencia, sección 5). Un tercero no puede repetir la comprobación con exactitud. El diseño aceptó expresamente un procedimiento en lugar de un test (design.md@3 9.1; NFR-01), y la evidencia lo registra con honestidad, así que no es un defecto del trabajo. Es el punto abierto H-06.
- **Evidence:** design.md@3 9.1, "Comprobación como script o test versionado"; evidencia sección 4.
- **Recommended fix:** Lo decide el mantenedor (H-06). Opciones: aceptar el procedimiento como prueba de esos criterios, o abrir una tarea que lo automatice (sería alcance nuevo y necesitaría Docker). Si lo acepta, basta con guardar en la evidencia los comandos exactos del segundo contenedor.

### R1-03: `evidence/README.md` no está en el commit revisado

- **Severity:** Minor
- **Where:** `specs/003-limite-login-tras-proxy/evidence/README.md`
- **What is wrong:** `git status` lo muestra sin seguimiento (`??`) en `14b4cc5`. Su campo `commit: 14b4cc5` apunta a un commit que no lo contiene. La rama, tal como está, no lleva la evidencia que la respalda.
- **Evidence:** `git ls-files -o --exclude-standard` lista solo este archivo.
- **Recommended fix:** Verify debe commitearlo junto con esta revisión y su respuesta antes de pasar a Document.

### R1-04: La frase "aunque el puerto 8000 esté cerrado" se lee como observada y no lo está

- **Severity:** Minor
- **Where:** `README.md`, viñeta "Usa el valor más estrecho posible..."
- **What is wrong:** La frase precede al paréntesis "(observado con `*`, tanto desde el host como desde otro contenedor de la red)", de modo que parece que se observó con el 8000 cerrado. En ninguna de las dos ejecuciones se cerró el 8000; la evidencia (sección 3.2) lo reconoce como "no probado". La afirmación viene del diseño (IF-01) y es coherente con el código de uvicorn, pero el README no la marca como tal.
- **Evidence:** `evidence/README.md` sección 3.2, sexta viñeta; sección 5, tercera viñeta.
- **Recommended fix:** Separar lo observado de lo que afirma el diseño, o añadir "(según el diseño; no se ha ejecutado con el 8000 cerrado)".

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 4 (R1-01 a R1-04)
- **Converging:** Yes (primera ronda)
- **Limits of this review:** No ejecuté la comprobación con Compose ni la suite de backend (sin PostgreSQL de tests, 49 errores conocidos); me apoyo en la evidencia de la run 1 y en la lectura del diff. No verifiqué el comportamiento de uvicorn 0.47.0 más allá de lo que citan el diseño y la evidencia. La revisión es independiente: no usé el razonamiento del autor ni el de Verify más allá de sus archivos.

### 3.1 What Should Be Kept

- La evidencia registra lo observado y declara lo no ejecutado sin adornarlo (incluida la fila extra de `/16` y el valor mal escrito, y la repetición de la segunda fila de S1 con recreación del servicio).
- Cero cambios en `backend/app`: la feature no toca el limitador ni el despliegue.
- El README separa en general lo observado de lo que afirma el diseño.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `feature-r1-answers.md`, one line per finding: `R1-03: fixed (design.md@3)` or `R1-03: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
