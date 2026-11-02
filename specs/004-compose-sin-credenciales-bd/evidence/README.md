---
artifact: evidence
feature: F004
run: 1
commit: 0158d381bba20bb857d72675d2b3f9575d08aa8a
date: 2026-11-02
result: fail
upstream: [requirements.md@2, design.md@2, plan.md@1]
---

# Evidence: Compose sin credenciales fijas de base de datos

> Registro de la run 1 de Verify sobre `feature/004-compose-sin-credenciales-bd` en el commit `0158d38`. Dice lo observado, no lo esperado. Todo lo ejecutado pasa; el resultado es `fail` solo por la regla de trazabilidad (sección 4, fallo 1), que el mantenedor debe resolver.

---

## 1. Checks

Entorno: Windows 11, PowerShell, Docker 29.7.2 y Compose v5.4.0. Los casos de Compose usan el proyecto `f004-verify` (volumen `f004-verify_postgres_data`), no el volumen `fastapitemplate_postgres_data` del mantenedor. Las contraseñas válidas son aleatorias, viven solo en variables de proceso o en un `.env` temporal, y no se escriben aquí. Antes y después se comparó `docker ps -a` y `docker volume ls`: sin diferencias.

| Check | Command | Result | Notes |
|---|---|---|---|
| Suite de backend con la variable apuntando a PostgreSQL de Compose | `run-suite.ps1` (levanta `postgres` con `-p f004-verify`, `python -m pytest -q` del `.venv`, `down -v`) | Pass | 103 passed, 3 warnings (`slowapi`, `asyncio.iscoroutinefunction`), 34 s. Bases `fastapi_template_test_*` sobrantes: 0 |
| Suite de backend sin `TEST_DATABASE_ADMIN_URL` | `.venv\Scripts\python.exe -m pytest -q` | Pass (comportamiento esperado) | 51 passed, 52 fallan (49 errors y 3 failed), 15 s. Los 52 usan la base de datos; ninguno se omite; el mensaje nombra la variable |
| Tests que no usan la base de datos, sin la variable | `pytest tests/test_settings.py tests/test_rename_project.py -q` | Pass | 47 passed |
| Lint del frontend | `cd frontend && npm run lint` | Pass | Sin avisos |
| Tests del frontend | `cd frontend && npm run test` | Pass | Exit 0 |
| Build del frontend | `cd frontend && npm run build` | Pass | Construido en 794 ms |
| Frontend sin cambios | `git diff main --stat -- frontend` | Pass | Vacío: la feature no toca el frontend |
| Ruff (`ruff check`, `ruff format --check`) | `.venv\Scripts\python.exe -m ruff ...` | No ejecutado | `No module named ruff`: el linter solo está en `.pre-commit-config.yaml`. Ver límites |

`uv run pytest -q` (el comando de `CLAUDE.md`) no se pudo usar: `uv.exe` falla con `uv trampoline failed to canonicalize script path`, también desde PowerShell. Se usó el Python del `backend\.venv`, que es lo que ejecuta `uv run`.

### 1.1 Known Failures

Ninguno: `known-failures: []` en el registro de estado. Línea base de Build: 101 passed; ahora 103 (los 2 casos parametrizados de `test_temporary_database_exige_admin_url`).

---

## 2. Traceability

Solo AC-06.1 y AC-06.2 tienen un test automático que nombra su ID (`backend/tests/test_api.py::test_temporary_database_exige_admin_url`, docstring `F004:AC-06.1 F004:AC-06.2`, dos casos, ambos pasan). Los otros 15 criterios no tienen un test que los nombre: el diseño y el plan fijaron como prueba la ejecución real de Compose o la inspección, y esto se verificó así. Por la regla de esta fase, esos 15 son un fallo (sección 4, fallo 1). Como en F003 (run 1, H-06), se pone al mantenedor en H-08.

| Requirement | Acceptance criterion | Components and interfaces | Tasks | Tests | Result |
|---|---|---|---|---|---|
| REQ-01 | AC-01.1 | C-02, IF-01 | T-01 | Ejecución: `docker compose up` sin variable ni `.env`. Exit 1, sin contenedores ni volumen del proyecto, mensaje en español que nombra `POSTGRES_PASSWORD` y el `.env` de la raíz | No test (ejecución: Pass) |
| REQ-01 | AC-01.2 | C-02, IF-01 | T-01 | Ejecución con `POSTGRES_PASSWORD=` vacía: mismo resultado que AC-01.1 | No test (ejecución: Pass) |
| REQ-02 | AC-02.1 | C-01, IF-01 | T-01 | Ejecución con 15 caracteres (`CANARIO-F004-xx`), sin `-d` y con `-d`. Exit 1; `postgres` y `backend` en `Created`; volumen vacío (0 entradas); mensaje con el mínimo de 16. Con `-d` el mensaje está en `docker compose logs postgres-check` | No test (ejecución: Pass) |
| REQ-02 | AC-02.2 | C-01, IF-01 | T-01 | Ejecución con `postgres`: mismo resultado que AC-02.1 (volumen con 0 entradas) | No test (ejecución: Pass) |
| REQ-02 | AC-02.3 | C-01, C-02 | T-01 | Ejecución con 16 caracteres exactos y volumen nuevo: `up --build -d --wait` exit 0, `/health` 200 `{"status":"ok"}`, backend y postgres `healthy` | No test (ejecución: Pass) |
| REQ-02 | AC-02.4 | C-01, C-02 | T-01 | Ejecución: rechazo con 15 caracteres y `-d`, luego contraseña válida y `up --build -d --wait` sin borrar nada: exit 0 y `/health` 200 | No test (ejecución: Pass) |
| REQ-03 | AC-03.1 | C-02 | T-01 | Ejecución con contraseña válida y volumen nuevo: `/health` 200; contraseña válida entra desde `127.0.0.1:5432` (`select 'login-ok'`); `postgres` rechazada con `password authentication failed` | No test (ejecución: Pass) |
| REQ-04 | AC-04.1 | C-02, C-03, IF-01 | T-01 | Ejecución con la contraseña solo en `.env` de la raíz y sin variable de shell: exit 0, `/health` 200, backend `healthy` | No test (ejecución: Pass) |
| REQ-05 | AC-05.1 | C-02, C-03 | T-01 | Inspección: `postgres:postgres` 0 apariciones en `docker-compose.yml`, `.example.env` y `backend/.example.env`; la única contraseña con valor es `ADMIN_PASSWORD=ChangeMe123!` (administrador de la aplicación, no de PostgreSQL). `POSTGRES_PASSWORD` solo aparece como `${POSTGRES_PASSWORD:?...}` o vacía | No test (inspección: Pass) |
| REQ-05 | AC-05.2 | C-03 | T-01 | Ejecución con `.example.env` copiado a `.env` sin editar: exit 1, sin contenedores ni volumen, mensaje que dice dónde poner la contraseña | No test (ejecución: Pass) |
| REQ-06 | AC-06.1 | C-04, IF-02 | T-02 | `test_api.py::test_temporary_database_exige_admin_url[sin-definir]` y `[vacia]` (nombran `F004:AC-06.1`), pasan. Además, la suite real sin la variable: 52 de 103 tests fallan con `RuntimeError` que nombra `TEST_DATABASE_ADMIN_URL`, ninguno omitido | Pass |
| REQ-06 | AC-06.2 | C-04, IF-02 | T-02 | Los mismos tests (nombran `F004:AC-06.2`; `asyncpg.connect` sustituido por una función que hace fallar el test, no se llama). Además, ejecución con un segundo PostgreSQL desechable en `127.0.0.1:5432` con `postgres:postgres`: tras la suite sin variable, bases `postgres, template0, template1` (sin base nueva) y ninguna conexión TCP en su log (`log_connections=on`) | Pass |
| REQ-06 | AC-06.3 | C-04 | T-02 | Suite completa con `TEST_DATABASE_ADMIN_URL` hacia PostgreSQL de Compose: 103 passed, 0 bases sobrantes. Sin test que nombre el ID | No test (ejecución: Pass) |
| REQ-06 | AC-06.4 | C-04 | T-02 | Sin la variable, `test_settings.py` y `test_rename_project.py`: 47 passed. Sin test que nombre el ID | No test (ejecución: Pass) |
| REQ-07 | AC-07.1 | C-05 | T-03 | Ejecución del inicio rápido del README (copiar ambos ejemplos, definir `POSTGRES_PASSWORD` con el generador del README, `up --build -d --wait`): exit 0 y `/health` 200 | No test (ejecución: Pass) |
| REQ-07 | AC-07.2 | C-05 | T-03 | Ejecución: volumen creado con A y contraseña B en el `.env`: backend no conecta (`InvalidPasswordError`, confirma ASM-03). Salida 1 (`down -v` y `up --build`): `/health` 200. Salida 2 (cambiar la contraseña en la base y arrancar): `/health` 200. Ver desviaciones en la sección 5 | No test (ejecución: Pass, con desviaciones) |
| REQ-07 | AC-07.3 | C-05 | T-03 | Ejecución del apartado Tests del README: `TEST_DATABASE_ADMIN_URL` hacia la base de Compose con su contraseña, suite completa: 103 passed (misma ejecución que AC-06.3) | No test (ejecución: Pass) |

---

## 3. Qualities

| NFR | How it was verified | Target | Measured | Result |
|---|---|---|---|---|
| NFR-01 | Cada caso de rechazo con una cadena reconocible en la salida completa y en `docker compose logs postgres-check` | 0 apariciones del valor recibido | AC-01.1 y AC-01.2: sin valor que repetir, mensaje sin contraseña. AC-02.1 con `CANARIO-F004-xx`: 0 apariciones. AC-02.2: el mensaje contiene la palabra `postgres` como regla, que coincide con el valor recibido, así que la búsqueda no puede distinguirlos (el mensaje imprime la regla fija, no lee el valor). AC-06.1: canario en una variable de entorno no relacionada, 0 apariciones en la salida de la suite | Pass (con la salvedad de AC-02.2) |
| NFR-02 | Los casos de SC-02 desde PowerShell en Windows; Linux, si hay entorno | Mismo resultado en ambos entornos | Windows/PowerShell: todos los casos de REQ-01 a REQ-04 dan el resultado esperado, incluido un caso con 15 caracteres no ASCII (30 bytes): rechazado, conteo en caracteres (ASM-06). Linux: no hay entorno | Unverified (Linux) |

### 3.1 Unverified Qualities

- NFR-02: sin un entorno Linux, solo se verificó en Windows. Decision: H-09

---

## 4. What Failed

### Failure 1: 15 criterios de aceptación no tienen un test que nombre su ID

- **Concerns:** AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-02.4, AC-03.1, AC-04.1, AC-05.1, AC-05.2, AC-06.3, AC-06.4, AC-07.1, AC-07.2, AC-07.3
- **Observed:** `grep` de `AC-0x.y` en `backend/tests` solo encuentra `F004:AC-06.1` y `F004:AC-06.2`. Los otros 15 se comprobaron con ejecuciones reales de Compose, inspección o la suite completa, todas con resultado correcto (sección 2), pero ningún test automático nombra su ID.
- **Expected:** Cada criterio tiene al menos un test que nombra su ID completo y pasa.
- **Likely cause (inferencia):** `design.md@2` y `plan.md@1` fijaron un procedimiento ejecutado para los criterios de Compose y del README, porque un test de pytest no puede arrancar Compose; AC-06.3 y AC-06.4 son propiedades de la suite entera. Es la misma situación que F003 resolvió en H-06 aceptando el procedimiento como prueba.
- **Lies in:** The design or the plan

---

## 5. Limits

- **Ruff:** `ruff check` y `ruff format --check` no se ejecutaron: no está instalado en el `.venv` y `uv` no funciona en este equipo. El linter del backend solo está en pre-commit; si el repositorio lo ejecuta al hacer commit, los commits de la rama ya lo habrán pasado, pero esta run no lo comprobó.
- **`uv run`:** no se pudo ejecutar (`uv trampoline failed to canonicalize script path`); se usó el Python del `.venv` con las mismas dependencias.
- **AC-07.2, salida 2:** `\password` de `psql` pide la contraseña por la terminal y no se puede ejecutar sin una terminal interactiva. Se usó `ALTER USER postgres PASSWORD ...` por stdin, que cambia la contraseña igual pero no es el comando literal del README. Además, en esa ejecución el backend estaba parado cuando se cambió la contraseña, así que el paso «reiniciar el backend si no se reconecta» no se ejercitó con el backend en marcha.
- **AC-07.1:** se siguió el inicio rápido con `up --build -d --wait` en lugar de `up --build` en primer plano, para poder medir el estado; la configuración es la misma.
- **Linux:** NFR-02 no verificado en Linux (sección 3.1).
- **`docker compose config`:** no se usó, para no imprimir la contraseña interpolada (riesgo del plan).
- **Puerto 5432:** Windows mostró entradas fantasma en `LISTENING` con PID 0 tras la suite (restos de conexiones); se comprobó que ningún proceso real lo ocupaba antes de cada caso que lo publica.
- **Prueba de la regla de permisos:** la primera ejecución de la suite contra Compose fue denegada por el clasificador y se repitió después de que el mantenedor añadiera una regla de permiso para `run-suite.ps1`. No afecta a los resultados.

---

## 6. Maintenance Guidelines

This document records one Verify run. It is never edited after the run; the next run replaces it, with the next run number and the commit it checked.

- `result` is `pass` only when every check passes with no failure beyond the known ones, every acceptance criterion has a passing test, and every quality passes or is put to the human as unverified.
- Record what was observed. Never mark something as passing that was not run.

### Source of Truth

- This document is the canonical record of what the full check observed.
- The feature review judges the feature against the requirements, the design, and this evidence; its verdict is in its own review file.
- The requirements define the acceptance criteria and the qualities; this document never changes them.
