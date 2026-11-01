---
artifact: requirements
feature: F001
status: approved
version: 1
upstream: [brief.md@2]
---

# Requirements: Retirar OpenSpec

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

### REQ-01: El contrato de comportamiento está en `docs/behaviour/`

El repositorio shall contener en `docs/behaviour/` el contrato de comportamiento de las áreas auth, deployment, health, project-rename, roles y users.

- **Priority:** Must
- **Source:** brief.md, 5.1, SC-02, CON-02
- **Rationale:** Es el único contrato detallado del comportamiento actual.

#### AC-01.1: Las seis áreas están presentes

- **Given** el repositorio con la feature integrada
- **When** se lista `docs/behaviour/`
- **Then** hay un documento para cada una de las seis áreas

#### AC-01.2: Contenido sin cambios

- **Given** cada documento de auth, deployment, health, roles y users
- **When** se compara con su original de `openspec/specs/` en el commit anterior a la feature, ignorando los finales de línea
- **Then** no hay diferencias

#### AC-01.3: Único cambio en project-rename

- **Given** el documento de project-rename
- **When** se compara con su original, ignorando los finales de línea
- **Then** las únicas diferencias son que el requisito de exclusiones ya no nombra `openspec/changes/archive/` y que desaparece el escenario "Historial de cambios intacto"

### REQ-02: `openspec/` ya no existe

El repositorio shall no contener la carpeta `openspec/`.

- **Priority:** Must
- **Source:** brief.md, 5.1

#### AC-02.1: Carpeta retirada

- **Given** el repositorio con la feature integrada
- **When** se listan los archivos versionados
- **Then** ninguno está bajo `openspec/`

#### AC-02.2: Lo retirado sigue en el historial

- **Given** el historial de git de `main`
- **When** se consulta `openspec/config.yaml` en el commit anterior a la feature
- **Then** el archivo sigue disponible

### REQ-03: El renombrado solo excluye el propio script y lo que no es UTF-8

When se ejecuta `scripts/rename_project.py`, the script shall sustituir el nombre de la plantilla en todos los archivos versionados de texto UTF-8, salvo en el propio script.

- **Priority:** Must
- **Source:** brief.md, 5.1, ASM-01, SC-03

#### AC-03.1: El contrato también se renombra

- **Given** un archivo bajo `docs/behaviour/` que menciona el nombre de la plantilla en un repositorio recién creado
- **When** se ejecuta el renombrado
- **Then** ese archivo pasa a tener el nombre nuevo

#### AC-03.2: Las exclusiones restantes se mantienen

- **Given** un repositorio recién creado con un archivo versionado que no es UTF-8
- **When** se ejecuta el renombrado
- **Then** ni ese archivo ni `scripts/rename_project.py` cambian, y el script termina con código 0

#### AC-03.3: El script no nombra OpenSpec

- **Given** `scripts/rename_project.py`
- **When** se lee su ayuda y su código
- **Then** no menciona `openspec`

### REQ-04: La guía de inicio no remite a OpenSpec

`README.md` shall indicar cómo empezar un proyecto derivado sin ningún paso sobre `openspec/`, y shall indicar que `docs/behaviour/` describe el comportamiento que hereda el proyecto.

- **Priority:** Must
- **Source:** brief.md, 5.1, RISK-01

#### AC-04.1: Pasos de inicio

- **Given** la sección "Empezar un proyecto nuevo" de `README.md`
- **When** se lee
- **Then** no menciona `openspec` y sí menciona `docs/behaviour/` como comportamiento heredado y entrada del onboarding

#### AC-04.2: Enlaces válidos

- **Given** `README.md` y las guías de `docs/`
- **When** se revisan sus enlaces y rutas a archivos del repositorio
- **Then** ninguno apunta a una ruta bajo `openspec/`

### REQ-05: La documentación y los archivos de `.sdd/` usan la ruta nueva

`docs/` y `.sdd/` shall nombrar `docs/behaviour/` como ubicación del contrato de comportamiento.

- **Priority:** Must
- **Source:** brief.md, 5.1

#### AC-05.1: Catálogo de documentos

- **Given** `.sdd/documentation.yaml`
- **When** se busca la entrada del contrato de comportamiento
- **Then** su `path` es `docs/behaviour/` y está activa

#### AC-05.2: Referencias de producto y arquitectura

- **Given** `.sdd/product.md` y `.sdd/architecture.md`
- **When** se buscan referencias al contrato
- **Then** apuntan a `docs/behaviour/`

#### AC-05.3: Estructura de la documentación

- **Given** `docs/documentation-standards.md` y `docs/development_guide.md`
- **When** se leen
- **Then** el primero incluye `docs/behaviour/` en la estructura de `docs/` y el segundo no presenta `openspec/` como material vigente

### REQ-06: Docker no menciona la carpeta retirada

`.dockerignore` shall no contener ninguna entrada para `openspec`.

- **Priority:** Should
- **Source:** brief.md, SC-01

#### AC-06.1: Entrada retirada

- **Given** `.dockerignore`
- **When** se lee
- **Then** no contiene `openspec`, y `docs` sigue excluido

### REQ-07: Solo quedan menciones históricas

If se busca `openspec` u `opsx` en los archivos versionados, then los resultados shall limitarse a las menciones históricas acordadas.

- **Priority:** Must
- **Source:** brief.md, SC-01, ASM-02

#### AC-07.1: Lista cerrada

- **Given** el repositorio con la feature integrada
- **When** se buscan `openspec` y `opsx` en los archivos versionados, sin distinguir mayúsculas
- **Then** solo hay coincidencias en la excepción de `.sdd/constitution.md`, en el item RM-08 de `.sdd/roadmap.md` y en `specs/001-retirar-openspec/`

### REQ-08: El `CLAUDE.md` local deja de remitir a `openspec/`

Al terminar la feature, el `CLAUDE.md` local del mantenedor shall no presentar `openspec/` como material existente.

- **Priority:** Should
- **Source:** brief.md, 5.1, Q-02
- **Rationale:** No se versiona, pero lo leen las futuras sesiones.

#### AC-08.1: Archivo local actualizado

- **Given** el `CLAUDE.md` del directorio de trabajo del mantenedor, al terminar la feature
- **When** se busca `openspec`
- **Then** no hay coincidencias, y el archivo no aparece en el diff del PR

---

## 2. Non-Functional Requirements

### NFR-01: La retirada no rompe nada

El proyecto shall conservar sus comprobaciones en verde tras la feature.

- **Priority:** Must
- **Source:** brief.md, SC-03; NC-006; EP-006
- **Target:** Suite de backend completa en verde, sobre PostgreSQL; `docker compose build backend` termina sin error.
- **Conditions:** Rama de la feature, sobre un PostgreSQL que no sea de otro proyecto.
- **Verify:** Ejecución de los comandos de `.sdd/stack.yaml`, con el resultado en `evidence/`.
- **Rationale:** Cambian el script de renombrado, su test y `.dockerignore`.
- **Status:** Confirmed

### NFR-02: Historial de las specs trazable

El historial de git shall permitir seguir cada documento movido hasta su ubicación anterior.

- **Priority:** Should
- **Source:** brief.md, CON-01
- **Target:** `git log --follow` sobre cada documento de `docs/behaviour/` muestra commits anteriores a la feature.
- **Conditions:** Rama de la feature.
- **Verify:** Ejecución del comando sobre los seis documentos.
- **Rationale:** Conserva el motivo de cada requisito.
- **Status:** Confirmed

---

## 3. Quality Attributes Considered

- **Rendimiento y disponibilidad:** el comportamiento de la aplicación en ejecución no cambia.
- **Seguridad y privacidad:** no se tocan datos, secretos ni autenticación.
- **Accesibilidad y usabilidad:** no cambia ninguna interfaz; los tests y el build de frontend no se ven afectados.

---

## 4. Scope Exclusions

- Corregir contenido desfasado en las specs movidas, si se encuentra: se añade a la bandeja de entrada del roadmap.

---

## 5. Assumptions and Open Questions

Ver ASM-01 y ASM-02 en `brief.md`, ambos con la aprobación del brief (H-01). No hay preguntas abiertas.

---

## 6. Traceability and Coverage

Verificado antes de pedir la aprobación:

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
