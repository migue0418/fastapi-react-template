---
artifact: plan
feature: F002
status: checked
version: 1
upstream: [design.md@2, requirements.md@1]
---

# Plan: Producción rechaza la contraseña de administrador por defecto

> Describes how to approach each task in the design's task list: what it delivers, what it depends on, the technologies, skills and files it involves, how it is checked, and its risks.
> It is the approved design made concrete, detailed enough that a task can be started without guessing. It contains no code.
> Each task is defined here once. The design's task list is the overview the human approved; this plan never changes the design.

---

## Conventions

Every task is defined by a heading that starts with its ID: `### T-01: [Title]`.

The tasks and their IDs MUST match the design's task list. A task added later, such as a fix task after Verify, takes the next free number and is added to both.

IDs MUST remain stable once referenced by other artifacts, including commits and tests. A withdrawn task keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Comunes a todas las tareas:

- **Rama y commits:** `task/002-T-nn`, según EP-001 y EP-002, con `F002 T-nn` en el cuerpo del commit.
- **Suite de backend:** `cd backend && uv run python -m pytest -q`, con `TEST_DATABASE_ADMIN_URL` apuntando a un `postgres:15` desechable, publicado en `127.0.0.1` en un puerto distinto de 5432 y eliminado al terminar. Nunca el contenedor de otro proyecto. Resultado de partida: 87 tests en verde.

---

## 1. Tasks

### T-01: Rechazar en producción el `ADMIN_PASSWORD` por defecto

- **Delivers:** AC-01.1, AC-01.2, AC-01.3, AC-02.1, AC-02.2, AC-03.1, AC-03.2, AC-04.1, AC-04.2, AC-05.1
- **Implements:** C-01, C-02, IF-01
- **Depends on:** None
- **Stack:** validation-and-settings, backend-testing
- **Skills:** `superpowers:test-driven-development`
- **Files:** `backend/app/core/settings.py` (cambia), `backend/tests/test_settings.py` (nuevo), `README.md` (cambia)
- **Fixes:** n/a

**Approach:** primero los tests (EP-004), después el código, después el README.

1. Crear `backend/tests/test_settings.py` y comprobar que los tests de rechazo fallan antes del cambio. Los tests construyen `Settings(_env_file=None, ...)`, fijan con `monkeypatch.setenv` las variables que el caso necesita y borran con `monkeypatch.delenv(..., raising=False)` las que no (ASM-04), sin usar PostgreSQL. Cada test nombra en su nombre o docstring el ID completo que prueba (`F002:AC-01.1`). Casos, con `ENVIRONMENT=production` y `SECRET_KEY` de 32 o más caracteres salvo indicación:
   - AC-01.1: `ADMIN_PASSWORD=ChangeMe123!` fijado: lanza `ValidationError`.
   - AC-01.2: `ADMIN_PASSWORD` sin definir en el entorno ni en archivo: lanza igual.
   - AC-01.3: `DATABASE_URL` hacia un puerto sin servidor y `create_app()` tras `get_settings.cache_clear()` (limpiando la caché al terminar): lanza `ValidationError` sin conectar.
   - AC-02.1: el mensaje contiene `ADMIN_PASSWORD`, el texto en español acordado y la indicación de definir otra contraseña.
   - AC-02.2 y NFR-01: `str(error)` no contiene `ChangeMe123!` con el valor fijado explícitamente.
   - AC-03.1: otra contraseña: carga sin error.
   - AC-03.2: `changeme123!` y `ChangeMe123! ` (con espacio) cargan sin error.
   - AC-04.1 y AC-04.2: `development` y `test`, con el valor por defecto fijado y sin definir: cargan sin error.
   - ASM-03: `SECRET_KEY` corta y `ADMIN_PASSWORD` por defecto: falla y el mensaje nombra `SECRET_KEY`.
2. En `settings.py`: añadir la constante de módulo `DEFAULT_ADMIN_PASSWORD`, usarla como valor por defecto de `admin_password`, añadir a `validate_production_secrets` la comparación exacta tras la de `SECRET_KEY`, con un `ValueError` en español, y añadir `hide_input_in_errors=True` a `SettingsConfigDict`. Seguir el estilo del mensaje de `SECRET_KEY`: nombra la variable, dice qué ocurre y qué hacer, sin imprimir ningún valor.
3. En el README: la tabla de variables (`ADMIN_PASSWORD`, hoy línea 160) y el paso 3 de la guía de inicio (hoy línea 22) dicen que, con `ENVIRONMENT=production`, no puede ser `ChangeMe123!`. No tocar `.sdd/` ni `docs/behaviour/`.
4. Ejecutar la suite completa y confirmar que los tests existentes no se han editado.

**How it is checked:**

- `cd backend && uv run python -m pytest tests/test_settings.py -q`: un test por criterio listado en el enfoque, todos en verde tras el cambio y los de rechazo en rojo antes.
- La suite completa: 87 existentes más los nuevos, en verde, con `git diff` mostrando que `test_api.py` no cambia (NFR-02).
- Comprobación manual de AC-05.1: leer las dos líneas del README.
- No se arranca uvicorn en esta tarea: lo hace Verify, que también inspecciona la salida (NFR-01).

**Technical requirements:** mensaje en español (NC-009); la validación solo en `Settings` (NC-003); sin dependencias nuevas (NC-008); comparación exacta, sin `strip` ni cambio de mayúsculas (ASM-01); ninguna contraseña impresa (NC-007); sin acceso a la base en la comprobación. No editar los valores de `ADMIN_PASSWORD` ni de `ENVIRONMENT` de los tests existentes.

**Risks:** `backend/.env` local o variables de la shell pueden alterar un test (ASM-04): los tests aíslan el entorno. `hide_input_in_errors` podría no bastar en `Settings` real (RISK-03): el test de AC-02.2 lo detecta, y entonces la tarea se detiene para revisar el diseño en lugar de improvisar. La caché de `get_settings` puede filtrarse entre tests: limpiarla antes y después en AC-01.3.

---

## 2. Order

| Group | Tasks | Waits for |
|---|---|---|
| 1 | T-01 | None |

---

## 3. Consistency Check

- Las tareas coinciden con la lista del diseño (solo T-01, mismos criterios y dependencias).
- Cada criterio está entregado por T-01, salvo AC-05.2, que el diseño asigna a la fase Document (aprobado en H-03).
- T-01 nombra qué entrega, su pila y sus archivos, e implementa C-01, C-02 e IF-01.
- No hay dependencias ni tareas en paralelo.

- **Consistency:** Clean
- **Issues:** None

---

## 4. Maintenance Guidelines

This document MUST remain aligned with the approved design and the requirements.

Bump `version` on every change, and keep `upstream` pointing to the versions of the design and the requirements it is built from. When either of them changes, check this plan again: confirm it by updating `upstream`, or revise it.

The plan has no approval of its own: its status becomes `checked` once it passes the consistency check. A change that would alter the approved design is a change to the design, and goes back to the human through it.

### Source of Truth

- This document is the canonical reference for how each task is approached.
- The design defines the approach and the task list; this plan details it and never changes it.
- The requirements define the acceptance criteria each task delivers.
- The feature's state record tracks the status of each task during Build.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
