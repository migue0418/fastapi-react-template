---
artifact: review
feature: F004
kind: feature
target: feature/004-compose-sin-credenciales-bd@0158d381bba20bb857d72675d2b3f9575d08aa8a
sources: [requirements.md@2, design.md@2, plan.md@1, evidence/README.md (run 1)]
round: 1
verdict: approve
---

# Review: feature/004-compose-sin-credenciales-bd, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

Revisado leyendo `git diff main...HEAD` (22 archivos: 7 fuera de `specs/`), los requisitos, el diseño y la evidencia. No se ejecutó Docker ni pytest.

### R1-01: La evidencia remite a decisiones H-08 y H-09 que no existen en `decisions.md`

- **Severity:** Minor
- **Where:** `evidence/README.md` sección 2 (párrafo previo a la tabla) y 3.1; `decisions.md` sección 1 (llega solo hasta H-07)
- **What is wrong:** La evidencia dice que el fallo de trazabilidad se pone al mantenedor en H-08 y que NFR-02 (Linux no verificado) se decide en H-09. En `decisions.md` no hay ninguna de las dos entradas, de modo que quien lea la evidencia no encuentra la pregunta ni su respuesta.
- **Evidence:** `grep` de `H-08` y `H-09` en la carpeta de la feature: solo aparecen en `evidence/README.md`. `decisions.md` termina en `### H-07`.
- **Recommended fix:** Que Verify abra H-08 (15 criterios sin test que nombre su ID, aceptar el procedimiento ejecutado como en F003/H-06) y H-09 (NFR-02 sin Linux) en `decisions.md` y los ponga al mantenedor antes de pasar a Document. La revisión no puede zanjarlas: son decisiones del mantenedor.

### R1-02: Criterios sin test que nombre su ID (15 de 17); la prueba es una ejecución registrada

- **Severity:** Minor
- **Where:** `evidence/README.md` sección 2 y sección 4, fallo 1; `design.md` 9.1 (última alternativa) y 11
- **What is wrong:** Solo AC-06.1 y AC-06.2 tienen un test automático con su ID. Los otros 15 se prueban con ejecuciones reales de Compose, inspección o la suite completa. La evidencia lo marca como fallo por la regla de trazabilidad.
- **Evidence:** El diseño aprobado (H-07) fijó expresamente ese procedimiento y descartó un test de pytest que dependa de Docker (dependencia nueva, NC-008; lo automatiza RM-05). Los resultados registrados para cada criterio son coherentes con el código revisado (ver 3.1). No hay un defecto del trabajo, sino una decisión de proceso que corresponde al mantenedor.
- **Recommended fix:** Resolverlo por H-08 (aceptar el procedimiento como prueba, como hizo F003). No requiere cambios de código. Sería un hallazgo bloqueante solo si el mantenedor exigiera tests con ID.

### R1-03: El mensaje fijo de AC-02.2 impide demostrar NFR-01 con un canario

- **Severity:** Minor
- **Where:** `evidence/README.md` sección 3 (NFR-01, AC-02.2); `docker-compose.yml` servicio `postgres-check`
- **What is wrong:** Con la contraseña `postgres` el mensaje contiene esa palabra como regla, así que buscar el valor recibido en la salida no distingue repetición de regla fija. La evidencia lo declara con honestidad.
- **Evidence:** Leyendo el guion, los tres `echo` son texto fijo y ninguno expande `$POSTGRES_PASSWORD`; la comparación solo se hace en un `if`. Por lectura, NFR-01 se cumple también en ese caso.
- **Recommended fix:** Ninguno en el código. Opcional: que Verify anote que el cumplimiento de AC-02.2 se probó por inspección del guion.

### R1-04: La lista de impacto en documentación omite `CLAUDE.md` y la guía de desarrollo aún no refleja el `.env` de la raíz

- **Severity:** Minor
- **Where:** `decisions.md` sección 4; `CLAUDE.md` (Comandos, Docker, línea 88); `docs/development_guide.md:14`; `README.md` paso 3 de «Empezar un proyecto nuevo»
- **What is wrong:** `docker compose up --build` en `CLAUDE.md` y en `docs/development_guide.md` ya no basta: falla sin el `.env` de la raíz con `POSTGRES_PASSWORD`. `development_guide.md` sí está en la lista de impacto (pendiente de Document); `CLAUDE.md` no lo está. El paso 3 de «Empezar un proyecto nuevo» del README crea solo `backend/.env`; ese gap ya se registró (T-03, R1-02 rechazado por alcance, posible seguimiento).
- **Evidence:** `README.md` líneas 22 y 29-30 frente a los líneas 28-33 (inicio rápido, que sí lo incluye); `docs/development_guide.md:14`.
- **Recommended fix:** Añadir `CLAUDE.md` (o declarar que no se toca, al ser contexto de agente) a la lista de impacto, y que Document actualice la guía de desarrollo. Registrar el paso 3 del README como seguimiento o corregirlo en Document.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 4 (R1-01 a R1-04)
- **Converging:** Yes (ronda 1; no hay rondas previas de feature)
- **Limits of this review:** No ejecuté Docker, Compose, pytest ni ningún PostgreSQL: me apoyo en el código y en la evidencia (run 1, commit `0158d38`, que coincide con el commit objetivo). No pude confirmar por mí mismo los resultados de ejecución (103 passed; 52 rechazos sin la variable; casos de Compose). No ejecuté `ruff` (la evidencia tampoco). NFR-02 sigue sin verificar en Linux. La revisión fue independiente: no vi el razonamiento del autor, solo los archivos.

### 3.1 Contraste de los criterios con el código

- **REQ-01 / REQ-05 / REQ-04:** `docker-compose.yml` usa `${POSTGRES_PASSWORD:?...}` en los tres sitios (postgres-check, postgres, `DATABASE_URL` del backend), sin contraseña con valor; `.example.env` trae la variable vacía; `/.env` está en `.gitignore`; `backend/.example.env` ya no lleva contraseña. Coincide con AC-01.x, AC-04.1, AC-05.x.
- **REQ-02 / REQ-03:** `postgres-check` mide con `wc -m` (caracteres, ASM-06), rechaza menos de 16 o `postgres`, usa `restart: "no"`, y `postgres` depende de él con `service_completed_successfully`. Coincide con C-01 y C-02 del diseño.
- **REQ-06:** `_get_test_database_admin_url` lanza `RuntimeError` en español que nombra la variable antes de cualquier conexión; el valor por defecto desapareció. El test parametrizado (ausente y vacía) sustituye `asyncpg.connect` por un fallo y comprueba que no aparece el mensaje de «no disponible». Es significativo y fallaría si volviera el valor por defecto.
- **REQ-07:** el README cubre el inicio rápido, el volumen ya inicializado (dos salidas, con aviso de pérdida de datos) y los tests contra Compose (PowerShell y bash, esquema `postgresql+asyncpg://`).
- **Alcance:** los únicos cambios fuera de la lista del diseño son `.sdd/roadmap.md` (RM-03 ensanchado y RM-09 cerrado como absorbido), registrado en H-02 y en `decisions.md`. `frontend/` sin cambios.
- **Dependencias:** ninguna nueva (NC-008).

### 3.2 What Should Be Kept

- La evidencia es honesta: declara el `fail` por trazabilidad, las desviaciones de AC-07.2 (`ALTER USER` en lugar de `\password`) y los límites de `uv` y `ruff`.
- La comprobación de AC-06.2 con un segundo PostgreSQL y `log_connections=on` es una prueba fuerte, más allá del test que sustituye `asyncpg.connect`.
- El diseño documenta los modos de fallo (`-d`, caracteres reservados, volumen existente) y el README los recoge.

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
