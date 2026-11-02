---
artifact: adr
id: ADR-0001
title: La confianza en las cabeceras de un proxy se delega en uvicorn
status: proposed
decided-by: design
decision: null
date: 2026-11-02
features: [F003]
supersedes: []
superseded-by: []
---

# ADR-0001: La confianza en las cabeceras de un proxy se delega en uvicorn

> Records one architecturally significant decision: the problem, the options considered, the choice made, and its consequences.

---

## 1. Context and Problem Statement

El limitador de login cuenta por `request.client.host`. Tras un proxy esa IP es la del proxy, salvo que alguien decida de qué conexiones se acepta `X-Forwarded-For`. ¿Quién toma esa decisión y dónde se configura, sin permitir que un cliente falsifique su IP (`F003:REQ-01`) y con una sola variable para quien despliega (`F003:REQ-03`)?

---

## 2. Decision Drivers

- `F003:REQ-01`: sin proxy de confianza configurado, la cabecera se ignora.
- `F003:REQ-03`: una sola variable basta.
- PR-003: seguro por defecto para los derivados.
- NC-003 y `F003:CON-04`: configuración por `Settings` o por el servidor.
- NC-008 y PR-004: sin dependencias ni código innecesarios.

---

## 3. Considered Options

### Option A: Delegar en uvicorn con `FORWARDED_ALLOW_IPS`

- **Description:** uvicorn ya reescribe `client` según esa variable; la feature la documenta y la comprueba.
- **Pros:** Sin código nuevo; comportamiento mantenido por el servidor; la lista de confianza se aplica con el algoritmo de "primera IP no confiada desde la derecha".
- **Cons:** Un valor mal escrito se trata como literal, sin aviso; la variable vive fuera de `Settings`.
- **Fit:** Cumple todos los drivers.
- **Reversal cost:** Low, solo configuración y documentación.
- **Operational cost:** Ninguno añadido.

### Option B: Middleware propio configurado con un campo de `Settings`

- **Description:** `ProxyHeadersMiddleware` registrado en `create_app` con una lista leída de `Settings`.
- **Pros:** La configuración pasa por `Settings` y puede validarse y avisar de valores inválidos.
- **Cons:** Duplica lo que uvicorn ya hace, y dos mecanismos podrían entrar en conflicto; código y tests nuevos.
- **Fit:** Cumple los drivers con más superficie.
- **Reversal cost:** Low.
- **Operational cost:** Mantener código propio de seguridad.

### Option C: Clave del limitador que lee `X-Forwarded-For`

- **Description:** `key_func` propia que toma la cabecera directamente.
- **Pros:** Sin configuración.
- **Cons:** Cualquier cliente falsifica su IP: incumple `F003:REQ-01` y PR-003.
- **Fit:** No cumple.
- **Reversal cost:** Low.
- **Operational cost:** Ninguno, pero deja el límite sin efecto.

---

## 4. Decision

Chosen option: "Option A", porque cumple los requisitos sin código nuevo y delega en el servidor una decisión de seguridad ya implementada. Decidida por el diseño; no es una puerta de un solo sentido.

---

## 5. Consequences

- **Positive:** Sin cambios en el código de aplicación; el valor por defecto de uvicorn se conserva.
- **Negative:** Un valor mal escrito falla cerrado y en silencio (F003:RISK-03).
- **Required:** README y `.example.env` nombran la variable; la comprobación se ejecuta contra la aplicación real.

---

## 6. Confirmation

La comprobación de F003 (T-02, repetida en Verify) y la revisión de que `limiter.py` y los decoradores no cambian.

---

## 7. More Information

Diseño: `specs/003-limite-login-tras-proxy/design.md`. Evidencia: uvicorn 0.47.0, `config.py` y `middleware/proxy_headers.py`. Se revisa si el limitador pasa a contadores compartidos entre réplicas o si se incluye un proxy en la plantilla.

---

## 8. Maintenance Guidelines

An ADR is immutable once accepted. A proposed ADR may be revised freely until it is accepted.

### Source of Truth

- This document is the canonical record of this decision and its reasoning.
- `architecture.md` summarizes the decisions that shape the system and references their ADRs.
