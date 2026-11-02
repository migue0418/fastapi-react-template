---
artifact: decisions
feature: F003
---

# Decisions: El límite de login se aplica por cliente real tras un proxy

> Records every question, answer, and decision about a feature: what was put to the human and what they decided, the Discover questions and their answers, the notable choices made along the way, and the documentation the feature affects.
> This document is the feature's record of why it is the way it is. Together with the state record, it lets any later session resume the feature from the files alone.
> It is append-only: entries are added, never rewritten. It points to the artifacts by ID and version and never duplicates their content.

---

## 1. Human Decisions

### H-01: Abrir RM-02 como F003 por el camino normal

- **Raised in:** Define / apertura
- **Concerns:** RM-02, EP-007
- **Blocks:** Abrir la feature
- **Context:** RM-02 es el primer ítem listo de la secuencia. Toca seguridad y su fallo es una inferencia (`architecture.md` 9.2); confiar en cabeceras de proxy puede permitir falsificarlas.
- **Options:** Normal (flujo completo) / pequeño (una sola tarea) / otro ítem.
- **Recommendation (not binding):** Normal, por tocar seguridad y por la decisión difícil de revertir sobre qué proxies se confían.
- **Status:** Decided
- **Answer:** "RM-02, flujo normal (Recomendado)"
- **Decided on:** 2026-11-02

### H-02: Aprobar brief.md@1

- **Raised in:** Define / brief approval
- **Concerns:** brief.md@1, Q-01, Q-02
- **Blocks:** Escribir requirements.md
- **Context:** El brief recoge el alcance acordado en Q-01 y Q-02: valor por defecto seguro, una variable para quien despliega tras un proxy, y comprobación en una ejecución real.
- **Options:** Aprobar, aprobar con cambios, o replantear.
- **Recommendation (not binding):** Aprobar tras revisar ASM-01 a ASM-03 y OQ-01.
- **Status:** Decided
- **Answer:** "Aprobar (Recomendado)" (brief.md@1)
- **Decided on:** 2026-11-02

### H-03: Aprobar requirements.md@1

- **Raised in:** Define / requirements approval
- **Concerns:** requirements.md@1, brief.md@1
- **Blocks:** Cerrar Define y pasar a Design
- **Context:** Cuatro requisitos y dos cualidades construidos desde brief.md@1.
- **Options:** Aprobar, aprobar con cambios, o replantear.
- **Recommendation (not binding):** Aprobar tras confirmar que el rechazo por exceso es el `429` actual de los tres endpoints limitados.
- **Status:** Decided
- **Answer:** "Aprobar (Recomendado)" (requirements.md@1)
- **Decided on:** 2026-11-02

### H-04: Valor por defecto de uvicorn fuera de Compose (OQ-02)

- **Raised in:** Design / revisión de diseño ronda 1 (R1-03)
- **Concerns:** design.md@1 OQ-02, REQ-01, CON-01, RISK-04
- **Blocks:** Aprobar el diseño
- **Context:** REQ-01 y CON-01 dicen que por defecto no se confía en ningún proxy. uvicorn confía por defecto en `127.0.0.1`: en Compose no afecta (ninguna conexión externa llega con esa IP), pero ejecutando uvicorn en local con un proxy en la misma máquina, la cabecera se respeta.
- **Options:** (A) Documentar el límite en el README y no cambiar el valor por defecto; REQ-01 se cumple en Compose. (B) Fijar `FORWARDED_ALLOW_IPS=""` en el Dockerfile; no cambia nada para Compose y obliga a quien use la imagen detrás de un proxy local en `127.0.0.1` a definir la variable. No cubre el arranque local de uvicorn, que no usa el Dockerfile.
- **Recommendation (not binding):** A: B toca la imagen sin cambiar el comportamiento en Compose y no cubre el caso local.
- **Status:** Decided
- **Answer:** "Documentar el límite (Recomendado)"
- **Decided on:** 2026-11-02

### H-05: Aprobar design.md@3

- **Raised in:** Design / design approval
- **Concerns:** design.md@3, ADR-0001, T-01 a T-03
- **Blocks:** Escribir el plan y pasar a Build
- **Context:** Sin código de aplicación nuevo: la confianza en `X-Forwarded-For` la decide uvicorn con `FORWARDED_ALLOW_IPS` (ADR-0001). Tres tareas: variable en `.example.env`, comprobación ejecutada con Compose aislado y README alineado. La revisión aprobó en la ronda 2; la ronda 1 encontró que `*` permite falsificar la IP incluso con el 8000 cerrado, y se corrigió.
- **Options:** Aprobar, aprobar con cambios, o replantear.
- **Recommendation (not binding):** Aprobar tras revisar ASM-05 y ASM-06, sin ejecutar hasta T-02, y RISK-03 y RISK-04.
- **Status:** Decided
- **Answer:** "Aprobar (Recomendado)" (design.md@3)
- **Decided on:** 2026-11-02

### H-06: ¿Basta el procedimiento ejecutado como prueba de AC-01.1 a AC-03.2?

- **Raised in:** Verify run 1 / evidence/README.md Failure 1; reviews/feature-r1.md R1-02
- **Concerns:** AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2, NFR-01, design.md@3 9.1
- **Blocks:** Mover la feature a Document
- **Context:** Ningún test del repo nombra esos siete criterios. El diseño aprobado eligió un procedimiento con Compose y registro en lugar de un test (PR-004). Verify lo repitió entero el 2026-11-02 y todos los escenarios dieron lo esperado; la regla de la evidencia pide un test que nombre cada ID, así que la run 1 queda en `fail` por este punto. La revisión de la feature aprobó (0 bloqueantes).
- **Options:** (A) Aceptar el procedimiento ejecutado como prueba, como riesgo registrado: la run 2 se limita a repetir Verify con esta decisión y guardar en la evidencia los comandos exactos del segundo contenedor; pasa a Document. (B) Abrir una tarea de corrección que automatice la comprobación (necesita Docker; alcance nuevo, RM-05 podría entregarla con CI).
- **Recommendation (not binding):** A: el diseño ya lo decidió con razones de proporcionalidad, la ejecución es repetible y B añade dependencia de Docker en los tests.
- **Status:** Decided
- **Answer:** "A"
- **Decided on:** 2026-11-02

### H-07: Fusionar el PR de F003 en main

- **Raised in:** Release / PR https://github.com/migue0418/fastapi-react-template/pull/13 (borrador, 2026-11-02)
- **Concerns:** toda la feature F003; brief.md@1, requirements.md@1, design.md@3, plan.md@1, evidence run 2
- **Blocks:** Cerrar la feature
- **Context:** La rama incluye el último `origin/main` (sin cambios nuevos). Checks repetidos en Release: backend 3 failed y 49 errors por PostgreSQL de tests no disponible (fallos conocidos, 49 pasan); frontend lint, test y build limpios. El proyecto no exige tareas de release (sin changelog ni versión). El PR lista lo que se acepta: siete criterios probados con procedimiento manual (H-06), suite de backend no ejecutada con PostgreSQL, entorno de prueba simulado, valores no verificados.
- **Options:** (A) Marcar el PR como listo y fusionarlo. (B) Pedir cambios en el PR. (C) Cerrarlo sin fusionar.
- **Recommendation (not binding):** A.
- **Status:** Open
- **Answer:** —
- **Decided on:** —

---

## 2. Discover Questions

### Round 1

Evidencia previa, leída antes de preguntar: `backend/app/core/limiter.py` usa `get_remote_address` (IP del socket, tras el tratamiento de cabeceras de uvicorn); el `Dockerfile` arranca uvicorn sin `--forwarded-allow-ips`; `docker-compose.yml` no define `FORWARDED_ALLOW_IPS`; el README (sección "Despliegue detrás de un proxy") ya documenta que sin esa variable todos los clientes comparten cupo y que con un valor amplio y el puerto 8000 expuesto se puede falsificar `X-Forwarded-For`. El fallo sigue sin comprobarse con una ejecución real.

#### Q-01: ¿Qué debe conseguir el mantenedor al terminar RM-02?

- **Why it matters:** Fija el alcance: solo comprobar y documentar, o también cambiar la configuración entregada.
- **Recommended:** Mantener el valor por defecto seguro (no confiar en ningún proxy) y que quien despliega solo tenga que definir una variable, con el comportamiento comprobado en una ejecución real: sin la variable, los clientes comparten cupo; con ella, cada cliente tiene el suyo; y una cabecera falsificada desde una IP no confiada se ignora.
- **Answer:** "Comprobar y dejar una variable (Recomendado)"
- **Answered on:** 2026-11-02

#### Q-02: ¿Debe producción avisar o negarse a arrancar si no se ha configurado la IP del proxy?

- **Why it matters:** La app no puede saber si hay un proxy delante. Un rechazo bloquearía despliegues sin proxy; un aviso añadiría comportamiento nuevo de arranque.
- **Recommended:** No. Queda como no objetivo; la documentación y la comprobación de Q-01 cubren a quien despliega tras un proxy.
- **Answer:** "No, no objetivo (Recomendado)"
- **Answered on:** 2026-11-02

---

## 3. Decided Along the Way

| Date | Decision | Why | Refs |
|---|---|---|---|
| 2026-11-02 | Se abre la rama `feature/003-limite-login-tras-proxy` desde `main` al día con `origin/main` | EP-001; número 003 libre (specs/ solo tiene 001 y 002, sin ramas abiertas) | F003 |
| 2026-11-02 | Design: sin código de aplicación; la confianza en cabeceras la decide uvicorn con `FORWARDED_ALLOW_IPS` (ADR-0001, proposed) | Un experimento aislado con uvicorn 0.47.0 y slowapi confirmó el comportamiento documentado; Q-01 pide una sola variable y el valor por defecto seguro | design.md@1, ASM-01, REQ-01 a REQ-03 |
| 2026-11-02 | Design: no se fija `FORWARDED_ALLOW_IPS=""` en el Dockerfile | En Compose ninguna conexión externa llega como `127.0.0.1`; cambiaría la imagen sin necesidad (límite en OQ-02 y RISK-04) | design.md@1, REQ-01 |
| 2026-11-02 | Design: revisión de diseño ronda 1, `changes-required` (1 bloqueante, 4 menores); todos aceptados y corregidos en design.md@2. R1-01 se verificó en `uvicorn/middleware/proxy_headers.py:163-164`: con `*` la IP es la primera entrada de la cabecera y la fija el cliente | La entrada anterior sobre el Dockerfile queda confirmada por H-04 | design.md@2, reviews/design-r1.md, H-04 |
| 2026-11-02 | Design: revisión de diseño ronda 2, `approve` (0 bloqueantes, 1 menor R2-01), corregido en design.md@3 sin cambiar el enfoque | Una red CIDR en AC-03.1 podía incluir al contenedor no confiado de AC-02.3 | design.md@3, reviews/design-r2.md |
| 2026-11-02 | Design: la comprobación es un procedimiento del plan con registro en `evidence/t02-comprobacion-proxy.md`, no un script ni un test versionado | PR-004; un test automático necesitaría Docker. Se puede automatizar con RM-05 | design.md@1, NFR-01 |
| 2026-11-02 | Design: tres tareas; T-03 (README) depende de T-02 para describir solo lo observado | AC-04.2 compara el README con los resultados | design.md@1, T-01 a T-03 |
| 2026-11-02 | Build, línea base: `uv run python -m pytest -q` en la rama de la feature da 3 failed, 48 passed, 49 errors, todos por `RuntimeError: PostgreSQL de tests no disponible` (no hay PostgreSQL ni contenedores en marcha). Frontend: lint limpio, 24 tests pasan. Se registran como fallos conocidos | Entorno sin PostgreSQL, no un defecto del código. Ninguna tarea de F003 toca código del backend, así que se juzgan por no añadir fallos | known-failures, NC-005 |
| 2026-11-02 | Build T-01: el test de AC-04.1 vive en `backend/tests/test_settings.py` (fuera de la lista de archivos de la tarea, que solo nombra `backend/.example.env`) y lee `.example.env` por ruta relativa al propio test | AC-04.1 exige un test que lo nombre; ahí están los tests de ajustes. Lo juzga la revisión de T-01 | F003 T-01, AC-04.1 |
| 2026-11-02 | Build T-02: la comprobación usó Docker 29.7.2, proyecto Compose temporal `f003check`, puerto 18000 y puerta de enlace 172.25.0.1; se quitó el mapeo de PostgreSQL de la copia del compose y cada petición usó `Connection: close`. Quedan no verificados: redes CIDR amplias (/16), valor mal escrito, ejecución local sin Docker y un proxy real | Registro en `evidence/t02-comprobacion-proxy.md`; T-03 no puede dar por hecho lo no verificado | F003 T-02, AC-02.3, AC-03.1 |
| 2026-11-02 | Build T-01 r1: R1-01 corregido (el test lee todo el bloque de comentario y carga la variable con `dotenv_values`); R1-02 rechazado (el test debe existir para AC-04.1; añadir `backend/tests/test_settings.py` a la lista Files de T-01 sería un cambio del plan) | Un cambio del plan va a Design; la desviación queda registrada aquí | reviews/task-T-01-r1-answers.md |
| 2026-11-02 | Build T-02 r1: R1-01 y R1-03 corregidos en la redacción; R1-02 rechazado (el bucle de `X-Forwarded-For` y el script del segundo contenedor no constan, reconstruirlos sería inventar lo ejecutado). Verify debe repetir la segunda fila de S1 recreando el servicio y puede completar los scripts | No se inventa lo no registrado | reviews/task-T-02-r1-answers.md |
| 2026-11-02 | Verify run 1 (commit 14b4cc5): repetidos S1 a S5 en Compose (proyecto `f003verify`, eliminado) con los mismos resultados que T-02, y ejecutados dos casos que T-02 declaró no verificados: red `/16` (el segundo contenedor falsifica su IP) y valor mal escrito (cupo compartido, falla cerrado). Revisión de feature r1: approve, 4 menores. Evidencia en `fail` solo por los siete criterios sin test que nombre su ID (H-06) | NFR-01; la regla de la evidencia | evidence/README.md, reviews/feature-r1.md, H-06 |
| 2026-11-02 | Verify run 2 (commit 4ff5b88, código idéntico al de la run 1): H-06 decidido "A"; repetidos los checks y S1 a S5 con los mismos resultados; la evidencia incluye los comandos exactos y el script del segundo contenedor. Evidencia `pass`. Revisión de feature r2: approve, 0 bloqueantes y 2 menores (R2-01, R2-02) respondidos. La feature pasa a Document | H-06 | evidence/README.md, reviews/feature-r2.md |
| 2026-11-02 | Build T-03: el README separa lo observado en T-02 (S1 a S5) de lo que afirma el diseño (primera IP no confiada desde la derecha, valor por defecto de uvicorn fuera de Compose) y marca como no ejecutados las redes amplias y el valor mal escrito. Que `*` permite falsificar la IP «aunque el puerto 8000 esté cerrado» viene del diseño (IF-01): T-02 no lo probó con el puerto cerrado | AC-04.2: sin afirmaciones que el registro no respalde | F003 T-03, evidence/t02-comprobacion-proxy.md |
| 2026-11-02 | Document: README corregido (R1-01, R1-04 de feature-r1): `/16` y `no-es-una-ip` pasan a observados; la frase del puerto 8000 cerrado se marca como del diseño y no ejecutada. Los resultados de esos dos casos constan en la evidencia de la run 1, que está en el commit `4ff5b88` (`git show 4ff5b88:specs/003-limite-login-tras-proxy/evidence/README.md`, filas «Extra»), no en `14b4cc5`, que no la contiene (estaba sin commitear). No se repitieron | R2-02 de feature-r2; la nota de la sección 4 citaba `14b4cc5` por error | README.md, evidence/README.md |
| 2026-11-02 | Document: fila `FORWARDED_ALLOW_IPS` añadida a la tabla de variables del README (tenía candidata en la sección 4). Se indica que la lee uvicorn y no `Settings` | AC-04.2; `.example.env` y la sección del proxy ya la nombraban | README.md |
| 2026-11-02 | Document: RM-02 cerrada en el roadmap (v5) y RM-11 añadida al inbox (automatizar la comprobación, origen H-06); nota en RM-05. No se añade un ítem para avisar de un `FORWARDED_ALLOW_IPS` inválido: Q-02 lo dejó como no objetivo y falla cerrado | Roadmap: Document no reordena ni descarta | .sdd/roadmap.md, H-06, Q-02 |
| 2026-11-02 | Document: sin hueco entre código y especificación: `git diff main -- backend/app` sigue vacío y el README coincide con la evidencia. Los 7 criterios sin test con su ID son el riesgo ya aceptado en H-06, no un hallazgo nuevo | Sección 7.1 de sdd-document | evidence/README.md, H-06 |
---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-02 | README, sección "Despliegue detrás de un proxy" | Probable ajuste a lo que se compruebe en la ejecución real | RM-02 |
| 2026-11-02 | `.sdd/architecture.md` 9.2 y `.sdd/roadmap.md` | Cerrar o reformular la deuda inferida del límite tras un proxy | RM-02 |
| 2026-11-02 | `.sdd/architecture.md` 6.1 y 8.1, y `.sdd/stack.yaml` (`rate-limiting`) | Resumir ADR-0001 y quitar la remisión a RM-02 | ADR-0001 |
| 2026-11-02 | `backend/.example.env` | Variable comentada con una red de ejemplo (T-01) | AC-04.1 |
| 2026-11-02 | README, sección "Despliegue detrás de un proxy" | Alinear con lo observado y documentar el valor por defecto de uvicorn fuera de Compose (T-03) | AC-04.2, OQ-02 |
| 2026-11-02 | T-03 (README) | Su texto debe coincidir con la nota nueva de `backend/.example.env` (T-01) | AC-04.2 |
| 2026-11-02 | `.sdd/` (architecture, stack) y ADR-0001 | Los resultados de T-02 confirman el diseño; Document los resume | F003 T-02 |
| 2026-11-02 | README, sección "Despliegue detrás de un proxy" | Document: marcar como observados la red amplia (`/16`) y el valor mal escrito (Verify run 1), y añadir "según el diseño; no se ha ejecutado con el 8000 cerrado" a la frase del puerto 8000 | R1-01, R1-04 de feature-r1. Los resultados de `/16` y `no-es-una-ip` solo constan en la evidencia de la run 1 (commit `14b4cc5`, R2-02): citarlo o repetir los dos casos |
| 2026-11-02 | README, tabla «Variables de entorno relevantes» | Falta una fila para `FORWARDED_ALLOW_IPS`; T-03 no la añadió por limitarse a la sección del proxy. Candidata para Document o un seguimiento | AC-04.2 |
| 2026-11-02 | Document, documentos actualizados: README (sección del proxy y tabla de variables), `.sdd/architecture.md` (v4: 6.1, 8.1 con ADR-0001, 9.2 cerrada), `.sdd/stack.yaml` (v2: `rate-limiting` con ADR-0001), `.sdd/product.md` (v4: CAP-06) y `.sdd/roadmap.md` (v5). Catálogo: `README.md` disparado y actualizado; `docs/behaviour/` (deployment) no disparado, porque no cambia el comportamiento observable (sin código nuevo); `docs/development_guide.md` y el resto, no disparados (comandos, flujo y datos sin cambios) | Cierre de Document | RM-02, ADR-0001 |
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
