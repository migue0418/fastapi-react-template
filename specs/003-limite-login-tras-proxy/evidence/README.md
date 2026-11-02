---
artifact: evidence
feature: F003
run: 2
commit: 4ff5b88
date: 2026-11-02
result: pass
upstream: [requirements.md@1, design.md@3, plan.md@1]
---

# Evidence: El límite de login se aplica por cliente real tras un proxy

> Registro de la run 2 de Verify sobre `feature/003-limite-login-tras-proxy` en el commit `4ff5b88`. Dice lo observado, no lo esperado. La run 1 (commit `14b4cc5`) quedó en `fail` solo por la trazabilidad de siete criterios; el mantenedor lo resolvió en H-06. Entre ambas runs no cambió ningún archivo fuera de `specs/`.

---

## 1. Checks

| Check | Command | Result | Notes |
|---|---|---|---|
| Tests de backend | `cd backend && uv run python -m pytest -q` | Fail (solo fallos conocidos) | 3 failed, 49 passed, 49 errors, 124 s. Los 3 failed y los 49 errors son `RuntimeError: PostgreSQL de tests no disponible`. Pasan 49 (48 de la línea base + el test de AC-04.1) |
| Lint frontend | `cd frontend && npm run lint` | Pass | Sin avisos |
| Tests frontend | `cd frontend && npm run test` | Pass | 6 archivos, 24 tests |
| Build frontend | `cd frontend && npm run build` | Pass | Construido en 804 ms |
| Build de la imagen | `docker compose -p f003verify up --build -d` (copia temporal del compose, ver sección 3) | Pass | La imagen del `Dockerfile` del repo se construyó y el servicio quedó en marcha |
| Código de la aplicación | `git diff main --stat -- backend/app` | Pass | Vacío: `limiter.py`, `router.py` y el resto de `backend/app` no cambian |

### 1.1 Known Failures

- `backend pytest: 3 failed y 49 errors por PostgreSQL de tests no disponible`: Still failing, los mismos 3 failed (`test_alembic_cli_uses_settings_database_url` y las dos variantes de `test_migration_0003_fixes_only_seeded_admin_description`) y 49 errors. Ninguno es de esta feature.
- `frontend limpio`: Still clean.

---

## 2. Traceability

Los criterios AC-01.1 a AC-03.2 no tienen un test automático que nombre su ID. El diseño (design.md@3, 9.1) eligió un procedimiento ejecutado con Compose (PR-004) y el mantenedor aceptó que ese procedimiento sirve de prueba, como riesgo registrado (H-06, "A", 2026-11-02). La columna Tests cita el escenario de la sección 3, repetido entero en esta run.

| Requirement | Acceptance criterion | Components and interfaces | Tasks | Tests | Result |
|---|---|---|---|---|---|
| REQ-01 | AC-01.1 | C-01, C-02, C-05, IF-01 | T-02 | Procedimiento S1a: 401 x10 y 429 con 11 `X-Forwarded-For` distintos | Pass (procedimiento, H-06) |
| REQ-01 | AC-01.2 | C-01, C-02, C-05, IF-01 | T-02 | Procedimiento S1b, tras recrear: 401 x10 y 429 | Pass (procedimiento, H-06) |
| REQ-02 | AC-02.1 | C-01, C-02, C-05, IF-01 | T-02 | Procedimiento S2: A 429 en el 11 y B 401 | Pass (procedimiento, H-06) |
| REQ-02 | AC-02.2 | C-01, C-02, C-05, IF-01 | T-02 | Procedimiento S2: A 429 en login 12, token 11 y refresh 21, una conexión nueva por intento | Pass (procedimiento, H-06) |
| REQ-02 | AC-02.3 | C-01, C-02, C-05, IF-01 | T-02 | Procedimiento S3: segundo contenedor `172.25.0.4`, 429 en el 11 | Pass (procedimiento, H-06) |
| REQ-03 | AC-03.1 | C-01, C-03, C-05, IF-01 | T-01, T-02 | Procedimiento S2 (IP sola) y S4 (`172.25.0.0/31`), solo con la variable | Pass (procedimiento, H-06) |
| REQ-03 | AC-03.2 | C-01, C-03, C-05, IF-01 | T-02 | Procedimiento S1a y S1b, sin la variable | Pass (procedimiento, H-06) |
| REQ-04 | AC-04.1 | C-03 | T-01 | `backend/tests/test_settings.py::test_f003_ac_04_1_example_env_shows_forwarded_allow_ips` (nombra `F003:AC-04.1`), pasa dentro de la suite | Pass |
| REQ-04 | AC-04.2 | C-04 | T-03 | Inspección del README frente a la sección 3 (ver 3.2) | Pass (inspección) |

---

## 3. Qualities

Entorno: Docker Server 29.7.2 (Docker Desktop, Windows). Proyecto Compose temporal `f003verify`, con una copia del `docker-compose.yml` en el scratchpad: `build.context` con la ruta absoluta del repo, sin el mapeo del puerto de PostgreSQL, backend en `127.0.0.1:18000:8000` y `env_file: ./env.tmp`, copia de `backend/.example.env` a la que cada escenario añade `FORWARDED_ALLOW_IPS=<valor>` (o la quita). Red `172.25.0.0/16`, puerta de enlace `172.25.0.1`, segundo contenedor `172.25.0.4`. Credenciales inventadas (`nadie` / `x`): la respuesta normal es 401. Antes de cada escenario se recreó el servicio: `docker compose -p f003verify up -d --force-recreate --no-deps backend`.

Comandos de cada intento (estado HTTP):

- `login` desde el host: `curl -s -o /dev/null -w "%{http_code}" [-H "X-Forwarded-For: <ip>"] -H "Connection: close" -H "Content-Type: application/json" -d '{"username":"nadie","password":"x","remember_me":false}' http://127.0.0.1:18000/api/auth/login`
- `token`: igual, con `-d 'username=nadie&password=x'` y `/api/auth/token`.
- `refresh`: `curl ... -X POST http://127.0.0.1:18000/api/auth/refresh`, sin cuerpo.
- `X-Forwarded-For` distinto en S1a y S5: `198.51.100.1` a `.11`.
- Segundo contenedor: `docker run --rm --network f003verify_default -v <script>:/second.py:ro --entrypoint python f003verify-backend /second.py`, con este script (11 `login` a `http://backend:8000` con `X-Forwarded-For: 198.51.100.101` a `.111`, `Connection: close`, e imprime los estados):

```python
import sys, urllib.request, urllib.error, json
out=[]
for i in range(1,12):
    req=urllib.request.Request("http://backend:8000/api/auth/login",data=json.dumps({"username":"nadie","password":"x","remember_me":False}).encode(),headers={"Content-Type":"application/json","X-Forwarded-For":"198.51.100.%d"%(100+i),"Connection":"close"})
    try: out.append(urllib.request.urlopen(req).status)
    except urllib.error.HTTPError as e: out.append(e.code)
print(*out)
```

| NFR | How it was verified | Target | Measured | Result |
|---|---|---|---|---|
| NFR-01 | Ejecución contra la aplicación en marcha | AC-01.1, AC-02.1 y AC-02.3 ejecutados con IPs de origen distintas | Los tres ejecutados, con origen host y segundo contenedor (tabla de abajo) | Pass |
| NFR-02 | `git diff main` y los 429 observados | Mismos valores y endpoints | `git diff main -- backend/app` vacío. 429 en el 11 en `login` y `token` y en el 21 en `refresh`. Los tests de límite de backend no se pudieron ejecutar (sin PostgreSQL) | Pass |

| Escenario | Variable | Prueba | Resultado |
|---|---|---|---|
| S1a | vacía | `login` x11, `X-Forwarded-For` distinto | 401 x10, 429 |
| S1b | vacía, recreado antes | `login` x11 sin cabecera | 401 x10, 429 |
| S2 | `172.25.0.1` | A (`203.0.113.10`) `login` x11; B (`203.0.113.20`) x1; A x1 más | 401 x10 y 429; 401; 429 |
| S2 | ídem, recreado | A `token` x11 | 401 x10, 429 |
| S2 | ídem, recreado | A `refresh` x21 | 401 x20, 429 |
| S3 | `172.25.0.1` | segundo contenedor, `login` x11 con `X-Forwarded-For` distinto | 401 x10, 429 |
| S4 | `172.25.0.0/31` | A `login` x11; B `login` x1; segundo contenedor x11 | 401 x10 y 429; 401; 401 x10 y 429 |
| S5 | `*` | host x11 con `X-Forwarded-For` distinto; segundo contenedor x11 | 401 x11 sin 429; 401 x11 sin 429 |

Los casos extra de la run 1 (red `/16`: el segundo contenedor falsifica su IP, 401 x11; valor `no-es-una-ip`: B recibe 429) no se repitieron en la run 2; consta su resultado en la run 1, en el historial del repositorio.

### 3.1 Unverified Qualities

Ninguna.

### 3.2 AC-04.2: README frente a lo observado

Se comparó la sección "Despliegue detrás de un proxy" con la tabla de arriba y con los casos extra de la run 1:

- Sin variable los clientes tras un proxy comparten cupo, y con ella cada uno tiene el suyo: coincide con S1 y S2.
- Una conexión fuera de la lista no elige su IP: coincide con S3 y S4.
- Con `*` se falsifica la IP desde el host y desde otro contenedor: coincide con S5.
- Un valor mal escrito y una red amplia: el README los llama no ejecutados; la run 1 los observó (cupo compartido; falsificación con `/16`). El texto subestima lo observado y no lo contradice (R1-01, a corregir en Document).
- «Aunque el puerto 8000 esté cerrado»: no se cerró el 8000 en ninguna ejecución; viene del diseño (R1-04, a corregir en Document).
- «Primera IP no confiada desde la derecha» y «`127.0.0.1` por defecto fuera de Compose»: el README los marca como no ejecutados; tampoco se ejecutaron aquí.

Ninguna afirmación contradice lo observado.

---

## 4. What Failed

Nada falla. Se registra un punto aceptado por el mantenedor:

- AC-01.1 a AC-03.2 no tienen un test que nombre su ID. H-06 (2026-11-02, respuesta "A") acepta el procedimiento de la sección 3 como prueba, como riesgo registrado.

---

## 5. Limits

- PostgreSQL de tests no disponible: la suite de backend no ejecutó 49 tests y no se comprobaron los tests de límite existentes de `auth`; NFR-02 se apoya en el diff vacío y en los 429 observados.
- No se probó un proxy real (nginx, Caddy, Traefik): el host hizo de proxy con `curl`; queda fuera por los requisitos (sección 4).
- No se ejecutó uvicorn local sin Docker, ni «primera IP no confiada desde la derecha» con varias entradas, ni `*` con el 8000 cerrado.
- Los casos extra (`/16`, valor mal escrito) solo se ejecutaron en la run 1.
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
