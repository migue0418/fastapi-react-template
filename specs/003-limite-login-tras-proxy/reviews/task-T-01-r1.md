---
artifact: review
feature: F003
kind: task
target: task/003-T-01@5f03fcb
sources: [plan.md@1, requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/003-T-01@5f03fcb, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.

---

## 2. Findings

### R1-01: El test no comprueba que la nota sea en español ni que el archivo cargue con la variable descomentada

- **Severity:** Minor
- **Where:** backend/tests/test_settings.py (test_f003_ac_04_1_example_env_shows_forwarded_allow_ips)
- **What is wrong:** AC-04.1 pide "una nota en español de cuándo definirla". El test solo comprueba que la línea previa a la variable empieza por `#`; un comentario en inglés o vacío (`#`) lo pasaría. Además, el plan (How it is checked) pedía cargar el archivo con la variable descomentada con `dotenv_values`; ese paso no está en el test.
- **Evidence:** `assert lines[index - 1].startswith("#")` es la única comprobación de la nota. Se ejecutó `uv run pytest tests/test_settings.py -q` en la rama: 14 passed. El contenido real del archivo sí cumple (nota en español, valor 203.0.113.10).
- **Recommended fix:** Reforzar la aserción de la nota (por ejemplo, que contenga un texto en español como "proxy" y "cupo") y, opcionalmente, un `dotenv_values` sobre el texto descomentado. No bloquea: el criterio se cumple en el archivo.

### R1-02: Se cambia un archivo fuera de la lista de la tarea

- **Severity:** Minor
- **Where:** backend/tests/test_settings.py; plan.md T-01 "Files: backend/.example.env" y "git diff muestra solo ese archivo"
- **What is wrong:** El plan lista un único archivo y dice que el diff solo debe mostrarlo. El diff incluye también un test nuevo. El cambio es coherente con la regla de que cada AC tenga un test que lo nombre (la convención `F003:AC-04.1` ya se usa en `F002`), pero la discrepancia con el plan no está declarada en el plan.
- **Evidence:** `git diff feature/003-limite-login-tras-proxy...task/003-T-01 --stat` muestra `.example.env` y `test_settings.py`. El mensaje del commit sí menciona el test.
- **Recommended fix:** Anotar en el plan o en el registro de Build que T-01 añade el test del AC-04.1 (Files de T-01 con `backend/tests/test_settings.py`). No cambiar el código.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2 (R1-01, R1-02)
- **Converging:** Yes (primera ronda)
- **Limits of this review:** No se ejecutó la suite completa del backend (requiere PostgreSQL); solo `tests/test_settings.py` (14 passed), que no usa la base de datos. No se arrancó Compose: la tarea no cambia comportamiento, y la comprobación real es T-02. Revisor independiente: no produjo el trabajo ni recibió el razonamiento del autor.

### 3.1 What Should Be Kept

- El bloque cumple AC-04.1: variable comentada, valor `203.0.113.10` (rango de documentación, sin `*`), nota en español que cubre cuándo definirla, qué sustituir, el cupo compartido sin ella, el riesgo de `*` y de redes amplias, y que Compose la lee de `backend/.env`.
- No toca `Settings`, `docker-compose.yml`, `Dockerfile` ni dependencias (NC-008). Sin secretos (NC-007).
- Rama `task/003-T-01` y commit en español con `F003 T-01` en el cuerpo (EP-001, EP-002).

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `task-T-01-r1-answers.md`, one line per finding.
- After a revision, the next round is a new file with the next round number.
