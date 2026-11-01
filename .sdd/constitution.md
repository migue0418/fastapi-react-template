---
artifact: constitution
version: 1.0.0
status: active
owner: Mantenedor de la plantilla (Miguel Ángel Benítez)
---

# Project Constitution

> Defines the enduring engineering principles, mandatory constraints, and practices governing the evolution of this software system. All specifications, designs, implementations, and verification activities MUST respect the applicable rules established here.

---

## 1. Principles

### PR-001 — Cada responsabilidad en su sitio

**Statement**
El código se organiza por slices verticales, y cada capa tiene una única responsabilidad.

**Rationale**
La plantilla se copia a cada proyecto derivado: una frontera que se difumina aquí se multiplica en todos ellos.

**Implications**
Los diseños parten de los slices existentes y las revisiones rechazan lógica fuera de su capa. Las reglas verificables están en NC-001 a NC-003.

**Normative level**
MUST

### PR-002 — Evidencia ejecutada

**Statement**
Un cambio solo está terminado cuando sus comprobaciones se han ejecutado y se ha visto su resultado.

**Rationale**
El trabajo lo hace en gran parte un agente: una afirmación sin ejecución no aporta garantías.

**Implications**
Cada tarea y cada feature dejan constancia de lo ejecutado. Lo que no se pudo ejecutar se declara como no verificado. Ver NC-006.

**Normative level**
MUST

### PR-003 — Seguro por defecto para los derivados

**Statement**
Un proyecto derivado desplegado en producción no debería quedar expuesto por un valor por defecto de la plantilla.

**Rationale**
Un derivado hereda la configuración tal cual, y un valor pensado para desarrollo puede llegar a producción sin que nadie lo decida.

**Implications**
Ante un valor cómodo pero inseguro, producción lo rechaza o exige una decisión explícita. La situación actual no lo cumple del todo: ver `architecture.md` (sección 9.2) y RM-01 a RM-04 en `roadmap.md`.

**Normative level**
SHOULD

### PR-004 — Proceso proporcional a un solo mantenedor

**Statement**
Las prácticas se mantienen tan ligeras como permita conservar la trazabilidad y la verificación.

**Rationale**
La plantilla la usa una sola persona: el proceso pensado para equipos o terceros añade coste sin aportar valor.

**Implications**
No se añaden compatibilidad con terceros, procesos de contribución ni herramientas por si acaso. Si cambia quién usa la plantilla, esta constitución se revisa.

**Normative level**
GUIDANCE

---

## 2. Non-Negotiable Constraints

### NC-001 — Capas del backend

**Rule**
Los routers MUST limitarse a resolver dependencias, llamar al service y devolver el `response_model`. La lógica de negocio MUST vivir en `service.py` y el acceso a datos en `repository.py`. Los endpoints MUST estar bajo `/api/`, salvo la señal de salud `/health`. Los routers nuevos MUST registrarse en `backend/app/main.py`, y los modelos nuevos en `import_model_modules`.

**Rationale**
Es la frontera que hace predecibles los slices y evita duplicar reglas de negocio.

### NC-002 — Acceso HTTP del frontend

**Rule**
Todo acceso al backend MUST pasar por `frontend/src/shared/api/http.ts`, envuelto en el `api.ts` de cada feature. Los componentes MUST NOT usar `fetch` directamente.

**Rationale**
El cliente compartido centraliza el token, el reintento tras un 401 y la conversión de errores.

### NC-003 — Configuración centralizada

**Rule**
El código de dominio MUST leer la configuración mediante `Settings` y MUST NOT leer variables de entorno directamente.

**Rationale**
La validación de la configuración vive en un único punto, incluida la de producción.

### NC-004 — Datos

**Rule**
Todo cambio de schema MUST ir acompañado de una migración Alembic en `backend/alembic/versions/`. El acceso a datos MUST usar `AsyncSession` y APIs async, sin sesiones síncronas.

**Rationale**
Las migraciones se aplican en el arranque, y una sesión síncrona bloquearía el bucle de eventos.

### NC-005 — Tests sobre la base real

**Rule**
Los tests del backend MUST ejecutarse contra PostgreSQL y MUST NOT usar SQLite. Los tests de integración de endpoints MUST NOT mockear la base de datos.

**Rationale**
Un motor distinto oculta diferencias de comportamiento que luego fallan en producción.

### NC-006 — El agente ejecuta la verificación

**Rule**
El agente MUST ejecutar él mismo las pruebas que correspondan al cambio (ver EP-006) y MUST NOT delegarlas en el mantenedor. MUST restaurar el estado de la base de datos cuando la mute. Lo que no se haya ejecutado MUST NOT darse por hecho.

**Rationale**
Es la condición para confiar en el trabajo del agente sin repetirlo a mano.

### NC-007 — Secretos

**Rule**
Los secretos reales MUST NOT commitearse ni imprimirse. Los valores por defecto versionados (`ChangeMe123!`, `change-this-secret-key`, `postgres:postgres`) son solo para desarrollo y MUST NOT usarse en producción.

**Rationale**
El repositorio es público. Hoy producción solo rechaza la `SECRET_KEY` por defecto, por su longitud. Impedir los demás es la transición de RM-01 y RM-03, y hasta entonces es responsabilidad de quien despliega.

### NC-008 — Dependencias

**Rule**
El agente MUST NOT añadir ni instalar dependencias nuevas sin la confirmación del mantenedor.

**Rationale**
Cada dependencia la heredan todos los derivados.

### NC-009 — Idioma

**Rule**
Los mensajes al usuario, los `detail` de error y la documentación MUST estar en español. Los identificadores de código MUST estar en inglés.

**Rationale**
Es la convención del proyecto, y los tests comprueban los mensajes exactos.

---

## 3. Practices

### EP-001 — Nombres de rama

**Practice**
Las features SDD usan `feature/NNN-<slug>`, y cada tarea una rama `task/NNN-T-nn` creada desde ella. Los cambios fuera de una feature usan `chore/<slug>`.

**Normative level**
MUST

**Applicability**
Todo cambio versionado. Incluye los del agente.

### EP-002 — Mensajes de commit

**Practice**
Commits convencionales en español (`feat:`, `fix:`, `docs:`, `chore:`...). Un commit hecho para una tarea indica en el cuerpo su feature y su tarea, por ejemplo `F001 T-02`.

**Normative level**
MUST

**Applicability**
Todo commit.

### EP-003 — Integración por PR

**Practice**
Todo cambio entra en `main` por un pull request. Nada se commitea directamente en `main`, y el agente nunca hace merge: lo hace el mantenedor.

**Normative level**
MUST

**Applicability**
Todo cambio. La sección 5.2 registra la única excepción, ya cerrada.

### EP-004 — Test primero

**Practice**
Escribir primero el test que falla cuando encaje con el cambio, y siempre al corregir un bug.

**Normative level**
SHOULD

**Applicability**
Cambios de comportamiento en backend y frontend.

### EP-005 — Documentación en el mismo cambio

**Practice**
Actualizar la documentación afectada dentro del mismo cambio, según `.sdd/documentation.yaml` y `docs/documentation-standards.md`.

**Normative level**
MUST

**Applicability**
Cambios de contratos de API, modelo de datos, arquitectura, convenciones, comandos o flujo de trabajo.

### EP-006 — Verificación según el cambio

**Practice**
Seguir `docs/verification-guide.md`: suite de backend en todo cambio de backend, `curl` en endpoints nuevos o cambiados, lint, tests y build en cambios de frontend, E2E con Playwright MCP si cambia la UI, y las comprobaciones de Compose si cambia Docker.

**Normative level**
MUST

**Applicability**
Toda tarea y toda feature, según lo que toquen.

---

## 4. Quality and Verification

- Applicable mandatory constraints MUST have an identifiable verification method.
- Verification MUST be proportionate to the risk and impact of the change.
- Mandatory requirements MUST have appropriate verification evidence before the relevant change is accepted.
- Automated checks SHOULD be used when they provide reliable, repeatable evidence.
- Engineering judgment MAY be required when a principle cannot be assessed mechanically.
- Material verification gaps MUST be resolved or handled through an explicitly authorized exception, where permitted.

Hoy no hay CI: estas comprobaciones las ejecuta el agente hasta que se entregue RM-05.

Detailed quality targets, feature-specific acceptance criteria, and verification procedures MUST be defined in their respective SDD artifacts rather than duplicated here.

---

## 5. Conflict Resolution and Exceptions

### 5.1 Conflict Resolution

When principles, requirements, or constraints appear to conflict:

1. Applicable legal, regulatory, security, and organizational obligations MUST be respected according to their authority.
2. Applicable non-negotiable constraints MUST be satisfied unless a deviation is explicitly permitted by an authorized exception.
3. Requirements and designs MUST be reconciled with the constitution before implementation proceeds.
4. When principles conflict, decisions SHOULD prioritize the applicable constraints, required outcomes, and material risks while avoiding unnecessary complexity.
5. Material unresolved conflicts MUST be escalated to the appropriate decision owner.
6. Significant decisions that establish precedents MUST be recorded in the appropriate decision artifact.

### 5.2 Exceptions

Deviations from mandatory constraints MUST NOT be treated as informal permissions or implicit changes to the constitution.

Where exceptions are permitted, each exception MUST document:

- **Affected rule:** EP-003
- **Scope:** únicamente el commit `b45e4a9` (migración de OpenSpec a sdd-kit), integrado en `main` local antes de adoptar esta constitución
- **Justification:** lo pidió el mantenedor antes de que existiera esta regla
- **Risk and compensating controls:** solo toca `README.md` y `docs/`, sin cambios de código
- **Approver:** mantenedor
- **Expiry or review trigger:** cerrada; el commit ya está en `origin/main` (comprobado el 2026-11-01)
- **Remediation:** ninguna; no sienta precedente

Exceptions MUST be limited to the smallest feasible scope and MUST NOT override applicable higher-authority obligations.

Departures from recommended practices do not automatically require formal exceptions, but SHOULD be justified when they materially affect engineering risk or maintainability.

Existing implementation patterns MUST NOT automatically be treated as desirable standards. Legacy deviations MUST be evaluated against the intended engineering principles and constraints.

Repeated exceptions SHOULD trigger a review of the affected rule, architecture, or underlying technical debt.

---

## 6. Governance and Evolution

### 6.1 Authority

This constitution is the authoritative source of the project's enduring engineering principles and constraints.

Specifications, technical plans, architecture documents, and implementation details MAY refine how these rules are satisfied but MUST NOT silently override them.

### 6.2 Amendments

Changes to this constitution MUST:

- Have an explicit rationale.
- Identify affected principles, constraints, and practices.
- Assess implications for existing specifications and implementations.
- Be reviewed and approved by the authorized owner or stakeholders.
- Be versioned and communicated to affected contributors.

Changes to mandatory obligations MUST be explicitly identified.

### 6.3 Versioning

The project MUST maintain a version history of the constitution.

- **Major:** Changes that materially alter existing obligations or their interpretation.
- **Minor:** Additions or changes that introduce or refine engineering expectations without materially weakening existing ones.
- **Patch:** Editorial corrections or clarifications that do not change the meaning of existing obligations.

### 6.4 Review

The constitution SHOULD be reviewed when significant architectural, security, regulatory, or engineering changes indicate that its principles or constraints may no longer be appropriate.

Repeated exceptions, recurring compliance failures, and evidence that a principle is ineffective SHOULD trigger reconsideration.

Un proyecto derivado revisa esta constitución en su propio onboarding: lo que aquí se decide es para la plantilla, no una obligación para sus derivados.
