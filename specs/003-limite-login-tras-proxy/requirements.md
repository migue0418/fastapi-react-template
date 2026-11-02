---
artifact: requirements
feature: F003
status: draft
version: 1
upstream: [brief.md@1]
---

# Requirements: El límite de login se aplica por cliente real tras un proxy

> Defines the observable behavior a feature must provide, the acceptance criteria that demonstrate it, and the quality attributes it must meet.
> Once approved, these requirements and the brief they are built from are the contract every later artifact of the feature is checked against.
> Describe WHAT the system must do, never HOW it is built.

---

## Conventions

Every requirement, acceptance criterion, and non-functional requirement is defined by a heading that starts with its ID:

- Functional requirements: `### REQ-01: [Title]`
- Acceptance criteria: `#### AC-01.1: [Title]`. `AC-nn.m` belongs to `REQ-nn`.
- Non-functional requirements: `### NFR-01: [Title]`

IDs MUST remain stable once referenced by other artifacts. A withdrawn item keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Assumption (`ASM`), open-question (`OQ`) and risk (`RISK`) IDs are shared by the whole feature: continue the numbering already used in the brief; never restart at 01.

Terminología: "endpoints limitados" son `POST /api/auth/login`, `POST /api/auth/token` y `POST /api/auth/refresh`, los tres con límite por cliente hoy. "Rechazo por exceso" es la respuesta HTTP 429 que ya devuelven al superar su límite. "Proxy de confianza" es el proxy cuya IP el despliegue ha declarado mediante la variable de configuración de REQ-03.

---

## 1. Functional Requirements

### REQ-01: Sin proxy de confianza, la IP es la de la conexión

While no proxy de confianza is configured, the system shall apply the limit of the endpoints limitados to the IP of the connection and ignore the `X-Forwarded-For` header.

- **Priority:** Must
- **Source:** brief.md@1, 3, 5.1, CON-01; SC-02; Q-01
- **Rationale:** Es el valor por defecto seguro: una cabecera falsificada no debe servir para saltarse el límite (PR-003).

#### AC-01.1: Una cabecera falsificada no evita el límite

- **Given** un despliegue sin proxy de confianza configurado y un cliente que no ha superado el límite de `POST /api/auth/login`
- **When** ese cliente envía más intentos que el límite, cada uno con un `X-Forwarded-For` con una IP distinta
- **Then** al superar el límite recibe el rechazo por exceso, como si no enviara la cabecera

#### AC-01.2: Sin cabecera, el comportamiento actual no cambia

- **Given** un despliegue sin proxy de confianza configurado
- **When** un cliente envía una petición a un endpoint limitado sin `X-Forwarded-For`
- **Then** el límite se aplica a la IP de su conexión, igual que antes de esta feature

### REQ-02: Con proxy de confianza, cada cliente real tiene su cupo

While a proxy de confianza is configured, when a request arrives from that proxy with `X-Forwarded-For`, the system shall apply the limit of the endpoints limitados to the client IP the header reports, independently of other clients.

- **Priority:** Must
- **Source:** brief.md@1, 3, 5.1; SC-01
- **Rationale:** Es el resultado de RM-02: que un cliente que agota su cupo no bloquee a los demás.

#### AC-02.1: Un cliente agotado no afecta a otro

- **Given** un proxy de confianza configurado y dos clientes con IPs distintas, A y B, que llegan a través de él
- **When** A supera el límite de `POST /api/auth/login`, y después B envía un intento de login
- **Then** A recibe el rechazo por exceso y B recibe la respuesta normal del login (éxito o credenciales inválidas), sin rechazo por exceso

#### AC-02.2: El mismo cliente sigue limitado

- **Given** el mismo despliegue y cliente A tras el proxy
- **When** A supera el límite de cada endpoint limitado
- **Then** A recibe el rechazo por exceso en cada uno, también cuando A se conecta por conexiones distintas del proxy

#### AC-02.3: Una conexión que no es del proxy de confianza no puede elegir su IP

- **Given** un proxy de confianza configurado
- **When** una conexión que no procede del proxy de confianza envía `X-Forwarded-For` con una IP distinta en cada intento
- **Then** los intentos se limitan por la IP de esa conexión y la cabecera se ignora

### REQ-03: Un proxy de confianza se declara con una sola variable

Where the deployer defines the variable for the proxy de confianza in `backend/.env`, the system shall honor it for the endpoints limitados without requiring any other configuration change.

- **Priority:** Must
- **Source:** brief.md@1, 3, SC-03; Q-01
- **Rationale:** Quien despliega solo debe tocar un valor.

#### AC-03.1: La variable basta

- **Given** un despliegue con Compose, sin proxy de confianza configurado, y `backend/.env` sin esa variable
- **When** se define solo esa variable con la IP o red del proxy y se reinicia el servicio
- **Then** se cumplen AC-02.1 a AC-02.3, sin otro cambio

#### AC-03.2: Sin la variable se mantiene el valor por defecto seguro

- **Given** una configuración sin esa variable
- **When** el servicio arranca
- **Then** se cumplen AC-01.1 y AC-01.2

### REQ-04: La configuración y la documentación reflejan el comportamiento comprobado

The system's example configuration and the deployment documentation shall name the variable for the proxy de confianza, say what it does and warn against over-broad values, and match the behavior shown by the checks.

- **Priority:** Must
- **Source:** brief.md@1, 5.1, SC-03, CON-03
- **Rationale:** Sin la variable a la vista, el mantenedor tendría que adivinarla; una documentación que no coincide con la ejecución real engaña.

#### AC-04.1: La configuración de ejemplo muestra la variable

- **Given** `backend/.example.env`
- **When** el mantenedor lo lee
- **Then** contiene la variable, comentada, con un valor de ejemplo que no es un comodín (`*`) y una nota en español de cuándo definirla

#### AC-04.2: El README coincide con lo comprobado

- **Given** la sección "Despliegue detrás de un proxy" del README
- **When** se compara con los resultados de AC-01.1, AC-02.1 y AC-02.3
- **Then** cada afirmación sobre el cupo compartido, la variable y la falsificación coincide con lo observado, o se corrige

---

## 2. Non-Functional Requirements

### NFR-01: Evidencia ejecutada de las pruebas

The checks of REQ-01 to REQ-03 shall be run against the real application and the results recorded.

- **Priority:** Must
- **Source:** PR-002, NC-006, brief.md@1, ASM-03
- **Target:** AC-01.1, AC-02.1 y AC-02.3 ejecutados contra la aplicación en marcha, con IPs de origen distintas; lo que no se pueda ejecutar se declara no verificado
- **Conditions:** Entorno local con Compose; el límite es en memoria y de una sola réplica
- **Verify:** Registro de ejecución en la evidencia de Verify
- **Status:** Confirmed

### NFR-02: Los límites actuales no cambian

The limits of the endpoints limitados (10/minuto para login y token, 20/minuto para refresh) and the endpoints they apply to shall not change.

- **Priority:** Must
- **Source:** brief.md@1, 5.2
- **Target:** Los mismos valores y endpoints que antes de la feature
- **Conditions:** Cualquier despliegue
- **Verify:** Tests de backend existentes de límite y comparación con `main`
- **Status:** Confirmed

---

## 3. Quality Attributes Considered

- **Rendimiento:** no aplica; la feature no cambia el trabajo por petición.
- **Seguridad:** tratada en REQ-01, REQ-02 y AC-02.3.
- **Accesibilidad y usabilidad de la interfaz:** no aplica; no hay cambios de interfaz.

---

## 4. Scope Exclusions

- Los contadores compartidos entre réplicas o workers, y el aviso o rechazo en el arranque sin proxy configurado, siguen fuera, como en el brief.
- No se comprueba ningún proxy concreto (nginx, Caddy, Traefik): solo el comportamiento de la aplicación ante la cabecera.

---

## 5. Assumptions and Open Questions

Los de la feature están en el brief: ASM-01 a ASM-03 y OQ-01 (si la comprobación no reproduce el fallo, la feature se cierra con la evidencia y REQ-02 y REQ-03 se verifican como ya cumplidos).

### ASM-04: El rechazo por exceso es el 429 actual

- **Basis:** El limitador actual devuelve 429 al superar el cupo.
- **Impact:** Los criterios AC-01.1, AC-02.1 y AC-02.2.
- **Status:** Unverified
- **Resolution:** Se confirma en la ejecución de Verify.

---

## 6. Traceability and Coverage

- **Coverage gaps:** None. SC-01 (REQ-02), SC-02 (REQ-01, AC-02.3), SC-03 (REQ-03, REQ-04), CON-01 (REQ-01, AC-03.2).
- **Unresolved dependencies:** None.

---

## 7. Maintenance Guidelines

This document MUST remain aligned with the approved brief and with the behavior the feature is intended to have.

Bump `version` on every change made after the first review or approval, and keep `upstream` pointing to the version of the brief these requirements are built from. When the brief's version changes, check these requirements again: confirm them by updating `upstream`, or revise them.

A change to the required behavior, the scope, or the acceptance criteria MUST be approved again by the human. Every artifact that lists an older version of this document in its `upstream` becomes stale and MUST be checked again.

### Source of Truth

- This document is the canonical reference for the feature's required behavior and qualities.
- The feature's brief defines why the feature exists, its desired outcome, and its scope.
- The feature's design defines how the requirements are met; it never changes them.
- `constitution.md` governs engineering principles and mandatory constraints that apply to every feature.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
