---
artifact: design
feature: F002
status: approved
version: 2
upstream: [brief.md@1, requirements.md@1]
---

# Design: Producción rechaza la contraseña de administrador por defecto

> Describes how a feature will be built: the components and interfaces it adds or changes, its data, the technologies it uses, how it meets its qualities and handles failure, and the tasks that will build it.
> Once approved, it is the approach every task is built and reviewed against. It must meet the approved requirements; it never changes them.
> Describe the feature's change to the system, not the whole system: the architecture description holds the system as a whole and is brought up to date in Document.

---

## Conventions

Every component and interface is defined by a heading that starts with its ID:

- Components: `### C-01: [Name]`
- Interfaces: `### IF-01: [Name]`

Each one names, in its **Covers** field, the requirements and non-functional requirements it serves. Every requirement and non-functional requirement MUST be covered by at least one component or interface.

IDs MUST remain stable once referenced by other artifacts. A withdrawn item keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Assumption (`ASM`), open-question (`OQ`) and risk (`RISK`) IDs continue the numbering already used in the feature's brief and requirements.

---

## 1. Context

Estado actual, comprobado en el código el 2026-11-01:

- **`backend/app/core/settings.py`:** `Settings` (pydantic-settings) declara `admin_password: str = "ChangeMe123!"` y un único validador `validate_production_secrets` (`model_validator(mode="after")`) que, si `is_production`, exige `len(secret_key) >= 32` y, si no, lanza `ValueError` con un mensaje en español. `ADMIN_PASSWORD` no se valida. No hay otra validación de producción.
- **Punto de arranque:** `backend/app/main.py` ejecuta `app = create_app()` al importar el módulo, y `create_app()` llama a `get_settings()` (con `lru_cache`). Un `Settings` inválido hace fallar la importación, antes de que uvicorn acepte peticiones y antes del `lifespan`, que es donde se tocan la base y `seed_admin_user`. Por eso la regla no puede depender de la base (AC-01.3).
- **Tests:** `backend/tests/test_api.py` fija `ADMIN_PASSWORD=ChangeMe123!` con `monkeypatch.setenv` y no define `ENVIRONMENT`, así que corren en `development` y la regla no les afecta (NFR-02). No existe ningún test de `Settings` ni de su validación de producción.
- **Documentación:** el README menciona `ADMIN_PASSWORD` en el paso 3 de la guía de inicio (línea 22) y en la tabla de variables (línea 160).

Hallazgo de la sonda de Design (pydantic 2.13, ejecutada con `uv run`): un `ValueError` lanzado desde un `model_validator` de `Settings` se muestra como `ValidationError` con `input_value={...}`, y ese diccionario incluye `admin_password: 'ChangeMe123!'` cuando la variable está definida. Con `hide_input_in_errors=True` en `model_config`, el mismo error se muestra sin `input_value`. Esto condiciona el diseño (C-01, ver 9.1).

Se aplican `architecture.md` 6.5 (configuración y secretos) y 9.2 (brecha que se cierra en Document). No hay ADR existentes que afecten a la feature (`docs/adr/` no existe).

Restricciones: CON-01 (español, NC-009), CON-02 (solo mediante `Settings`, NC-003) y CON-03 (sin dependencias, NC-008) del brief; NC-005, NC-006, NC-007 y EP-001 a EP-006 de la constitución. No se usa ninguna tecnología nueva ni se cambia ninguna fijada en `stack.yaml`.

---

## 2. Overview

La validación de producción de `Settings` gana una segunda comprobación junto a la de `SECRET_KEY`: si el entorno es producción y `admin_password` es el valor por defecto, se lanza un `ValueError` en español que nombra `ADMIN_PASSWORD`. El valor por defecto pasa a ser una constante de módulo que usan tanto el campo como la comparación, para que no existan dos copias del literal. `Settings` declara además `hide_input_in_errors=True`, de modo que el error de pydantic no imprima el contenido de la configuración.

El flujo es el ya existente: `create_app()` → `get_settings()` → `Settings()` → validador. Si falla, la importación de `app.main` lanza `ValidationError` y el proceso termina antes de aceptar peticiones. No se añade ninguna capa, ningún endpoint ni ningún acceso a la base.

```text
Settings() ──► validate_production_secrets
                 ├─ producción y SECRET_KEY < 32      ──► ValueError (ya existe)
                 ├─ producción y ADMIN_PASSWORD == DEFAULT_ADMIN_PASSWORD ──► ValueError (nuevo)
                 └─ otro caso                          ──► Settings válido
```

---

## 3. Components

### C-01: Validación de producción de `Settings`

- **Responsibility:** Rechazar al cargar la configuración, en producción, el valor por defecto de `ADMIN_PASSWORD`, sin imprimir contraseñas.
- **Covers:** REQ-01, REQ-02, REQ-03, REQ-04, NFR-01
- **Status:** Changed
- **Owns:** `DEFAULT_ADMIN_PASSWORD` (constante en `backend/app/core/settings.py`), la comprobación y su mensaje, y la opción `hide_input_in_errors`.
- **Depends on:** pydantic-settings (ya en uso). No depende de la base ni de otros componentes.
- **On failure:** Si la comprobación falla, lanza `ValueError`, que pydantic envuelve en `ValidationError`; `create_app()` no la captura y el proceso no arranca.

### C-02: Documentación de la variable en el README

- **Responsibility:** Decir, en la guía de inicio y en la tabla de variables del README, que en producción `ADMIN_PASSWORD` no puede ser `ChangeMe123!`.
- **Covers:** REQ-05 (AC-05.1)
- **Status:** Changed
- **Owns:** Las líneas del README que describen `ADMIN_PASSWORD`.
- **Depends on:** C-01, que fija el comportamiento descrito.
- **On failure:** No aplica; si el README discrepa del comportamiento, Verify lo detecta al contrastarlos.

AC-05.2 (los archivos de `.sdd/`) no es un componente de la feature: lo entrega la fase Document (ver 11 y 12).

`docs/behaviour/` (impacto documental de `decisions.md`, sección 4): `deployment.md` describe Docker y Compose, y `auth.md` cita `ADMIN_PASSWORD` solo para el administrador inicial; ninguno describe la configuración de producción, así que T-01 no los cambia. Document comprueba si alguno debe recoger el rechazo y lo registra en `decisions.md`.

---

## 4. Interfaces

### IF-01: Carga de `Settings`

- **Kind:** Internal
- **Covers:** REQ-01, REQ-02, REQ-03, REQ-04, NFR-01
- **Provided by:** C-01
- **Used by:** `create_app()` y todo el código que llama a `get_settings()`; Alembic y el seed, indirectamente.
- **Operations:** `Settings()` o `get_settings()`, con las variables de entorno y `backend/.env`.
  - **Entrada relevante:** `ENVIRONMENT` y `ADMIN_PASSWORD` (con valor por defecto si falta).
  - **Salida:** un `Settings`, o `ValidationError` con un solo mensaje en español.
  - **Errores nuevos:** `ENVIRONMENT=production` y `ADMIN_PASSWORD` igual a `ChangeMe123!` (fijado o implícito). Mensaje: nombra `ADMIN_PASSWORD`, dice que en producción no puede usarse el valor por defecto y que hay que definir otra contraseña; no incluye ningún valor de contraseña.
- **Guarantees:** La comparación es exacta: distingue mayúsculas y no recorta espacios (ASM-01). Si fallan a la vez `SECRET_KEY` y `ADMIN_PASSWORD`, el error nombra solo la primera que se comprueba, `SECRET_KEY` (ASM-03). La comprobación no abre conexiones ni lee la base. El error no contiene el valor de ninguna variable de configuración.
- **Compatibility:** En `development` y `test` nada cambia. En producción, un derivado con el valor por defecto deja de arrancar (RISK-01, aceptado en Q-03). El `ValidationError` del error ya existente de `SECRET_KEY` pierde el fragmento `input_value=...` por `hide_input_in_errors`; el texto del mensaje es el mismo y ningún test ni código lo consulta (comprobado con `grep` en `backend/`).

---

## 5. Data

La feature no introduce ni cambia datos, y no necesita migración Alembic. No cambia ningún administrador ya creado en la base (brief 5.2): la regla actúa sobre la configuración y no mira la base.

---

## 6. Technologies

- **From the stack:** `validation-and-settings` (Pydantic + pydantic-settings, 2.13.4 / 2.14.1) para el validador y `hide_input_in_errors`; `backend-testing` (pytest) para los tests.
- **New:** ninguna (CON-03). No se añade ninguna entrada a `stack.yaml`.
- **Skills:** del catálogo, `superpowers:test-driven-development` (EP-004, fase build) para escribir primero los tests que fallan. `superpowers:systematic-debugging` si falla algún test. No hay skill de FastAPI ni de pydantic (brecha conocida del catálogo); la guía está en `docs/backend-standards.md`.

---

## 7. Qualities

- **NFR-01 (el valor de la contraseña no se imprime):** el mensaje del validador no contiene ningún valor, y `hide_input_in_errors=True` impide que pydantic añada `input_value` con el contenido de la configuración. Verified by: un test que fija `ADMIN_PASSWORD=ChangeMe123!` en producción y comprueba que `str(error)` no contiene `ChangeMe123!` (AC-02.2), más la inspección de la salida real de `uv run uvicorn app.main:app` en Verify.
- **AC-01.3 y el fallo al arrancar (REQ-01):** la regla vive en `Settings`, que `create_app()` carga al importar `app.main`, antes del `lifespan`. Verified by: un test que fija producción, `SECRET_KEY` válida, `ADMIN_PASSWORD` por defecto y un `DATABASE_URL` que apunta a un puerto sin servidor, y comprueba que `create_app()` lanza `ValidationError` sin intentar conectar (con la base, ni creada ni sin responder, el resultado es el mismo); y en Verify, el arranque real con `uv run uvicorn app.main:app` en producción, que debe terminar antes de abrir el puerto y con el mensaje de REQ-02.
- **NFR-02 (compatibilidad con las pruebas existentes):** la regla solo actúa con `ENVIRONMENT=production`, que los tests existentes no usan. Verified by: la suite completa, `cd backend && uv run pytest -q`, con PostgreSQL; resultado esperado 87 de 87 más los tests nuevos, sin editar los valores de `ADMIN_PASSWORD` ni de `ENVIRONMENT` de los existentes.

---

## 8. Failure Modes

| Failure | How it is detected | What the system does | How it recovers |
|---|---|---|---|
| Producción con `ADMIN_PASSWORD` por defecto, fijado o implícito | `ValidationError` al importar `app.main` | El proceso termina antes de aceptar peticiones, con un mensaje en español que nombra `ADMIN_PASSWORD` | El mantenedor define otra contraseña en el entorno o en `backend/.env` y reinicia |
| Producción con `SECRET_KEY` corta y `ADMIN_PASSWORD` por defecto | Igual | El mensaje nombra solo `SECRET_KEY` (ASM-03) | El mantenedor corrige la primera, reintenta, y recibe el aviso de la segunda |
| `ENVIRONMENT` con un valor distinto de `production` (p. ej. se deja el valor por defecto `development`) en un despliegue real | No se detecta: la regla no se aplica | La aplicación arranca con la contraseña por defecto | Fuera de alcance (RISK-02): `ENVIRONMENT` ya solo admite tres valores; hacer producción el valor por defecto sería otro cambio |
| Un derivado ya desplegado actualiza y no cambia la contraseña | Igual que la primera fila | No arranca | Igual que la primera fila; el README lo explica (REQ-05) |
| Un cambio futuro de pydantic vuelve a mostrar `input_value` | Test de AC-02.2 | El test falla | Se corrige la configuración del error antes de integrar |

---

## 9. Decisions

- **ADRs:** ninguna. La decisión de que producción rechace un valor por defecto sigue el patrón ya existente para `SECRET_KEY` (PR-003), es reversible y local a un archivo, así que no es arquitectónicamente significativa.
- **Human decisions:** Q-02 (solo el valor por defecto) y Q-03 (siempre se rechaza, sin mirar la base), ya recogidas en el brief y los requirements. Ningún one-way door nuevo: no se toca la pila, los datos, el despliegue, la identidad ni una interfaz externa.
- **Research:** ninguna nota. La única incógnita (cómo muestra pydantic el error) se resolvió con la sonda descrita en 1, y no responde a una elección entre opciones.

### 9.1 Alternatives Considered

- **Ocultar la entrada del error:** `hide_input_in_errors=True` en `Settings`. Alternativas descartadas: (a) *no ocultarla*: incumple AC-02.2 y NFR-01 cuando el valor está definido, comprobado con la sonda; (b) *capturar el `ValidationError` en `create_app()` y reescribirlo*: añade un manejo de errores en el arranque que hoy no existe y hace que un `Settings()` fuera de `create_app()` (Alembic, tests) siga filtrando; (c) *un validador de campo en `admin_password`*: pydantic muestra el valor del propio campo como `input_value`, así que filtraría igual.
- **Dónde comprobar:** en el validador existente, junto a `SECRET_KEY`. Alternativas descartadas: un validador nuevo (dos puntos de validación de producción, en contra de CON-02) y una comprobación en `seed_admin_user` o en el `lifespan` (depende de la base, incumple AC-01.3 y Q-03).
- **Valor por defecto:** una constante `DEFAULT_ADMIN_PASSWORD` usada por el campo y por la comparación. Alternativa descartada: repetir el literal `"ChangeMe123!"` en dos sitios, que puede divergir.
- **Un error o varios:** un solo error, comprobando primero `SECRET_KEY` (ASM-03). Alternativa descartada: acumular los dos mensajes; complica el validador por un caso que el mantenedor ya aceptó.
- **Ubicación de los tests:** un archivo nuevo `backend/tests/test_settings.py`. Alternativa descartada: añadirlos a `test_api.py`, que es un archivo grande de pruebas de endpoints con PostgreSQL; los tests de `Settings` no necesitan la base.

---

## 10. Assumptions, Open Questions, and Risks

Los ASM-01 a ASM-03 y los RISK-01 y RISK-02 del brief y de los requirements siguen vigentes y no se repiten. Se continúa la numeración.

### ASM-04: Los tests de `Settings` se aíslan del entorno y de `backend/.env`

- **Basis:** `Settings` lee `backend/.env`, que existe en el clon del mantenedor y puede definir `ADMIN_PASSWORD` o `ENVIRONMENT`.
- **Impact if incorrect:** Un test podría pasar o fallar según el `.env` local. El diseño lo evita: los tests construyen `Settings(_env_file=None)` y borran con `monkeypatch.delenv` las variables que el caso no fija.
- **Status:** Unverified

### ASM-05: Ningún código ni test consulta el texto completo del `ValidationError` de `Settings`

- **Basis:** `grep` de `SECRET_KEY` y `input_value` en `backend/` y `docs/` (2026-11-01) no encuentra ninguna dependencia del formato.
- **Impact if incorrect:** Quitar `input_value` del error afectaría a ese consumidor. Se descubriría con la suite completa (NFR-02).
- **Status:** Unverified

### RISK-03: La sonda se hizo con una subclase de prueba, no con `Settings` real

- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** El test de AC-02.2 se ejecuta contra `Settings` real, y Verify inspecciona la salida de arrancar la aplicación. Si `hide_input_in_errors` no bastara, la tarea se detiene y se revisa el diseño (9.1, opción b).

---

## 11. Task List

Un solo comportamiento observable en un archivo de producción y un archivo de tests nuevo: camino pequeño, una tarea (Q-01, EP-007).

| Task | Delivers | Acceptance criteria | Technologies | Depends on |
|---|---|---|---|---|
| T-01 | Rechazo en producción del `ADMIN_PASSWORD` por defecto en `Settings`, con sus tests y la descripción en el README | AC-01.1, AC-01.2, AC-01.3, AC-02.1, AC-02.2, AC-03.1, AC-03.2, AC-04.1, AC-04.2, AC-05.1 | validation-and-settings, backend-testing | None |

AC-05.2 (`architecture.md`, `product.md`, `roadmap.md` y NC-007) no lo entrega ninguna tarea: son archivos de `.sdd/` que solo cambia la fase Document, y no pueden cambiar antes de que el comportamiento esté construido y verificado. Document los alinea y Verify comprueba que sigue pendiente de ella.

---

## 12. Traceability and Coverage

- REQ-01: C-01 (IF-01). AC-01.1, AC-01.2 y AC-01.3, en T-01.
- REQ-02: C-01 (IF-01). AC-02.1 y AC-02.2, en T-01.
- REQ-03: C-01 (IF-01). AC-03.1 y AC-03.2, en T-01.
- REQ-04: C-01 (IF-01). AC-04.1 y AC-04.2, en T-01.
- REQ-05: C-02 (AC-05.1, en T-01) y la fase Document (AC-05.2).
- NFR-01: C-01 (7). NFR-02: C-01 (7), verificada con la suite completa.
- CON-01 a CON-03: respetadas (3, 6, 9.1). Ningún componente existe sin requisito.

- **Coverage gaps:** AC-05.2 no tiene tarea: lo entrega la fase Document, de forma explícita (sección 11). Es la única desviación de la regla «cada criterio, una tarea», y se somete a la aprobación del mantenedor.
- **Unresolved dependencies:** None

---

## 13. Maintenance Guidelines

This document MUST remain aligned with the approved requirements and with the way the feature is actually being built.

Bump `version` on every change made after the first review or approval, and keep `upstream` pointing to the versions of the brief and the requirements it is built from. When either of them changes, check this design again: confirm it by updating `upstream`, or revise it.

A change to the approved approach MUST be approved again by the human. Every artifact that lists an older version of this document in its `upstream` becomes stale and MUST be checked again.

### Source of Truth

- This document is the canonical reference for how the feature is built.
- The requirements define what the feature must do; this design meets them and never changes them.
- The plan defines each task in detail; the task list here is its approved overview.
- ADRs record the significant decisions; `stack.yaml` records the technologies; `architecture.md` describes the system as a whole.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
