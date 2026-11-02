---
artifact: evidence
feature: F003
run: 1
commit: 14b4cc5
date: 2026-11-02
result: fail
upstream: [requirements.md@1, design.md@3, plan.md@1]
---

# Evidence: El límite de login se aplica por cliente real tras un proxy

> Registro de la run 1 de Verify sobre `feature/003-limite-login-tras-proxy` en el commit `14b4cc5`. Dice lo observado, no lo esperado.

---

## 1. Checks

| Check | Command | Result | Notes |
|---|---|---|---|
| Tests de backend | `cd backend && uv run python -m pytest -q` | Fail (solo fallos conocidos) | 3 failed, 49 passed, 49 errors, 124 s. Los 3 failed y los 49 errors son `RuntimeError: PostgreSQL de tests no disponible`. Pasan 49 (48 de la línea base + el test nuevo de AC-04.1) |
| Test de AC-04.1 | `uv run python -m pytest -q tests/test_settings.py -k f003 -v` | Pass | 1 passed |
| Lint frontend | `cd frontend && npm run lint` | Pass | Sin avisos |
| Tests frontend | `cd frontend && npm run test` | Pass | 6 archivos, 24 tests |
| Build frontend | `cd frontend && npm run build` | Pass | Construido en 805 ms |
| Build de la imagen | `docker compose -p f003verify up --build -d` (copia temporal del compose, ver sección 3) | Pass | La imagen del `Dockerfile` del repo se construyó y el servicio quedó `healthy` |
| Cambios fuera de la feature | `git diff main --stat -- backend/app` | Pass | Vacío: `limiter.py`, `router.py` y el resto de `backend/app` no cambian |

### 1.1 Known Failures

- `backend pytest: 3 failed y 49 errors por PostgreSQL de tests no disponible`: Still failing, con los mismos 3 failed (`test_alembic_cli_uses_settings_database_url` y las dos variantes de `test_migration_0003_fixes_only_seeded_admin_description`) y 49 errors. Ninguno es de esta feature.
- `frontend limpio`: Still clean.

---

## 2. Traceability

Los criterios AC-01.1 a AC-03.2 no tienen ningún test automático que nombre su ID: el diseño (design.md@3, sección 9.1) eligió un procedimiento ejecutado con Compose en lugar de un test (PR-004). En esta run el procedimiento se repitió entero (sección 3); la columna Tests cita el escenario.

| Requirement | Acceptance criterion | Components and interfaces | Tasks | Tests | Result |
|---|---|---|---|---|---|
| REQ-01 | AC-01.1 | C-01, C-02, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S1 fila 1, 401 x10 y 429 con 11 `X-Forwarded-For` distintos | No test (procedimiento: cumple) |
| REQ-01 | AC-01.2 | C-01, C-02, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S1 fila 2 tras recrear, 401 x10 y 429 | No test (procedimiento: cumple) |
| REQ-02 | AC-02.1 | C-01, C-02, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S2, A 429 en el 11 y B 401 | No test (procedimiento: cumple) |
| REQ-02 | AC-02.2 | C-01, C-02, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S2, A 429 en login 12, token 11 y refresh 21, una conexión nueva por intento | No test (procedimiento: cumple) |
| REQ-02 | AC-02.3 | C-01, C-02, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S3, segundo contenedor `172.25.0.4`, 429 en el 11 | No test (procedimiento: cumple) |
| REQ-03 | AC-03.1 | C-01, C-03, C-05, IF-01 | T-01, T-02 | Sin test que nombre el ID. Procedimiento: S2 (IP sola) y S4 (`172.25.0.0/31`), solo con la variable | No test (procedimiento: cumple) |
| REQ-03 | AC-03.2 | C-01, C-03, C-05, IF-01 | T-02 | Sin test que nombre el ID. Procedimiento: S1 sin la variable | No test (procedimiento: cumple) |
| REQ-04 | AC-04.1 | C-03 | T-01 | `backend/tests/test_settings.py::test_f003_ac_04_1_example_env_shows_forwarded_allow_ips` (nombra `F003:AC-04.1`) | Pass |
| REQ-04 | AC-04.2 | C-04 | T-03 | Inspección, sin test: ver sección 3.2 | Pass (inspección) |

---

## 3. Qualities

Entorno de la run: Docker Server 29.7.2 (Docker Desktop, Windows), proyecto Compose temporal `f003verify` con copia del `docker-compose.yml` en el scratchpad (contexto de build con ruta absoluta, puerto `127.0.0.1:18000:8000`, sin puerto de PostgreSQL, `env_file` a un `.env` temporal copiado de `backend/.example.env`). Red `172.25.0.0/16`, puerta de enlace `172.25.0.1`; segundo contenedor `172.25.0.4`, de la misma imagen del backend con `urllib`. Credenciales inventadas (401 como respuesta normal); cada petición con `Connection: close`; el servicio `backend` se recreó (`up -d --force-recreate --no-deps backend`) antes de cada escenario.

| NFR | How it was verified | Target | Measured | Result |
|---|---|---|---|---|
| NFR-01 | Ejecución contra la aplicación en marcha | AC-01.1, AC-02.1 y AC-02.3 ejecutados con IPs de origen distintas | Los tres ejecutados, con origen host y segundo contenedor (resultados abajo) | Pass |
| NFR-02 | `git diff main` y los 429 observados | Mismos valores y endpoints | `git diff main -- backend/app` vacío. 429 en el 11 en `login` y `token` y en el 21 en `refresh`. Los tests de límite de backend no se pudieron ejecutar (sin PostgreSQL) | Pass |

Secuencias observadas (estado HTTP por intento, en orden):

| Escenario | Variable | Prueba | Resultado |
|---|---|---|---|
| S1 | vacía (`printenv` no la muestra) | `login` x11, `X-Forwarded-For` `198.51.100.1` a `.11` | 401 x10, 429 |
| S1 | vacía, recreado antes | `login` x11 sin cabecera | 401 x10, 429 |
| S2 | `172.25.0.1` | A (`203.0.113.10`) `login` x11 | 401 x10, 429 |
| S2 | ídem | B (`203.0.113.20`) `login` x1 tras agotar A | 401 |
| S2 | ídem | A `login` x1 más | 429 |
| S2 | ídem, recreado | A `token` x11 | 401 x10, 429 |
| S2 | ídem, recreado | A `refresh` x21 | 401 x20, 429 |
| S3 | `172.25.0.1` | segundo contenedor, `login` x11, `X-Forwarded-For` distinto | 401 x10, 429 |
| S4 | `172.25.0.0/31` | A `login` x11; B `login` x1; segundo contenedor x11 | 401 x10 y 429; 401; 401 x10 y 429 |
| S5 | `*` | host `login` x11 con `X-Forwarded-For` distinto | 401 x11, sin 429 |
| S5 | `*` | segundo contenedor, ídem | 401 x11, sin 429 |
| Extra | `172.25.0.0/16` | segundo contenedor, `login` x11 con `X-Forwarded-For` distinto | 401 x11, sin 429 |
| Extra | `no-es-una-ip` | A `login` x11 con cabecera fija; B `login` x1 | 401 x10 y 429; B 429 (cupo compartido) |

### 3.1 Unverified Qualities

Ninguna.

### 3.2 AC-04.2: README frente a lo observado

Se leyó la sección "Despliegue detrás de un proxy" y se comparó con la tabla de arriba:

- Sin variable los clientes tras un proxy comparten cupo, y con ella cada uno tiene el suyo: coincide con S1 y S2.
- Una conexión fuera de la lista no elige su IP: coincide con S3 y S4.
- Con `*` se falsifica la IP desde el host y desde otro contenedor: coincide con S5.
- Un valor mal escrito deja el cupo compartido: coincide con la fila extra (B recibe 429).
- Una red amplia permite falsificar: la fila extra `/16` lo observa; el README lo describe como esperado y no ejecutado, lo cual sigue siendo cierto de T-02 pero ya no de la feature.
- «Aunque el puerto 8000 esté cerrado al exterior»: ninguna de las dos ejecuciones cerró el 8000; el README lo atribuye al diseño. No contradice lo observado y no está probado.
- Los puntos «primera IP no confiada desde la derecha» y «`127.0.0.1` por defecto fuera de Compose» el README los marca como no ejecutados, y no se ejecutaron en esta run.

Ninguna afirmación contradice lo observado.

---

## 4. What Failed

### Failure 1: Siete criterios sin un test que nombre su ID

- **Concerns:** AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2
- **Observed:** Ningún test del repo nombra `F003:AC-01.1` a `F003:AC-03.2`. Cada uno se cumple en la ejecución del procedimiento (sección 3), con la salida registrada solo aquí y en `evidence/t02-comprobacion-proxy.md`.
- **Expected:** Cada criterio tiene al menos un test que nombra su ID completo y pasa (regla de la evidencia). El diseño aprobado (design.md@3, 9.1) y NFR-01 aceptan un procedimiento ejecutado en lugar de un test.
- **Likely cause:** (inferencia) Decisión de diseño por PR-004: un test automático necesitaría Docker. No es un fallo de comportamiento.
- **Lies in:** The design or the plan

Se pone al mantenedor como H-06: aceptar el procedimiento como prueba de esos criterios, o abrir una tarea de corrección que lo automatice.

---

## 5. Limits

- PostgreSQL de tests no disponible: la suite de backend no ejecutó 49 tests y no se comprobaron los tests de límite existentes de `auth` (NFR-02 se apoya en el diff vacío y en los 429 observados).
- Un proxy real (nginx, Caddy, Traefik) no se probó: el host hizo de proxy con `curl`; queda fuera por los requisitos (sección 4).
- No se ejecutó uvicorn local sin Docker, ni «primera IP no confiada desde la derecha» con varias entradas, ni un 8000 cerrado con `*`.
- El segundo contenedor se montó con la imagen del backend y `urllib`; el script no consta en el repo. Este run lo guardó en el scratchpad, que se descarta.
- El límite es en memoria y de una sola réplica.

---

## 6. Maintenance Guidelines

This document records one Verify run. It is never edited after the run; the next run replaces it, with the next run number and the commit it checked.

- `result` is `pass` only when every check passes with no failure beyond the known ones, every acceptance criterion has a passing test, and every quality passes or is put to the human as unverified.
- Record what was observed. Never mark something as passing that was not run.

### Source of Truth

- This document is the canonical record of what the full check observed.
- The feature review judges the feature against the requirements, the design, and this evidence; its verdict is in its own review file.
- The requirements define the acceptance criteria and the qualities; this document never changes them.
