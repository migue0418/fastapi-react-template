---
artifact: design
feature: F003
status: draft
version: 2
upstream: [brief.md@1, requirements.md@1]
---

# Design: El límite de login se aplica por cliente real tras un proxy

> Describe cómo se construye la feature: sin código de aplicación nuevo. La confianza en las cabeceras de un proxy la decide uvicorn mediante `FORWARDED_ALLOW_IPS`; la feature hace visible esa variable, ejecuta la comprobación contra la aplicación real y alinea la documentación con lo observado.

---

## Conventions

Los componentes llevan ID `C-nn` y las interfaces `IF-nn`. Los ASM, OQ y RISK continúan la numeración del brief (ASM-01 a ASM-03, OQ-01, RISK-01 y RISK-02) y de los requisitos (ASM-04).

---

## 1. Context

Estado actual, leído del código el 2026-11-02:

- `backend/app/core/limiter.py`: `Limiter(key_func=get_remote_address)`, de slowapi. La clave es `request.client.host`.
- `backend/app/features/auth/router.py`: `10/minute` en login y token, `20/minute` en refresh.
- `Dockerfile`: arranca `uvicorn app.main:app` sin `--forwarded-allow-ips`. uvicorn 0.47.0 activa por defecto el tratamiento de cabeceras de proxy y lee `FORWARDED_ALLOW_IPS` del entorno, con `127.0.0.1` por defecto (`uvicorn/config.py:344`).
- `docker-compose.yml`: el servicio `backend` carga `backend/.env` con `env_file`, así que cualquier variable de ese archivo llega al entorno del proceso.
- `Settings` usa `extra="ignore"` (`settings.py:30`): una variable más en `backend/.env` no rompe el arranque.
- `backend/.example.env` no menciona la variable; el README sí (sección "Despliegue detrás de un proxy").

Evidencia de comportamiento (experimento aislado fuera del repo, uvicorn 0.47.0 y slowapi con la misma clave; no sustituye a la comprobación de T-02): con la conexión incluida en `FORWARDED_ALLOW_IPS`, cuatro peticiones con `X-Forwarded-For` distinto no se limitan (4 × 200 con límite 3/min); con la conexión fuera de la lista, la cabecera se ignora y la cuarta recibe 429.

Fuentes que aplican: `architecture.md` 2.2, 6.1, 7.1, 9.2; constitución PR-002, PR-003, NC-003, NC-006, NC-008, NC-009, EP-005, EP-006; `stack.yaml` (`rate-limiting`: slowapi en memoria y por IP remota). No hay ADR previos.

---

## 2. Overview

El diseño no cambia ningún flujo de la aplicación. Tras un proxy, el reparto de cupos depende de una sola decisión de despliegue: qué conexiones puede tratar uvicorn como proxy.

```
Cliente ──XFF──> Proxy ──> uvicorn (ProxyHeadersMiddleware) ──> slowapi (request.client.host) ──> 429 o respuesta
                              ▲
                  FORWARDED_ALLOW_IPS (backend/.env → env_file → entorno del contenedor)
```

- Si la conexión entrante está en la lista, uvicorn sustituye `client` por la IP que informa `X-Forwarded-For` (la primera no confiada empezando por la derecha) y slowapi cuenta por cliente real.
- Si no lo está, la cabecera se ignora y slowapi cuenta por la IP de la conexión.

El trabajo se reduce a tres piezas: la variable visible en la configuración de ejemplo (C-03), la comprobación ejecutada que prueba el comportamiento (C-05) y el README alineado con lo observado (C-04). El servidor (C-01) y el limitador (C-02) se usan tal cual.

---

## 3. Components

### C-01: Tratamiento de cabeceras de proxy de uvicorn

- **Responsibility:** Decide, por la IP de la conexión y `FORWARDED_ALLOW_IPS`, si respeta `X-Forwarded-For` para fijar la IP del cliente.
- **Covers:** REQ-01, REQ-02, REQ-03
- **Status:** Existing, used as is
- **Owns:** Ninguno; la lista de confianza llega por el entorno.
- **Depends on:** `backend/.env` cargado por Compose (`env_file`).
- **On failure:** Un valor mal escrito no es una IP ni una red válidas y uvicorn lo guarda como literal sin avisar: no confía en nadie y los clientes comparten cupo (falla cerrado, ver RISK-03).

### C-02: Limitador por IP remota

- **Responsibility:** Cuenta los intentos de los endpoints limitados por `request.client.host`, con los límites actuales.
- **Covers:** REQ-01, REQ-02, NFR-02
- **Status:** Existing, used as is
- **Owns:** Los contadores en memoria del proceso.
- **Depends on:** C-01, que fija `request.client`.
- **On failure:** Al superar el cupo, 429 (ASM-04). Los contadores se pierden al reiniciar, como hoy.

### C-03: Configuración de ejemplo

- **Responsibility:** Muestra `FORWARDED_ALLOW_IPS` en `backend/.example.env`, comentada, con el valor realista más estrecho (una sola IP o una red CIDR pequeña, nunca un comodín ni un rango amplio como `10.0.0.0/8` o `172.16.0.0/12`) y una nota en español que dice que se sustituya por la dirección del proxy y cuándo definirla.
- **Covers:** REQ-03, REQ-04
- **Status:** Changed
- **Owns:** El texto de ejemplo de la variable.
- **Depends on:** Ninguno.
- **On failure:** Si el valor de ejemplo se copiara sin adaptar, sería una red que no incluye al proxy real y no habría confianza, no una apertura (el ejemplo no es `*`).

### C-04: Documentación de despliegue

- **Responsibility:** La sección "Despliegue detrás de un proxy" del README afirma solo lo que la comprobación observó, y nombra la variable, la advertencia contra valores amplios y la fuente del valor.
- **Covers:** REQ-04
- **Status:** Changed
- **Owns:** El texto de la sección.
- **Depends on:** Resultados de C-05.
- **On failure:** Una afirmación que no coincida con lo observado se corrige antes de cerrar la tarea (AC-04.2).

### C-05: Comprobación ejecutada contra la aplicación real

- **Responsibility:** Ejecuta, con Compose en un proyecto aislado, los escenarios de REQ-01 a REQ-03 y deja el registro de ejecución.
- **Covers:** REQ-01, REQ-02, REQ-03, NFR-01, NFR-02
- **Status:** New
- **Owns:** El registro `evidence/t02-comprobacion-proxy.md` y el proyecto Compose temporal, que se elimina al terminar.
- **Depends on:** C-01, C-02, Docker, un archivo `.env` temporal fuera del repo.
- **On failure:** Un escenario que no se pueda ejecutar se declara no verificado (PR-002, NFR-01); un resultado distinto del esperado se trata como hallazgo (ver OQ-01 y sección 8).

---

## 4. Interfaces

### IF-01: Variable `FORWARDED_ALLOW_IPS`

- **Kind:** Internal (configuración de despliegue leída por uvicorn)
- **Covers:** REQ-01, REQ-02, REQ-03
- **Provided by:** C-01
- **Used by:** Quien despliega, mediante `backend/.env`; C-03 y C-04 la documentan.
- **Operations:** Entrada: lista separada por comas de IPs o redes CIDR, o `*`. Salida: las conexiones incluidas pueden fijar la IP del cliente con `X-Forwarded-For`. Sin definir, uvicorn usa `127.0.0.1`. Un valor vacío, o ningún valor válido, no confía en nadie.
- **Guarantees:** Con una lista concreta de IPs o redes, solo esas conexiones fijan la IP del cliente, y la IP resultante es la primera no confiada empezando por la derecha de la cabecera: un cliente no puede elegir su IP anteponiendo valores a una cabecera que el proxy completa (`proxy_headers.py:166-170`). Esa garantía no vale para `*` (`always_trust`): uvicorn toma la primera entrada de la cabecera (`proxy_headers.py:163-164`), que controla el cliente, así que con `*` cualquier cliente puede falsificar su IP aunque el puerto 8000 esté cerrado. Lo mismo ocurre con una red lo bastante amplia como para incluir clientes reales o contenedores ajenos, que además puede exponer el 8000 a quien no es el proxy.
- **Compatibility:** No cambia nada para quien no la define: el comportamiento actual se conserva (AC-01.2, AC-03.2).

---

## 5. Data

La feature no introduce ni cambia datos, ni esquema ni migraciones. Los contadores del limitador siguen en memoria. La comprobación usa una base de datos de un proyecto Compose temporal con volumen propio, que se elimina con `docker compose -p <proyecto> down -v`; no toca los datos del mantenedor.

---

## 6. Technologies

- **From the stack:** `rate-limiting` (slowapi, en memoria, por IP remota), `backend-framework` (uvicorn 0.47.0), `packaging-and-deployment` (Compose), `backend-testing` solo para confirmar que la suite existente sigue pasando.
- **New:** ninguna. No hay dependencias nuevas (NC-008, CON-02). `docker-compose.yml`, `Dockerfile` y `Settings` no cambian.
- **Skills:** del catálogo, ninguna aplica a Design, y para Build `superpowers:systematic-debugging` solo si una comprobación falla. El README y el `.example.env` se redactan en español (NC-009).

---

## 7. Qualities

- **NFR-01:** C-05 ejecuta AC-01.1, AC-02.1 y AC-02.3 contra la aplicación en marcha con Compose, con dos fuentes de origen (ASM-05): el host, que hace de proxy y envía `X-Forwarded-For` distintos, y un segundo contenedor en la red del proyecto, con otra IP y fuera de la lista de confianza, que hace de conexión no confiada en AC-02.3. Si no se puede montar la segunda fuente, AC-02.3 se declara no verificado. Verified by: el registro de ejecución de T-02, que Verify repite como evidencia.
- **NFR-02:** No se modifica `limiter.py` ni los decoradores. Verified by: `git diff main -- backend/app` vacío para `core/limiter.py` y `features/auth/router.py`, y los 429 observados en T-02 (a partir del undécimo intento de login y del vigésimo primero de refresh, con las ventanas de 1 minuto). La suite de backend existente (`uv run pytest -q`) solo se ejecuta como regresión: no comprueba los valores del límite.

---

## 8. Failure Modes

| Failure | How it is detected | What the system does | How it recovers |
|---|---|---|---|
| Valor de `FORWARDED_ALLOW_IPS` con un error de escritura | La comprobación de AC-02.1 con la variable definida da cupo compartido | uvicorn lo trata como literal y no confía en nadie (falla cerrado) | README indica cómo comprobarlo y el formato de la lista |
| `*` | Escenario adicional de T-02: con `*`, una conexión envía `X-Forwarded-For` con una IP distinta en cada intento y no se limita | uvicorn toma la primera entrada de la cabecera, que elige el cliente, aunque el 8000 esté cerrado | No usar `*`; el README lo dice (RISK-01) |
| Una red amplia que incluye clientes reales o contenedores ajenos | Revisión del valor y AC-02.3 con una conexión de esa red | Esas conexiones pueden fijar su IP con la cabecera y saltar el límite | Lista con la IP o la red mínima del proxy; el ejemplo es estrecho (RISK-01) |
| La IP de la conexión no es la del proxy (Docker Desktop enmascara) | T-02 lee la IP de origen que ve el contenedor antes de fijar la lista | Con una lista que no la incluye no hay confianza | Usar la IP o red de esa conexión (ASM-05) |
| La comprobación no reproduce el fallo (OQ-01) | T-02 | La feature se cierra con la evidencia y la documentación | Se aplica OQ-01 |
| Ejecución en proceso local sin Docker con un proxy en `127.0.0.1` | Documentado, no detectado | uvicorn confía por defecto en `127.0.0.1` y respeta la cabecera de esa conexión | README lo menciona (RISK-04); no afecta a Compose |

---

## 9. Decisions

- **ADRs:** ADR-0001 (la confianza en cabeceras de proxy se delega en uvicorn), `decided-by: design`, `proposed` hasta la aprobación.
- **Human decisions:** H-01 (flujo normal), Q-01 (valor por defecto seguro y una variable), Q-02 (sin aviso ni rechazo en arranque) y H-04 (documentar el valor por defecto de uvicorn fuera de Compose). No hay nuevas puertas de un solo sentido: el valor por defecto no cambia y la lista de confianza es una decisión de cada despliegue, reversible editando `backend/.env`.
- **Research:** ninguna nota. El experimento de la sección 1 y la lectura del código de uvicorn 0.47.0 (`config.py`, `middleware/proxy_headers.py`) sustituyen a una investigación.

### 9.1 Alternatives Considered

- **Dónde decidir la confianza:** frente a un campo nuevo en `Settings` con `ProxyHeadersMiddleware` propio, y frente a una clave de limitador que lea `X-Forwarded-For` directamente, se elige la variable de uvicorn: no añade código, no duplica la lógica del servidor y una clave que lea la cabecera sin lista de confianza permitiría falsificarla (contradice REQ-01). Ver ADR-0001.
- **Valor por defecto en el Dockerfile:** frente a fijar `FORWARDED_ALLOW_IPS=""` en la imagen, se deja el valor por defecto de uvicorn, por decisión del mantenedor (H-04). En Compose ninguna conexión externa llega desde `127.0.0.1` del contenedor, así que REQ-01 se cumple sin tocar el despliegue; el límite fuera de Compose es el de RISK-04 y se documenta.
- **Comprobación como script o test versionado:** frente a un script o un test en el repo, se ejecuta un procedimiento documentado en el plan y se deja el registro. Un test automático necesitaría Docker o un servidor real, y la constitución pide proporcionalidad (PR-004); si RM-05 entrega CI, se puede automatizar entonces.
- **Aviso en arranque:** descartado en Q-02.

---

## 10. Assumptions, Open Questions, and Risks

### ASM-05: Un cliente en el host puede hacer de proxy en la comprobación

- **Basis:** Compose publica el 8000 y el contenedor ve las conexiones del host desde la IP de la puerta de enlace de su red, no desde la IP del cliente; el host envía `X-Forwarded-For` arbitrarios (ASM-03). Un segundo contenedor en esa red tiene otra IP y sirve de conexión no confiada para AC-02.3.
- **Impact if incorrect:** AC-01.1 y AC-02.1 se declararían no verificados, o se usarían contenedores con IPs distintas; AC-02.3 se declararía no verificado si no se puede montar la segunda fuente.
- **Status:** Unverified

### ASM-06: uvicorn 0.47.0 acepta redes CIDR y listas separadas por comas

- **Basis:** Lectura de `middleware/proxy_headers.py` (clase `_TrustedHosts`); no ejecutado todavía.
- **Impact if incorrect:** El ejemplo de C-03 usaría una IP concreta en lugar de una red.
- **Status:** Unverified. T-02 lo ejecuta con una red en AC-03.1.

### OQ-02: ¿Basta con documentar que, fuera de Docker, `127.0.0.1` se confía por defecto?

- **Impact:** REQ-01 dice "sin proxy de confianza configurado, se ignora la cabecera". Con uvicorn local, la conexión desde `127.0.0.1` ya es de confianza por defecto, así que ahí una cabecera enviada desde la propia máquina sí se respeta. En Compose no ocurre: REQ-01 y CON-01 se cumplen en el contexto de Compose, el único del brief (sección 2).
- **Proposed default:** Documentarlo en el README (T-03) sin cambiar el valor por defecto.
- **Status:** Resolved
- **Resolution:** Decidido por el mantenedor el 2026-11-02 (H-04): "Documentar el límite (Recomendado)".

### RISK-03: Un valor mal escrito falla en silencio

- **Likelihood:** Medium
- **Impact:** Low (falla cerrado: cupo compartido, sin apertura)
- **Mitigation:** El README da el formato y la forma de comprobarlo; Q-02 descartó un aviso en arranque.

### RISK-04: La confianza por defecto en `127.0.0.1` fuera de Compose

- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Se documenta (OQ-02, H-04). Ningún cliente externo llega con esa IP en Compose.

---

## 11. Task List

| Task | Delivers | Acceptance criteria | Technologies | Depends on |
|---|---|---|---|---|
| T-01 | La variable, comentada y con el valor de ejemplo más estrecho (sin comodín ni rango amplio), en `backend/.example.env` | AC-04.1 | validation-and-settings (el archivo se lee con `extra="ignore"`) | None |
| T-02 | La comprobación ejecutada con Compose aislado y dos fuentes de origen, incluido el escenario adicional con `*`, y su registro | AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2 | packaging-and-deployment, rate-limiting, backend-framework | None |
| T-03 | La sección del README alineada con lo observado, con la advertencia sobre `*` y redes amplias y el valor por defecto de uvicorn fuera de Compose | AC-04.2 | Ninguna | T-02 |

---

## 12. Traceability and Coverage

- REQ-01 → C-01, C-02, C-05, IF-01. REQ-02 → C-01, C-02, C-05, IF-01. REQ-03 → C-01, C-03, C-05, IF-01. REQ-04 → C-03, C-04.
- NFR-01 → C-05. NFR-02 → C-02, C-05.
- AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2 → T-02. AC-04.1 → T-01. AC-04.2 → T-03.
- Ningún componente sin requisito. Respeta CON-01 a CON-04 y las constricciones de la constitución; no cambia ninguna tecnología fijada.

- **Coverage gaps:** None
- **Unresolved dependencies:** None. OQ-02 está resuelta por H-04; REQ-01 se cumple en el contexto de Compose.

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
