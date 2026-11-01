---
artifact: requirements
feature: F002
status: draft
version: 1
upstream: [brief.md@1]
---

# Requirements: Producción rechaza la contraseña de administrador por defecto

> Defines the observable behavior a feature must provide, the acceptance criteria that demonstrate it, and the quality attributes it must meet.
> Once approved, these requirements and the brief they are built from are the contract every later artifact of the feature is checked against.
> Describe WHAT the system must do, never HOW it is built. Keep requirements verifiable and traceable, without duplicating the brief, the design, or project-level documentation.

---

## Conventions

Every requirement, acceptance criterion, and non-functional requirement is defined by a heading that starts with its ID:

- Functional requirements: `### REQ-01: [Title]`
- Acceptance criteria: `#### AC-01.1: [Title]`. `AC-nn.m` belongs to `REQ-nn`.
- Non-functional requirements: `### NFR-01: [Title]`

IDs MUST remain stable once referenced by other artifacts. A withdrawn item keeps its ID and its heading, with `[withdrawn]` appended. Withdrawn IDs are never reused.

Assumption (`ASM`), open-question (`OQ`) and risk (`RISK`) IDs are shared by the whole feature: continue the numbering already used in the brief; never restart at 01.

---

## 1. Functional Requirements

### REQ-01: Producción rechaza la contraseña por defecto

If `ENVIRONMENT` es `production` y `ADMIN_PASSWORD` es el valor por defecto `ChangeMe123!`, then la aplicación shall negarse a arrancar.

- **Priority:** Must
- **Source:** brief.md 5.1, SC-01, Q-02, Q-03
- **Rationale:** El valor por defecto es público; con él cualquiera inicia sesión como administrador.

#### AC-01.1: Valor por defecto fijado explícitamente

- **Given** `ENVIRONMENT=production`, una `SECRET_KEY` de al menos 32 caracteres y `ADMIN_PASSWORD=ChangeMe123!`
- **When** se carga la configuración o se arranca la aplicación
- **Then** el arranque falla antes de aceptar ninguna petición

#### AC-01.2: Valor por defecto implícito

- **Given** `ENVIRONMENT=production`, una `SECRET_KEY` válida y `ADMIN_PASSWORD` sin definir ni en el entorno ni en `backend/.env`
- **When** se carga la configuración o se arranca la aplicación
- **Then** el arranque falla igual que en AC-01.1

#### AC-01.3: Independiente del estado de la base de datos

- **Given** la situación de AC-01.1, y la base de datos con el administrador ya creado, o sin responder
- **When** se arranca la aplicación
- **Then** el arranque falla con el mismo error de AC-01.1, sin depender de la base

### REQ-02: El error dice qué cambiar

When el arranque se rechaza por REQ-01, the application shall mostrar un mensaje en español que nombra `ADMIN_PASSWORD` e indica que hay que definir otra contraseña en producción.

- **Priority:** Must
- **Source:** brief.md 3, 5.1, CON-01, ASM-02
- **Rationale:** El mantenedor tiene que saber qué variable cambiar sin leer el código.

#### AC-02.1: Mensaje en español con el nombre de la variable

- **Given** la situación de AC-01.1
- **When** falla el arranque
- **Then** el mensaje de error contiene `ADMIN_PASSWORD`, está en español y dice que en producción no puede usarse el valor por defecto

#### AC-02.2: El mensaje no imprime contraseñas

- **Given** la situación de AC-01.1
- **When** falla el arranque
- **Then** el mensaje no contiene el texto `ChangeMe123!` ni ningún otro valor de contraseña

### REQ-03: Producción acepta cualquier otra contraseña

While `ENVIRONMENT` es `production` y `ADMIN_PASSWORD` no es exactamente `ChangeMe123!`, the application shall arrancar con normalidad, siempre que el resto de la configuración sea válida.

- **Priority:** Must
- **Source:** brief.md SC-02, ASM-01
- **Rationale:** La regla solo debe impedir el valor público, no cambiar cómo arrancan los despliegues correctos.

#### AC-03.1: Contraseña elegida

- **Given** `ENVIRONMENT=production`, una `SECRET_KEY` válida y `ADMIN_PASSWORD` con otro valor
- **When** se carga la configuración
- **Then** la configuración se carga sin error

#### AC-03.2: Variantes del valor por defecto

- **Given** `ENVIRONMENT=production`, una `SECRET_KEY` válida y `ADMIN_PASSWORD=changeme123!`, o `ChangeMe123! ` con un espacio al final
- **When** se carga la configuración
- **Then** la configuración se carga sin error (la comparación es exacta, ASM-01)

### REQ-04: Desarrollo y test no cambian

While `ENVIRONMENT` es `development` o `test`, the application shall aceptar `ChangeMe123!` como `ADMIN_PASSWORD`, igual que hasta ahora.

- **Priority:** Must
- **Source:** brief.md SC-03, 5.2
- **Rationale:** La plantilla se desarrolla y se prueba con el valor por defecto.

#### AC-04.1: Desarrollo con el valor por defecto

- **Given** `ENVIRONMENT=development` y `ADMIN_PASSWORD` con el valor por defecto o sin definir
- **When** se carga la configuración
- **Then** la configuración se carga sin error

#### AC-04.2: Test con el valor por defecto

- **Given** `ENVIRONMENT=test` y `ADMIN_PASSWORD` con el valor por defecto o sin definir
- **When** se carga la configuración
- **Then** la configuración se carga sin error

### REQ-05: La documentación describe la regla

The README y los archivos de `.sdd/` que tratan la configuración de producción shall decir que en producción `ADMIN_PASSWORD` no puede ser el valor por defecto.

- **Priority:** Should
- **Source:** brief.md 5.1, decisions.md sección 4
- **Rationale:** Un mantenedor que actualiza un derivado necesita saber por qué deja de arrancar (RISK-01).

#### AC-05.1: README

- **Given** la feature terminada
- **When** se lee la tabla de variables y la guía de inicio del README
- **Then** ambas dicen que `ADMIN_PASSWORD` no puede ser `ChangeMe123!` cuando `ENVIRONMENT=production`

#### AC-05.2: Archivos de `.sdd/`

- **Given** la feature terminada
- **When** se leen `architecture.md` (9.2), `product.md` (9.2), `roadmap.md` (RM-01) y NC-007 de `constitution.md`
- **Then** la brecha y la limitación de 9.2 constan como cerradas, RM-01 como entregado y NC-007 recoge que también se rechaza `ADMIN_PASSWORD`

---

## 2. Non-Functional Requirements

### NFR-01: El valor de la contraseña no se imprime

The application shall no imprimir ningún valor de contraseña en el error de arranque ni en los registros que ese error produzca.

- **Priority:** Must
- **Source:** constitution.md NC-007, ASM-02
- **Target:** Cero apariciones de un valor de contraseña
- **Conditions:** Arranque rechazado por REQ-01
- **Verify:** Test que comprueba que el mensaje no contiene `ChangeMe123!` (AC-02.2), e inspección de la salida al arrancar la aplicación en Verify
- **Rationale:** Un secreto no debe terminar en registros, aunque este valor ya sea público.
- **Status:** Confirmed

### NFR-02: Compatibilidad con las pruebas existentes

The backend test suite shall seguir pasando completa sin modificar los valores que usan los tests.

- **Priority:** Must
- **Source:** brief.md SC-03
- **Target:** 87 de 87 tests en verde, sin cambios en sus valores de `ADMIN_PASSWORD` ni de `ENVIRONMENT`
- **Conditions:** `cd backend && uv run pytest -q` con PostgreSQL
- **Verify:** Ejecución de la suite en Verify, con el resultado en la evidencia
- **Rationale:** Si la regla rompiera los tests actuales, afectaría a development o test, que no deben cambiar.
- **Status:** Confirmed

---

## 3. Quality Attributes Considered

- **Rendimiento:** la comprobación ocurre una vez al cargar la configuración; no hay carga ni latencia que medir.
- **Disponibilidad:** negarse a arrancar es el efecto buscado; no hay requisito de continuidad que la regla pueda empeorar (RISK-01).
- **Accesibilidad y usabilidad:** no hay interfaz; el único canal es el mensaje de error, cubierto por REQ-02.
- **Privacidad:** la feature no trata datos personales.

---

## 4. Scope Exclusions

- El mensaje no ofrece ni genera una contraseña alternativa; solo dice qué variable cambiar.

El resto de exclusiones son las no-metas del brief (5.2).

---

## 5. Assumptions and Open Questions

Los supuestos ASM-01 (comparación exacta) y ASM-02 (el mensaje no imprime contraseñas) están en el brief y no se repiten.

### ASM-03: Si fallan a la vez `SECRET_KEY` y `ADMIN_PASSWORD`, basta con nombrar una

- **Basis:** La validación actual de producción informa de un solo error; el mantenedor lo corrige y reintenta.
- **Impact:** REQ-01, REQ-02: en ese caso el arranque falla y el mensaje nombra al menos una de las dos variables.
- **Status:** Unverified
- **Resolution:** Pendiente de que el mantenedor lo confirme al aprobar.

No hay preguntas abiertas.

---

## 6. Traceability and Coverage

- Rechazo del valor por defecto en producción (brief 5.1, SC-01): REQ-01 y REQ-02.
- Sin mirar la base de datos (Q-03): AC-01.3.
- Producción sigue arrancando con otra contraseña (SC-02): REQ-03.
- Desarrollo y test sin cambios (SC-03): REQ-04 y NFR-02.
- Mensaje en español (CON-01): REQ-02. Configuración solo mediante `Settings` (CON-02) y sin dependencias nuevas (CON-03): restricciones de Design, sin comportamiento observable propio.
- Documentación (brief 5.1): REQ-05.

- **Coverage gaps:** None
- **Unresolved dependencies:** None

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
