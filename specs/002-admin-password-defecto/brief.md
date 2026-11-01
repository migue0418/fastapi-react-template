---
artifact: brief
feature: F002
status: approved
version: 1
upstream: []
---

# Brief: Producción rechaza la contraseña de administrador por defecto

> Describes the problem or opportunity behind a feature, who it affects, the outcome it must achieve, how success is measured, and the boundaries of the change.
> Once approved, this document and the requirements built from it are the contract every later artifact of the feature is checked against.
> It describes what is needed and why, never how it is built. Keep it to what is needed to understand and bound the change, without duplicating product, architecture, or requirements content maintained elsewhere.

---

## 1. Problem

Un derivado desplegado con `ENVIRONMENT=production` arranca aunque `ADMIN_PASSWORD` valga `ChangeMe123!`, el valor por defecto de la plantilla. Ese valor está en el repositorio público (`settings.py`, `backend/.example.env`, `README.md`), así que cualquiera que lo lea conoce la contraseña del administrador inicial. Con ella se puede iniciar sesión como `admin` y gestionar usuarios y roles.

Hechos observados (2026-11-01, en el código): la validación de producción de `Settings` solo comprueba que `SECRET_KEY` tenga al menos 32 caracteres. `ADMIN_PASSWORD` no se valida. El administrador inicial se crea al arrancar con esa contraseña (`features/auth/seed.py`).

Lo que afecta al mantenedor es el riesgo, no un incidente: no hay constancia de que ningún derivado se haya desplegado con el valor por defecto. Está registrado como brecha conocida en `architecture.md` (9.2) y contradice PR-003.

---

## 2. Users and Context

- **Mantenedor** (`product.md`, 3.1): crea derivados y los despliega. Copia `backend/.example.env` a `backend/.env`, y es fácil que el valor por defecto llegue a producción sin que nadie lo decida. Necesita que el sistema se lo impida y le diga qué cambiar.
- **Usuario de la aplicación derivada** (`admin` o `user`): no interviene en esta feature, pero es quien queda expuesto si un administrador tiene una contraseña pública.

---

## 3. Desired Outcome

El mantenedor ve que un derivado se niega a arrancar en producción con la contraseña de administrador por defecto, y un mensaje en español le dice qué variable cambiar. Con cualquier otra contraseña, el arranque en producción sigue como hasta ahora, y en desarrollo y en test no cambia nada.

---

## 4. Success Criteria

### SC-01: Producción rechaza el valor por defecto

- **Measurement:** Arrancar la configuración con `ENVIRONMENT=production` y `ADMIN_PASSWORD=ChangeMe123!` falla antes de aceptar peticiones, con un mensaje que nombra `ADMIN_PASSWORD`. Se comprueba con un test y arrancando la aplicación.
- **Baseline:** Hoy arranca sin error (comprobado en `settings.py`; se reproducirá en Verify).
- **Target:** Falla siempre, con independencia de si el administrador ya existe en la base.

### SC-02: Producción acepta una contraseña elegida

- **Measurement:** Con `ENVIRONMENT=production`, una `SECRET_KEY` válida y una `ADMIN_PASSWORD` distinta del valor por defecto, la configuración se carga y la aplicación arranca.
- **Baseline:** Hoy arranca.
- **Target:** Sigue arrancando.

### SC-03: Desarrollo y test no cambian

- **Measurement:** La suite de backend completa y el arranque con `ENVIRONMENT=development` o `test` y el valor por defecto.
- **Baseline:** 87 de 87 tests en verde (`product.md`, 9.1).
- **Target:** La suite sigue en verde, sin modificar los valores que usan los tests.

---

## 5. Scope

### 5.1 In Scope

- Rechazar, cuando `ENVIRONMENT=production`, el valor exacto `ChangeMe123!` en `ADMIN_PASSWORD`, al cargar la configuración y sin mirar la base de datos (Q-02, Q-03).
- Un mensaje de error en español que nombre `ADMIN_PASSWORD` y diga qué hacer, en el estilo del que ya existe para `SECRET_KEY`.
- Actualizar la documentación que describe la configuración de producción y cerrar la brecha en los archivos de `.sdd/` (ver el registro de decisiones, sección 4).

### 5.2 Non-Goals

- Rechazar otras contraseñas débiles o exigir longitud o complejidad mínima: el mantenedor eligió solo el valor por defecto (Q-02). No se ha creado item de roadmap por ello.
- `SECRET_KEY`: ya se rechaza por longitud.
- Las credenciales de PostgreSQL de `docker-compose.yml`: RM-03.
- `ADMIN_USERNAME`: no se valida.
- Cambiar el valor por defecto, `backend/.example.env` o el comportamiento en `development` y `test`.
- Cambiar la contraseña de un administrador ya existente en la base de datos.

---

## 6. Constraints

### CON-01: Mensajes en español

- **Source:** NC-009. Los tests comprueban los mensajes exactos.

### CON-02: Configuración solo mediante `Settings`

- **Source:** NC-003. La validación de producción vive en un único punto.

### CON-03: Sin dependencias nuevas

- **Source:** NC-008. El cambio no necesita ninguna.

---

## 7. Assumptions

### ASM-01: Comparación exacta

- **Basis:** Q-02: el mantenedor eligió rechazar solo el valor por defecto.
- **Default:** Se rechaza únicamente el texto exacto `ChangeMe123!`, distinguiendo mayúsculas y sin recortar espacios. Cualquier variante se acepta.
- **Impact if incorrect:** Una variante trivial (`changeme123!`) pasaría. Quedaría cubierta por una regla de contraseñas débiles, fuera de alcance.
- **Status:** Unverified

### ASM-02: El mensaje no necesita repetir el valor

- **Basis:** El valor ya es público, pero el mensaje solo tiene que nombrar la variable.
- **Default:** El mensaje nombra `ADMIN_PASSWORD` y no imprime ningún valor de contraseña (NC-007).
- **Impact if incorrect:** Ninguno funcional.
- **Status:** Unverified

---

## 8. Open Questions

No hay preguntas abiertas.

---

## 9. Risks

### RISK-01: Un derivado ya desplegado deja de arrancar al actualizar

- **Likelihood:** Medium
- **Impact:** Low
- **Mitigation:** Es el efecto buscado y lo aceptó el mantenedor (Q-03). El mensaje dice qué cambiar, y el README lo explica. Un derivado no recibe automáticamente las mejoras de la plantilla (`product.md`, 2.3), así que solo ocurre cuando decide actualizar.

### RISK-02: La comprobación se salta si `ENVIRONMENT` no vale exactamente `production`

- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** `ENVIRONMENT` solo admite `development`, `production` y `test` (cualquier otro valor ya falla). Fuera del alcance: hacer producción el valor por defecto.

---

## 10. References

### REF-01: `backend/app/core/settings.py` y `backend/app/features/auth/seed.py`

- **Purpose:** Comportamiento actual observado en el problema.

### REF-02: `.sdd/roadmap.md` (RM-01) y `.sdd/architecture.md` (9.2)

- **Purpose:** Origen del item y de la brecha.

### REF-03: `.sdd/constitution.md` (PR-003, NC-003, NC-007, NC-009)

- **Purpose:** Principio y restricciones que aplican.

Limitación de la evidencia: el problema se ha comprobado leyendo el código, todavía no arrancando la aplicación; Verify lo reproducirá.

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
