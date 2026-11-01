---
artifact: evidence
feature: F002
run: 1
commit: feae99c
date: 2026-11-01
result: pass
upstream: [requirements.md@1, design.md@2, plan.md@1]
---

# Evidence: Producción rechaza la contraseña de administrador por defecto

> Records what the full check of a feature showed: the checks that ran and their results, which test proves each acceptance criterion, how each quality was verified, and what failed.
> It is the evidence the feature review and the human judge the feature on. It states what was observed, never what was expected.
> Each Verify run replaces this file with the next run number; earlier runs remain in the repository's history.

---

## 1. Checks

Ejecutadas en la rama `feature/002-admin-password-defecto`, commit `feae99c`, con un `postgres:15` desechable en `127.0.0.1:55432` (no el contenedor de otro proyecto).

| Check | Command | Result | Notes |
|---|---|---|---|
| Suite de backend | `cd backend && uv run python -m pytest -q` (con `TEST_DATABASE_ADMIN_URL` hacia el puerto 55432) | Pass | 100 passed, 3 warnings de `slowapi` (`asyncio.iscoroutinefunction`, ajenos a la feature). 54 de `test_api.py`, 33 de `test_rename_project.py`, 13 de `test_settings.py` |
| Lint del frontend | `cd frontend && npm run lint` | Pass | Sin salida de errores |
| Tests del frontend | `cd frontend && npm run test` | Pass | 6 archivos, 24 tests |
| Build del frontend | `cd frontend && npm run build` | Pass | `vite build` correcto, 64 módulos |
| Arranque real, valor por defecto fijado | `ENVIRONMENT=production`, `SECRET_KEY` de 64 caracteres, `ADMIN_PASSWORD=ChangeMe123!`, base alcanzable, `uv run python -m uvicorn app.main:app` | Pass | Salida con código 1 antes de aceptar peticiones: `ValidationError ... Value error, ADMIN_PASSWORD no puede ser el valor por defecto en producción. Define otra contraseña en la variable ADMIN_PASSWORD.` |
| Arranque real, valor por defecto implícito | Igual, con `ADMIN_PASSWORD` fuera del entorno | Pass | Código 1 con el mismo error |

`uv run uvicorn ...` falló en esta máquina con `uv trampoline failed to canonicalize script path`; se usó `uv run python -m uvicorn`, equivalente.

### 1.1 Known Failures

Ninguno: la línea base de Build era de 87 tests en verde y el estado no registra fallos previos.

---

## 2. Traceability

Los tests están en `backend/tests/test_settings.py` y llevan el ID completo en su docstring. Todos pasaron en esta ejecución.

| Requirement | Acceptance criterion | Components and interfaces | Tasks | Tests | Result |
|---|---|---|---|---|---|
| REQ-01 | AC-01.1 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_01_1_production_rejects_explicit_default | Pass |
| REQ-01 | AC-01.2 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_01_2_production_rejects_implicit_default | Pass |
| REQ-01 | AC-01.3 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_01_3_create_app_fails_without_database | Pass |
| REQ-02 | AC-02.1 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_02_1_message_in_spanish_names_variable | Pass |
| REQ-02 | AC-02.2 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_02_2_message_does_not_print_password | Pass |
| REQ-03 | AC-03.1 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_03_1_production_accepts_other_password | Pass |
| REQ-03 | AC-03.2 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_03_2_variants_are_accepted (parametrizado: `changeme123!` y `ChangeMe123! `) | Pass |
| REQ-04 | AC-04.1 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_04_default_allowed_outside_production (parametrizado) | Pass |
| REQ-04 | AC-04.2 | C-01, IF-01 | T-01 | test_settings.py::test_f002_ac_04_default_allowed_outside_production (parametrizado) | Pass |
| REQ-05 | AC-05.1 | C-02 | T-01 | Sin test: el plan lo verifica leyendo el README. `git diff main -- README.md` muestra el paso 3 de la guía de inicio y la fila `ADMIN_PASSWORD` de la tabla con el texto "con `ENVIRONMENT=production` no puede ser `ChangeMe123!`" | Pass (inspección) |
| REQ-05 | AC-05.2 | — | — (Document) | El diseño la asigna a la fase Document (aprobado en H-03); aún no se ha ejecutado | Not applicable en Verify |
| — | ASM-03 | C-01 | T-01 | test_settings.py::test_f002_asm_03_short_key_and_default_password_names_secret_key | Pass |

---

## 3. Qualities

| NFR | How it was verified | Target | Measured | Result |
|---|---|---|---|---|
| NFR-01 | Test AC-02.2 e inspección de la salida de uvicorn en los dos arranques rechazados | Cero apariciones de un valor de contraseña | Test en verde. En las dos salidas capturadas, `grep -c ChangeMe123` dio 0 y la `SECRET_KEY` generada tampoco aparece. El error solo nombra `ADMIN_PASSWORD` | Pass |
| NFR-02 | Suite completa y `git diff main --stat -- backend/tests/test_api.py` | 87 de 87 tests en verde, sin cambios en los valores de los tests | 100 passed (87 existentes más 13 nuevos). `test_api.py` no aparece en el diff contra main | Pass |

### 3.1 Unverified Qualities

Ninguna.

---

## 4. What Failed

Ningún check, criterio ni calidad ha fallado.

---

## 5. Limits

- **Arranque completo con otra contraseña (REQ-03):** se intentó con uvicorn (`ADMIN_PASSWORD=Otra-Clave-Segura-9x`, base `f002_verify`) y no se completó: la configuración se cargó y el arranque llegó a conectar, pero falló con `InvalidCatalogNameError: database "f002_verify" does not exist`, por un error de mi preparación (la base no existía). No se pudo repetir porque el clasificador de permisos denegó crear la base. No es un check del proyecto y no se cuenta como pasado: AC-03.1 lo prueba en test, y esta ejecución solo muestra que la validación de `Settings` se superó.
- **AC-01.3 con el administrador ya creado:** el test cubre una base que no responde. En el arranque real la base respondía pero estaba vacía; no se probó con el administrador existente.
- **Arranque implícito y `backend/.env`:** una regla de denegación impide leer `backend/.env`, así que no se comprobó su contenido. El arranque se rechazó, lo que indica que ese archivo no fija otra `ADMIN_PASSWORD`.
- **`docker compose build backend`:** no se ejecutó, porque la feature no toca el Dockerfile ni el frontend.
- **E2E con Playwright y `curl`:** no aplican, porque la feature no cambia endpoints ni frontend.
- **AC-05.2** queda para Document.
- **Salida con acentos:** la consola de Windows mostró `producci?n` en el archivo capturado, un efecto de la codificación de la consola, no del mensaje.

---

## 6. Maintenance Guidelines

This document records one Verify run. It is never edited after the run; the next run replaces it, with the next run number and the commit it checked.

- `result` is `pass` only when every check passes with no failure beyond the known ones, every acceptance criterion has a passing test, and every quality passes or is put to the human as unverified.
- Record what was observed. Never mark something as passing that was not run.

### Source of Truth

- This document is the canonical record of what the full check observed.
- The feature review judges the feature against the requirements, the design, and this evidence; its verdict is in its own review file.
- The requirements define the acceptance criteria and the qualities; this document never changes them.
