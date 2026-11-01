---
artifact: architecture
version: 1
status: active
owner: Mantenedor de la plantilla (Miguel Ángel Benítez)
---

# Architecture: FastAPI Template

> Describes the system's architecture, including its boundaries, components, interactions, data flows, and cross-cutting concerns.
> This document is the canonical reference for understanding how the system is structured, how its parts work together, and the architectural decisions that shape its implementation.
> This is a living document. Keep it aligned with the architecture that actually exists, distinguishing implemented behavior from intended designs and proposed changes.
> Document architectural knowledge at the level necessary to understand the system and make informed engineering decisions.
> Avoid duplicating technology inventories, product documentation, detailed specifications, or implementation-level documentation maintained elsewhere.

---

## 1. Architectural Overview

### 1.1 Architectural Summary

Monolito modular en un único proceso. El backend FastAPI expone la API bajo `/api`, aplica las migraciones al arrancar y sirve el build de la SPA de React. PostgreSQL es el único almacén de estado.

### 1.2 Architectural Drivers

- **Reutilización como plantilla:** las fronteras deben ser fáciles de copiar y extender (PR-001).
- **Seguridad de la autenticación:** tokens de acceso cortos y sesiones revocables.
- **Despliegue simple:** una sola imagen de aplicación, sin proxy incluido.

### 1.3 Architectural Style and Patterns

Slices verticales por feature en backend y frontend. En backend, cada slice separa `router`, `service`, `repository`, `schemas` y `models`. El detalle está en `docs/backend-standards.md` y `docs/frontend-standards.md`.

---

## 2. System Context and Boundaries

### 2.1 System Boundary

El sistema posee la autenticación, los usuarios, los roles, las sesiones y la interfaz. Quedan fuera TLS, el proxy, los secretos reales y la infraestructura del host.

### 2.2 External Actors and Systems

- **Name:** Navegador
- **Purpose:** Ejecuta la SPA.
- **Interaction:** HTTP con el backend; bearer token y cookie HttpOnly de refresh.
- **Responsibility boundary:** El navegador guarda la cookie; el backend decide la validez de cada token.

- **Name:** PostgreSQL
- **Purpose:** Almacén de estado.
- **Interaction:** asyncpg desde el backend.
- **Responsibility boundary:** El backend posee el schema mediante migraciones.

- **Name:** Proxy con TLS (opcional, externo)
- **Purpose:** Terminar HTTPS en producción.
- **Interaction:** Reenvía al puerto 8000.
- **Responsibility boundary:** Lo aporta quien despliega; ver la sección de proxy del README.

### 2.3 System Context Diagram

```
Navegador ──HTTP(S)──> [Proxy opcional] ──> Backend FastAPI + SPA ──> PostgreSQL
```

---

## 3. Architectural Components

### 3.1 Component Inventory

- **Name:** Núcleo
- **Purpose:** Infraestructura común.
- **Responsibilities:** Settings, engine y sesiones, migraciones, lifespan, limiter y fechas UTC.
- **Interfaces:** `get_settings`, `get_session`, `session_scope`, `Base`.
- **Dependencies:** PostgreSQL.
- **State ownership:** Ninguno propio.
- **Status:** Implemented

- **Name:** Slice `auth`
- **Purpose:** Autenticación y sesiones.
- **Responsibilities:** Login, tokens, sesiones y dependencias de autorización; administrador inicial.
- **Interfaces:** `/api/auth/*`, `get_authenticated_user`, `require_roles`.
- **Dependencies:** Núcleo, modelos de usuarios y roles.
- **State ownership:** `auth_refresh_tokens`.
- **Status:** Implemented

- **Name:** Slices `users` y `roles`
- **Purpose:** Administración de cuentas y permisos.
- **Responsibilities:** CRUD y reglas como la protección del último `admin`.
- **Interfaces:** `/api/users/*`, `/api/roles/*`.
- **Dependencies:** Núcleo, slice `auth`.
- **State ownership:** `users`, `roles`, `user_roles`.
- **Status:** Implemented

- **Name:** Slice `health`
- **Purpose:** Señal de salud.
- **Responsibilities:** Responder en `/health` para el healthcheck de Compose.
- **Interfaces:** `GET /health`.
- **Dependencies:** Ninguna relevante.
- **State ownership:** Ninguno.
- **Status:** Implemented

- **Name:** Servido de la SPA
- **Purpose:** Entregar el frontend desde el backend.
- **Responsibilities:** Servir `frontend/dist` y devolver `index.html` en rutas de cliente.
- **Interfaces:** Ruta comodín registrada al final; `/assets`.
- **Dependencies:** Build del frontend.
- **State ownership:** Ninguno.
- **Status:** Implemented

- **Name:** Frontend
- **Purpose:** Interfaz de usuario.
- **Responsibilities:** Slices de UI (`auth`, `app-shell`, `home`, `profile`, `sessions`, `users`) y código compartido en `shared/`.
- **Interfaces:** Rutas de `frontend/src/app/router.tsx`; llama a la API por `shared/api/http.ts`.
- **Dependencies:** API del backend.
- **State ownership:** Estado local y de autenticación en `AuthProvider`.
- **Status:** Implemented

### 3.2 Component Relationships

Las dependencias van de `router` a `service` a `repository` y a `models`. Las features dependen del núcleo, nunca al revés, salvo `import_model_modules`, que importa los modelos para registrarlos.

### 3.3 Component Diagram

Omitido: la descripción anterior es suficiente.

---

## 4. Interactions and Execution Flows

### 4.1 Interaction Model

Peticiones HTTP síncronas para el cliente y código async en el backend. No hay colas, eventos ni trabajos programados.

### 4.2 Principal Execution Flows

- **Name:** Arranque
- **Trigger:** Inicio del proceso.
- **Participants:** Lifespan, Alembic, PostgreSQL.
- **Sequence:** Aplica las migraciones, con hasta 10 reintentos si la base no está disponible, y crea roles y administrador inicial.
- **Outcome:** Aplicación lista con el schema al día.
- **Failure behavior:** Si los reintentos se agotan, el arranque falla.

- **Name:** Petición autenticada con renovación
- **Trigger:** Llamada de la SPA a la API.
- **Participants:** `shared/api/http.ts`, dependencias de `auth`, slice destino.
- **Sequence:** Envía el bearer token. Ante un 401, llama a `/api/auth/refresh` con la cookie y reintenta una vez.
- **Outcome:** Respuesta con el token renovado de forma transparente.
- **Failure behavior:** Si el refresh falla, la sesión se considera cerrada. Si un token revocado se reutiliza, se revocan todas las sesiones del usuario.

### 4.3 Execution Flow Diagrams

Omitidos: los flujos son lineales.

---

## 5. Data Architecture

### 5.1 Data Organization and Ownership

Datos operativos en PostgreSQL, propiedad del slice indicado en la sección 3.1. El detalle de entidades está en `docs/data-model.md`.

### 5.2 Persistence and Data Access

Solo los `repository` consultan la base. El `service` es dueño de la transacción y hace `commit`; el repository hace `flush` y `refresh`.

### 5.3 Data Flows and Transformations

La entrada se valida con schemas Pydantic y la respuesta se serializa con su `response_model`. Las contraseñas se guardan con hash argon2, y los refresh tokens como SHA-256.

### 5.4 Consistency and Lifecycle

Una transacción por caso de uso. Las fechas se guardan en UTC sin zona y la API las devuelve con offset UTC (`UtcDatetime`). No hay política de retención: los refresh tokens caducados o revocados no consta que se purguen (sin verificar).

---

## 6. Cross-Cutting Concerns

### 6.1 Security and Authorization

- Autorización en el backend, por dependencias en cada endpoint; las rutas del frontend solo adaptan la experiencia.
- Refresh token en cookie HttpOnly con `path=/api/auth`, `samesite=lax` y `secure` en producción.
- Cabeceras de seguridad por middleware, con HSTS solo en producción. No hay CSP.
- CORS restringido a `FRONTEND_URL` en producción.
- Rate limiting en los endpoints de autenticación.

Las reglas obligatorias están en `constitution.md`.

### 6.2 Error Handling and Failure Management

Los errores de negocio se lanzan como `HTTPException` con `detail` en español desde el `service`. En el frontend llegan como `ApiError`. No hay manejador global de errores no controlados más allá del de FastAPI.

### 6.3 Observability and Diagnostics

Solo existe `/health`. No hay logging propio en `backend/app`, ni métricas ni trazas (ver sección 9.2).

### 6.4 Reliability and Resilience

Reintentos de migración al arrancar, `pool_pre_ping` en la conexión y `restart: unless-stopped` con healthchecks en Compose.

### 6.5 Configuration and Secrets

Todo se lee con `Settings` desde el entorno o `backend/.env`, que no se versiona ni entra en la imagen. `backend/.example.env` documenta las variables. En producción solo se valida la longitud de `SECRET_KEY`.

### 6.6 Other Cross-Cutting Concerns

Modo oscuro y estilos en `frontend/src/app/theme.css`. Textos solo en español, sin internacionalización.

---

## 7. Deployment and Runtime Architecture

### 7.1 Runtime Model

Un proceso uvicorn que atiende API y SPA. Sin trabajo en segundo plano. El contador del rate limiter vive en memoria del proceso.

### 7.2 Deployment Units and Boundaries

Dos contenedores en Compose: `backend`, con la imagen multi-etapa, usuario sin privilegios y el build del frontend incluido, y `postgres`, publicado solo en `127.0.0.1`.

### 7.3 Environments and Configuration Differences

`ENVIRONMENT` toma `development`, `test` o `production`. Producción cambia CORS, activa HSTS y `secure` en la cookie, y valida la longitud de `SECRET_KEY`. En desarrollo, Vite sirve el frontend en el puerto 5173.

---

## 8. Architectural Decisions and Trade-offs

### 8.1 Key Decisions

Razones reconstruidas a partir del código y la documentación, no registradas originalmente como decisiones. Aún no hay ADR.

- **Decision:** La SPA se sirve desde el backend.
- **Context:** Plantilla con despliegue simple.
- **Rationale:** Un solo origen y una sola imagen.
- **Alternatives:** Desconocidas.
- **Consequences:** Build y versión unidos; la ruta comodín debe registrarse al final.
- **Status:** Accepted
- **Reference:** `openspec/specs/deployment/spec.md`

- **Decision:** Las migraciones se aplican en el arranque.
- **Context:** Un único proceso y derivados sencillos.
- **Rationale:** Sin pasos manuales de despliegue.
- **Alternatives:** Desconocidas.
- **Consequences:** Varias réplicas podrían competir al migrar.
- **Status:** Accepted
- **Reference:** `docs/backend-standards.md`

### 8.2 Architectural Constraints

PostgreSQL es una restricción del mantenedor (`stack.yaml`). Las reglas de capas están en `constitution.md`.

### 8.3 Known Trade-offs and Limitations

El rate limiter en memoria y las migraciones en el arranque asumen una sola réplica. Es aceptable para el uso actual, pero un derivado que escale debe revisarlo.

---

## 9. Current State and Architectural Evolution

### 9.1 Current Architecture

Basada en el código y la documentación revisados el 2026-11-01, no en un sistema desplegado. Se leyeron por completo los puntos de entrada y el núcleo; los slices se conocen sobre todo por sus specs y su documentación, y por la suite de tests, que pasa.

### 9.2 Gaps and Architectural Debt

- **Gap:** Producción acepta `ADMIN_PASSWORD` por defecto.
- **Impact:** Un derivado podría desplegarse con un administrador de contraseña pública.
- **Status:** Known
- **Reference:** RM-01

- **Gap:** El rate limiter usa la IP remota sin configuración de proxy visible.
- **Impact:** Inferido, sin comprobar: tras un proxy, todos los clientes podrían compartir el mismo límite.
- **Status:** Under investigation
- **Reference:** RM-02

- **Gap:** `docker-compose.yml` fija `postgres:postgres`.
- **Impact:** Credenciales conocidas en un despliegue real.
- **Status:** Known
- **Reference:** RM-03

- **Gap:** `/api/documentation` sigue expuesta en producción y no hay CSP.
- **Impact:** Mayor superficie de ataque.
- **Status:** Known
- **Reference:** RM-04

- **Gap:** No hay CI.
- **Impact:** Las reglas y los tests dependen de una ejecución manual o del agente.
- **Status:** Known
- **Reference:** RM-05

- **Gap:** No hay logging.
- **Impact:** Difícil diagnosticar en operación.
- **Status:** Known
- **Reference:** RM-06

- **Gap:** No hay linter ni tipos de Python fuera de pre-commit, que no está instalado aquí y solapa flake8 y ruff.
- **Impact:** Calidad del backend sin comprobar.
- **Status:** Known
- **Reference:** RM-07

- **Gap:** Por defecto, los tests se conectan a lo que haya en `127.0.0.1:5432`, aunque sea de otro proyecto.
- **Impact:** Crean y borran bases temporales en un servidor ajeno.
- **Status:** Known
- **Reference:** RM-09

### 9.3 Intended Architecture and Evolution

Sin cambios estructurales previstos. Los incrementos del roadmap endurecen y comprueban la arquitectura actual.

### 9.4 Architectural Invariants

- El núcleo no contiene lógica de una feature.
- La ruta comodín de la SPA es la última en registrarse y no atiende `api/`.
- El backend no depende del frontend salvo para servir su build.

Se comprueban por revisión; no hay comprobación automática.

---

## 10. Codebase Organization and Architectural Mapping

### 10.1 Repository Structure

- `backend/app/core/`: núcleo.
- `backend/app/features/`: slices del backend.
- `backend/app/web/`: servido de la SPA.
- `backend/alembic/`: migraciones.
- `backend/tests/`: tests.
- `frontend/src/{app,features,shared}/`: bootstrap, slices y código compartido.
- `scripts/rename_project.py`: renombrado.
- `docs/`: estándares y guías.
- `openspec/`: material heredado (ver RM-08).

### 10.2 Architecture-to-Code Mapping

La sección 3.1 nombra cada slice por su carpeta. No se observan discrepancias relevantes con la documentación revisada.

### 10.3 Important Entry Points and Execution Boundaries

- `backend/app/main.py`: crea la aplicación y registra routers y middleware.
- `backend/app/core/lifespan.py`: arranque y parada.
- `frontend/src/app/main.tsx` y `router.tsx`: entrada y rutas del frontend.

---

## 11. References

- `docs/backend-standards.md`, `docs/frontend-standards.md`: patrones de cada área.
- `docs/data-model.md`: entidades.
- `docs/verification-guide.md`: cómo validar un cambio.
- `openspec/specs/`: comportamiento detallado.
- `Dockerfile`, `docker-compose.yml`: despliegue.

---

## 12. Maintenance Guidelines

This document MUST remain aligned with the architecture that exists and the architectural direction that has been established.

Update it when changes materially affect:

- System boundaries or external responsibilities.
- Major components or their ownership boundaries.
- Dependencies or communication patterns between components.
- Important execution flows.
- Data ownership, persistence, or consistency guarantees.
- Cross-cutting architectural mechanisms.
- Runtime or deployment boundaries.
- Significant architectural decisions or trade-offs.
- Architectural invariants.
- The relationship between the architecture and its implementation.

A change does not require an update to this document merely because it modifies code.

Update `architecture.md` when the change alters architectural understanding, introduces a meaningful architectural decision, or invalidates information that developers rely on when making other changes.

### Source of Truth

- This document is the canonical reference for persistent architectural knowledge.
- `constitution.md` governs engineering principles, mandatory constraints, practices, and governance.
- `stack.yaml` records technology choices according to its defined schema.
- `product.md` provides project-specific context and setup, describes the product's purpose, users, capabilities, domain concepts, business rules, and objectives.
- Individual specifications define detailed requirements, expected behavior, and acceptance criteria for particular capabilities or changes.
- Architecture Decision Records, diagrams, contracts, and other specialized artifacts MAY contain more detailed information within their respective areas of responsibility.

When information changes, update its authoritative source rather than maintaining competing copies across documents.

When a change creates a contradiction between this document and another artifact, identify the conflict and reconcile the affected documents.

Do not describe planned architecture as implemented, infer unverified behavior as fact, or silently treat undocumented assumptions as established decisions.
