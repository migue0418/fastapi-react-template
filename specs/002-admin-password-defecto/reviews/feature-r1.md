---
artifact: review
feature: F002
kind: feature
target: feature/002-admin-password-defecto@feae99c
sources: [requirements.md@1, design.md@2, plan.md@1, evidence/README.md@run-1]
round: 1
verdict: approve
---

# Review: feature/002-admin-password-defecto@feae99c, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

Se revisó `git diff main...feae99c` (código: `backend/app/core/settings.py`, `backend/tests/test_settings.py`, `README.md`; el resto son archivos de `specs/002-admin-password-defecto/`). No se cambió nada fuera de la feature. La regla de `settings.py` coincide con C-01 e IF-01: constante `DEFAULT_ADMIN_PASSWORD` compartida por el campo y la comparación, comprobación exacta tras la de `SECRET_KEY` (ASM-03), mensaje en español que nombra `ADMIN_PASSWORD` sin ningún valor, y `hide_input_in_errors=True`. `test_api.py` no aparece en el diff (NFR-02). Los 13 tests nuevos llevan el ID en su docstring y cubren AC-01.1 a AC-04.2 y ASM-03.

### R1-01: El test de AC-01.3 lee `backend/.env`, en contra del aislamiento prometido en ASM-04

- **Severity:** Minor
- **Where:** `backend/tests/test_settings.py` (`test_f002_ac_01_3_create_app_fails_without_database`); `design.md#ASM-04`
- **What is wrong:** El test llama a `create_app()`, que llama a `get_settings()` y este a `Settings()` sin `_env_file=None`, así que lee `backend/.env`. El fixture solo borra variables de entorno, no aísla el archivo. Si el `.env` local define `ADMIN_PASSWORD` con otro valor (justo lo que el paso 3 del README manda hacer), la configuración es válida, `create_app()` no lanza y el test falla. Es el escenario que ASM-04 dice evitar ("Un test podría pasar o fallar según el `.env` local").
- **Evidence:** `design.md#ASM-04`: "los tests construyen `Settings(_env_file=None)`". En el test, la construcción pasa por `get_settings()` (`settings.py`: `return Settings()`). La evidencia (run 1) dice que no pudo leer `backend/.env`, así que no prueba que el test sea robusto. No se ejecutó el escenario.
- **Recommended fix:** Aislar el archivo en ese test, por ejemplo apuntando `Settings.model_config["env_file"]` a ninguno con `monkeypatch`, o fijando `ADMIN_PASSWORD` a `ChangeMe123!` en el entorno del test (el entorno gana sobre `.env`). Opcional: actualizar ASM-04 a verificada.

### R1-02: La evidencia marca `result: pass` con un check "Not completed"

- **Severity:** Minor
- **Where:** `evidence/README.md`, sección 1 (fila "Arranque real, otra contraseña") y cabecera `result: pass`
- **What is wrong:** La propia plantilla dice que `result` es `pass` solo si cada check pasa. Una fila quedó "Not completed" y la cabecera dice `pass`. REQ-03 sí está cubierto por AC-03.1 en test y la limitación está declarada en la sección 5, así que no hay un criterio sin prueba, pero el resultado agregado no refleja el estado del check.
- **Evidence:** Cabecera `result: pass`; fila: "Not completed ... falló con `InvalidCatalogNameError`". `evidence/README.md` sección 6: "`result` is `pass` only when every check passes".
- **Recommended fix:** Repetir el arranque con otra contraseña en una base creada para ello (o declarar el check como no aplicable con motivo) y regenerar la evidencia en la siguiente ejecución de Verify, o dejar `result` coherente con la fila.

### R1-03: AC-01.3 con el administrador ya creado no se ejercitó

- **Severity:** Minor
- **Where:** `requirements.md#AC-01.3`; `evidence/README.md` sección 5
- **What is wrong:** AC-01.3 pide el mismo fallo con el administrador ya creado o con la base sin responder. El test cubre la base sin responder; el arranque real se hizo con la base vacía. La caja "administrador ya creado" solo está respaldada por el diseño (la validación ocurre antes del `lifespan`), no por una ejecución.
- **Evidence:** Evidencia sección 5: "no se probó con el administrador existente". El código respalda el argumento (la regla vive en `Settings`, evaluada al importar `app.main`), por eso no es bloqueante.
- **Recommended fix:** Aceptar la limitación al aprobar, o añadir un arranque real con el administrador sembrado.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 3 (R1-01, R1-02, R1-03)
- **Converging:** Yes (primera ronda)
- **Limits of this review:** No ejecuté tests, ni la suite, ni arranqué la aplicación; no usé docker ni servidores, y me fié de la evidencia del run 1 para los resultados (100 passed, arranques rechazados), contrastándola con el código y el recuento de tests (13 en `test_settings.py`). No leí `backend/.env` (ni es necesario para el juicio). AC-05.2 (archivos de `.sdd/`: `architecture.md`, `product.md`, `roadmap.md`, NC-007) queda sin hacer por diseño: la entrega la fase Document, y debe cerrarse antes del release; el diff no toca `.sdd/`. La lista de impacto documental (`docs/behaviour/auth.md`, `backend/.example.env`) la valora Document según `design.md`. La revisión es independiente: no produje el trabajo ni vi el razonamiento de su autor.

### 3.1 What Should Be Kept

- La constante única `DEFAULT_ADMIN_PASSWORD` y la comprobación en el validador existente, sin capas nuevas.
- `hide_input_in_errors=True` con test que lo protege (AC-02.2) y comparación exacta con tests de variantes.
- Trazabilidad por docstring en cada test.

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
