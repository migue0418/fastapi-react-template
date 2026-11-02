---
artifact: brief
feature: F003
status: approved
version: 1
upstream: []
---

# Brief: El límite de login se aplica por cliente real tras un proxy

> Describes the problem or opportunity behind a feature, who it affects, the outcome it must achieve, how success is measured, and the boundaries of the change.
> Once approved, this document and the requirements built from it are the contract every later artifact of the feature is checked against.
> It describes what is needed and why, never how it is built.

---

## 1. Problem

Los endpoints de login y refresh limitan los intentos por IP de cliente. El README recomienda desplegar un derivado detrás de un proxy que termine TLS, y documenta que, si no se configura qué proxy es de confianza, el límite ve la IP del proxy y **todos los clientes comparten el mismo cupo**: un solo cliente que lo agote bloquea el login de los demás.

Hechos observados en el repositorio: el límite se calcula con la IP remota de la conexión; el servidor arranca sin configurar proxies de confianza; Compose carga `backend/.env` en el servicio `backend`; el README describe el comportamiento y la variable `FORWARDED_ALLOW_IPS`. **Sin comprobar:** que el comportamiento real coincida con lo documentado (`architecture.md` 9.2, "Under investigation"). Tampoco consta que quien despliega pueda saber la variable sin leer la sección entera del README.

Afecta al mantenedor cuando despliega un derivado tras un proxy: o el límite de login bloquea a usuarios legítimos, o, si se configura con demasiada amplitud, se puede saltar falsificando la cabecera `X-Forwarded-For`.

---

## 2. Users and Context

- **Mantenedor** (`product.md` 3.1), en su papel de quien despliega un derivado. Pone delante un proxy con TLS (nginx, Caddy, Traefik), que la plantilla no incluye, y quiere que el límite de login proteja de verdad sin romper el acceso de usuarios legítimos.
- Contexto: despliegue con Compose, una sola réplica, contador del límite en memoria (`architecture.md`).

---

## 3. Desired Outcome

Detrás de un proxy, un cliente que supera el límite de login queda limitado sin afectar a los demás clientes. Quien despliega solo tiene que definir una variable de configuración, sin cambiar nada más, y por defecto la plantilla no confía en ningún proxy, de modo que una cabecera falsificada no sirve para saltarse el límite.

---

## 4. Success Criteria

### SC-01: Cada cliente tiene su propio cupo tras un proxy configurado

- **Measurement:** Ejecución real con un proxy de confianza configurado y dos clientes con IPs distintas: uno supera el límite de login y recibe el rechazo por exceso; el otro sigue pudiendo iniciar sesión.
- **Baseline:** Sin comprobar; el README afirma que sin configuración comparten cupo.
- **Target:** El segundo cliente no es limitado.

### SC-02: Una cabecera falsificada no salta el límite

- **Measurement:** Ejecución real en la que una conexión que no viene de un proxy de confianza envía `X-Forwarded-For` con una IP distinta en cada intento; los intentos se limitan igualmente.
- **Baseline:** Sin comprobar.
- **Target:** El límite se aplica a la IP real de la conexión; la cabecera se ignora.

### SC-03: La configuración necesaria se encuentra y basta con una variable

- **Measurement:** Revisión de que `backend/.example.env` y el README indican la variable y su valor para un proxy, y de que, con ella definida en `backend/.env`, se cumple SC-01 sin otro cambio.
- **Baseline:** La variable solo se documenta en el README.
- **Target:** Presente en ambos, y SC-01 pasa con solo esa variable.

---

## 5. Scope

### 5.1 In Scope

- Comprobar con una ejecución real el comportamiento del límite de login y refresh con y sin proxy de confianza configurado.
- Que, por defecto, no se confíe en ningún proxy.
- Que quien despliega configure el proxy de confianza con una sola variable, visible en la configuración de ejemplo y en el README.
- Corregir el README, `architecture.md` 9.2 y el roadmap según lo comprobado.

### 5.2 Non-Goals

- Contadores del límite compartidos entre réplicas o workers (queda fuera de RM-02 y no tiene ítem; el README ya lo documenta).
- Avisar o negarse a arrancar en producción si no se ha configurado el proxy (decidido en Q-02: la app no sabe si hay un proxy).
- Cambiar los límites actuales ni los endpoints que limitan.
- Incluir un proxy en la plantilla, o cambiar cómo Compose publica el puerto 8000.

---

## 6. Constraints

### CON-01: Valor por defecto seguro

- **Source:** PR-003 (`constitution.md`) y Q-01: por defecto no se confía en ningún proxy.

### CON-02: Sin dependencias nuevas sin confirmación

- **Source:** NC-008.

### CON-03: Mensajes y documentación en español

- **Source:** NC-009.

### CON-04: Configuración mediante `Settings` o el servidor

- **Source:** NC-003, y `stack.yaml` fija el límite en memoria por IP remota. Cualquier ajuste se hace dentro de ese límite.

---

## 7. Assumptions

### ASM-01: El fallo descrito en el README es real

- **Basis:** La documentación de uvicorn y el README; sin ejecución real todavía.
- **Default:** Se asume cierto hasta que la comprobación lo contradiga.
- **Impact if incorrect:** Si no se reproduce, RM-02 se cierra con la evidencia (nota de RM-02) y el alcance se reduce a la documentación.
- **Status:** Unverified

### ASM-02: Una sola variable basta

- **Basis:** Compose carga `backend/.env` en el contenedor, y el README nombra `FORWARDED_ALLOW_IPS` como la que decide en qué proxies se confía.
- **Default:** Basta definirla en `backend/.env`.
- **Impact if incorrect:** Habría que decidir un cambio de configuración en Design, dentro del alcance.
- **Status:** Unverified

### ASM-03: Se pueden simular clientes con IPs distintas en local

- **Basis:** Docker Desktop en Windows enmascara la IP real del cliente.
- **Default:** La comprobación usa conexiones desde una IP de confianza que envían la cabecera con IPs distintas, o desde contenedores con IPs distintas.
- **Impact if incorrect:** SC-01 y SC-02 quedarían sin ejecutar y se declararían no verificados (PR-002).
- **Status:** Unverified

---

## 8. Open Questions

### OQ-01: ¿Y si la comprobación no confirma el fallo?

- **Why it matters:** Cambia la feature a documentación y evidencia.
- **Proposed default:** Se registra la evidencia, se ajusta la documentación y la feature se cierra sin cambios de comportamiento.
- **Status:** Open

---

## 9. Risks

### RISK-01: Un valor demasiado amplio permite falsificar la IP

- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:** El README ya lo advierte; la configuración de ejemplo no debe proponer `*`.

### RISK-02: Las IPs locales de la prueba no reflejan un despliegue real

- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** Declarar lo no verificado y qué entorno se usó (ASM-03).

---

## 10. References

### REF-01: README, "Despliegue detrás de un proxy"

- **Purpose:** Comportamiento documentado y variable `FORWARDED_ALLOW_IPS`.

### REF-02: `architecture.md` 9.2 y RM-02 en `roadmap.md`

- **Purpose:** Estado de la deuda ("Under investigation") y fronteras del ítem.

### REF-03: `docker-compose.yml`, `Dockerfile` y `backend/app/core/limiter.py`

- **Purpose:** Hechos observados sobre el arranque y el límite.

---

## 11. Maintenance Guidelines

This document MUST remain aligned with the feature's agreed intent.

Bump `version` on every change made after the first review or approval. A change to the problem, the scope, the desired outcome, or the success criteria MUST be approved again by the human. Every artifact that lists an older version of this brief in its `upstream` becomes stale and MUST be checked again.

IDs are never reused. An item that no longer applies keeps its heading, marked `[withdrawn]`.

### Source of Truth

- This document is the canonical reference for why the feature exists and what it must achieve.
- The feature's requirements define the exact, observable behavior that delivers it.
- `roadmap.md` holds the item this feature delivers, named in the feature's state record, and the later items that hold what this brief leaves out.
- `product.md` describes the product as a whole; `constitution.md` governs engineering principles and mandatory constraints; `stack.yaml` records the technologies in use.
- The feature's decisions record holds the questions, answers, and approvals behind this brief.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
