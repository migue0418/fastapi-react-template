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

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-02 | README, sección "Despliegue detrás de un proxy" | Probable ajuste a lo que se compruebe en la ejecución real | RM-02 |
| 2026-11-02 | `.sdd/architecture.md` 9.2 y `.sdd/roadmap.md` | Cerrar o reformular la deuda inferida del límite tras un proxy | RM-02 |

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
