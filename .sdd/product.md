---
artifact: product
version: 2
status: active
owner: Mantenedor de la plantilla (Miguel Ángel Benítez)
---

# FastAPI Template

> Describes the product's purpose, business context, users, capabilities, domain concepts, objectives, and boundaries.
> This document is the canonical reference for understanding what the product is, why it exists, whom it serves, and what it aims to achieve. It provides persistent product context for requirements discovery, specification writing, architectural decisions, and implementation.
> This is a living document. Keep it aligned with the product as it evolves, without duplicating detailed requirements, technical architecture, or implementation plans maintained elsewhere.

---

## 1. Product Overview

### 1.1 Purpose

Es una plantilla full-stack para arrancar proyectos nuevos con FastAPI, React y PostgreSQL. El producto es la propia plantilla: evita repetir en cada proyecto la autenticación, la gestión de usuarios y roles, la interfaz base, el despliegue en contenedores y el renombrado inicial.

### 1.2 Value Proposition

Un proyecto nuevo parte de una base que ya funciona, con tests y documentación, y su trabajo se concentra desde el primer día en lo específico de su dominio.

### 1.3 Product Vision

Que un proyecto derivado pueda llegar a producción sin heredar riesgos por defecto, con comprobaciones automáticas en cada cambio y con lo necesario para diagnosticarlo en operación.

---

## 2. Business Context

### 2.1 Domain and Operating Context

Herramienta personal de desarrollo. El repositorio es público en GitHub, pero no hay compromiso de soporte a terceros.

### 2.2 Problem and Opportunity

Montar y mantener la misma base en cada proyecto cuesta tiempo y produce diferencias entre ellos. Una base única hace que cada mejora de seguridad o calidad sirva para los proyectos que nazcan después.

### 2.3 Existing Solutions and Processes

Ya existe al menos un proyecto derivado (`gestorbibliografico`). Un derivado no recibe automáticamente las mejoras posteriores de la plantilla.

---

## 3. Users and Stakeholders

### 3.1 User Groups

- **Name:** Mantenedor
- **Role:** Mantiene la plantilla y la usa para crear proyectos derivados. Es la misma persona en ambos papeles.
- **Goals and needs:** Arrancar un proyecto en poco tiempo y confiar en lo que hereda, incluido en producción.
- **Relevant context:** Trabaja con agentes de Claude Code y flujo SDD.

- **Name:** Usuario de la aplicación derivada
- **Role:** Usa la aplicación ya desplegada, con rol `admin` o `user`.
- **Goals and needs:** Iniciar sesión con seguridad, gestionar su perfil y sus sesiones; el `admin` también gestiona usuarios y roles.
- **Relevant context:** No conoce la plantilla; los textos que ve están en español.

### 3.2 Other Stakeholders

No hay otros interesados identificados.

---

## 4. Product Capabilities

### CAP-01: Autenticación y sesiones

- **Purpose:** Dar acceso seguro a la aplicación sin que cada proyecto lo reconstruya.
- **Primary users:** Usuario de la aplicación derivada
- **Scope:** Login, token de acceso y refresh rotatorio con detección de reutilización, logout, bloqueo por intentos fallidos, listado y revocación de sesiones, autorización por roles y administrador inicial.
- **Status:** Current

### CAP-02: Administración de usuarios y roles

- **Purpose:** Permitir que un `admin` gestione quién accede y con qué permisos.
- **Primary users:** Usuario de la aplicación derivada (`admin`)
- **Scope:** CRUD de usuarios y roles, restablecimiento y cambio de contraseña, y desbloqueo de cuentas.
- **Status:** Current

### CAP-03: Interfaz base

- **Purpose:** Ofrecer la estructura visual sobre la que un derivado añade sus pantallas.
- **Primary users:** Usuario de la aplicación derivada
- **Scope:** Login, estructura con navegación, inicio, perfil, sesiones, usuarios y componentes compartidos propios.
- **Status:** Current

### CAP-04: Arranque de un proyecto derivado

- **Purpose:** Convertir la plantilla en un proyecto con nombre propio con un solo comando.
- **Primary users:** Mantenedor
- **Scope:** `scripts/rename_project.py`, guía de inicio del README y la configuración de ejemplo.
- **Status:** Current

### CAP-05: Despliegue en contenedores

- **Purpose:** Ejecutar el sistema completo de forma reproducible.
- **Primary users:** Mantenedor
- **Scope:** Imagen Docker sin secretos y con usuario sin privilegios, Docker Compose con PostgreSQL, migraciones en el arranque y `/health`.
- **Status:** Current

### CAP-06: Producción segura por defecto

- **Purpose:** Que un derivado no llegue a producción expuesto por valores por defecto de la plantilla.
- **Primary users:** Mantenedor
- **Scope:** Rechazo de secretos por defecto, rate limiting correcto tras un proxy, credenciales de Compose, y superficie HTTP en producción.
- **Status:** Planned

### CAP-07: Integración continua

- **Purpose:** Comprobar cada cambio automáticamente.
- **Primary users:** Mantenedor
- **Scope:** Lint, tests y build en cada pull request; calidad del código Python.
- **Status:** Planned

### CAP-08: Observabilidad

- **Purpose:** Poder diagnosticar un derivado en operación.
- **Primary users:** Mantenedor
- **Scope:** Logs estructurados de las peticiones.
- **Status:** Planned

---

## 5. Domain Concepts and Business Rules

### 5.1 Key Domain Concepts

- **Term:** Plantilla
- **Definition:** Este repositorio, del que se crean otros proyectos.
- **Relationships:** Origen de los proyectos derivados.

- **Term:** Proyecto derivado
- **Definition:** Repositorio creado desde la plantilla y renombrado con `scripts/rename_project.py`. Revisa `.sdd/` en su propio onboarding.
- **Relationships:** Hereda el código de la plantilla en el momento de crearse.

- **Term:** Sesión
- **Definition:** Refresh token activo de un usuario, revocable por separado.
- **Relationships:** Pertenece a un usuario.

- **Term:** Rol del sistema
- **Definition:** Los roles `admin` y `user`, que siempre existen y no se pueden renombrar.
- **Relationships:** Un usuario tiene uno o varios roles.

### 5.2 Business Rules

- **Identifier:** BR-01
- **Rule:** No se puede eliminar, desactivar ni degradar al último `admin` activo.
- **Rationale:** Evita dejar el sistema sin administración.
- **Source:** `docs/data-model.md`

- **Identifier:** BR-02
- **Rule:** Cinco intentos de login fallidos seguidos bloquean la cuenta 15 minutos, y el login responde igual si el usuario no existe, la contraseña es incorrecta o la cuenta está bloqueada.
- **Rationale:** Frena los ataques de fuerza bruta sin revelar qué cuentas existen.
- **Source:** `docs/behaviour/auth.md`

- **Identifier:** BR-03
- **Rule:** Reutilizar un refresh token ya revocado revoca todas las sesiones de ese usuario.
- **Rationale:** La reutilización indica que un token puede estar comprometido.
- **Source:** `docs/behaviour/auth.md`

- **Identifier:** BR-04
- **Rule:** Desactivar o eliminar un usuario, o cambiar o restablecer su contraseña, revoca sus refresh tokens.
- **Rationale:** Un cambio de credenciales o de acceso cierra las sesiones abiertas.
- **Source:** `docs/data-model.md`

---

## 6. Objectives and Success Criteria

- **Objective:** Arrancar un proyecto nuevo sin reconstruir la base.
- **Rationale:** Es la razón de ser de la plantilla.
- **Success criteria:** Tras renombrar y configurar `backend/.env`, el proyecto arranca con sus tests en verde.
- **Measurement:** Sin métrica definida.

- **Objective:** Que un derivado no llegue a producción con riesgos por defecto.
- **Rationale:** Es el foco elegido por el mantenedor para los próximos incrementos.
- **Success criteria:** Provisional: producción rechaza los valores por defecto inseguros (RM-01 a RM-04).
- **Measurement:** Sin métrica definida.

---

## 7. Scope and Boundaries

### 7.1 In Scope

Las capacidades de la sección 4: la base común que necesita un derivado y la experiencia de crearlo y llevarlo a producción.

### 7.2 Out of Scope

- Lógica de negocio de un dominio concreto.
- Soporte, compatibilidad o procesos de contribución para terceros.
- Propagar automáticamente las mejoras a los derivados ya creados.
- Por ahora, otras piezas comunes como recuperar la contraseña por email o auditoría: el mantenedor no las ha elegido como foco.

### 7.3 External Dependencies and Responsibility Boundaries

Quien despliega un derivado aporta el proxy con TLS, el host y los secretos reales. La plantilla no incluye proxy ni infraestructura.

---

## 8. Constraints, Assumptions, and Dependencies

### 8.1 Constraints

- Uso personal de un solo mantenedor (decisión del mantenedor).
- El repositorio es público: nada sensible puede versionarse (ver NC-007).
- No se han identificado obligaciones legales, regulatorias ni contractuales para la plantilla. Un derivado revisa las suyas.

### 8.2 Assumptions and Open Questions

- **Description:** `.sdd/` se hereda y cada derivado lo adapta en su propio onboarding.
- **Status:** Unverified
- **Impact:** Si el renombrado o el onboarding no lo resuelven bien, un derivado podría conservar el roadmap o el producto de la plantilla.
- **Next step:** Comprobarlo al crear el próximo derivado.

### 8.3 External Dependencies

No hay dependencias de negocio u organizativas.

---

## 9. Product State and Direction

### 9.1 Current State

La plantilla funciona y ya se ha usado para al menos un derivado. El 2026-11-01 se verificó: 87 de 87 tests de backend sobre un PostgreSQL temporal, 24 de 24 de frontend, ESLint limpio y build de frontend correcto. No se verificó el despliegue real de un derivado ni el build de la imagen Docker en esa fecha.

### 9.2 Known Gaps and Limitations

- Producción rechaza la `SECRET_KEY` por defecto, pero no la contraseña de administrador ni las credenciales de Compose.
- No hay comprobaciones automáticas en los pull requests.
- No hay logging para diagnosticar en operación.

### 9.3 Intended Evolution

Compromiso del mantenedor: producción segura primero, después integración continua y observabilidad. El orden está en `roadmap.md`.

---

## 10. References

- `docs/behaviour/`: contrato detallado del comportamiento actual, por área.
- `docs/data-model.md`: entidades y reglas de datos.
- `README.md`: cómo empezar un proyecto y cómo desarrollar.

---

## 11. Maintenance Guidelines

This document MUST remain aligned with the product's intended purpose, scope, and behavior.

Update it when changes materially affect:

- The product's purpose, value proposition, or business context.
- The needs or responsibilities of its primary users.
- Its major capabilities or product boundaries.
- Shared domain concepts or enduring business rules.
- Product objectives or success criteria.
- Important business constraints, assumptions, or dependencies.
- The distinction between current capabilities and intended evolution.

When a change affects a single feature without changing the broader product context, document the change in the relevant specification rather than expanding this file unnecessarily.

When product discovery or implementation reveals that an established assumption is incorrect, update the affected sections and review any dependent specifications or decisions.

### Source of Truth

- This document is the canonical reference for persistent, product-level context.
- `constitution.md` governs enduring engineering principles, mandatory constraints, practices, and governance.
- `stack.yaml` records the project's technology stack and technical choices according to its defined schema.
- `architecture.md` describes the system's architecture and how its components work together.
- `roadmap.md` holds the increments that will build the planned capabilities, and their order.
- Individual specifications define detailed requirements, expected behavior, and acceptance criteria for particular capabilities or changes.
- Other specialized artifacts MAY provide more detailed information for their respective areas of responsibility.

When information changes, update its authoritative source rather than maintaining competing copies across documents.

If a change creates a contradiction between this document and another artifact, identify the conflict and reconcile the affected documents.

Do not present planned capabilities, unverified assumptions, or proposed business rules as established facts.
