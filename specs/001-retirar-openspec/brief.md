---
artifact: brief
feature: F001
status: draft
version: 1
upstream: []
---

# Brief: Retirar OpenSpec

> Describes the problem or opportunity behind a feature, who it affects, the outcome it must achieve, how success is measured, and the boundaries of the change.
> Once approved, this document and the requirements built from it are the contract every later artifact of the feature is checked against.
> It describes what is needed and why, never how it is built. Keep it to what is needed to understand and bound the change, without duplicating product, architecture, or requirements content maintained elsewhere.

---

## 1. Problem

El proyecto trabaja con sdd-kit, pero el repositorio conserva `openspec/`, del flujo anterior. Esto produce tres problemas observados:

- **Dos fuentes aparentes.** `openspec/config.yaml` y `openspec/changes/archive/` siguen pareciendo parte del flujo de trabajo, aunque ya no se usan.
- **Contrato en una ruta provisional.** `openspec/specs/` es el único contrato detallado del comportamiento actual, y `.sdd/documentation.yaml` lo cataloga bajo el nombre de un flujo retirado.
- **Instrucciones que dejarán de ser ciertas.** `README.md`, `docs/development_guide.md` y `CLAUDE.md` indican que `openspec/` es material heredado, y dos de ellos dicen cosas distintas sobre su destino.

Además, `scripts/rename_project.py` tiene una exclusión específica para `openspec/changes/archive/`.

---

## 2. Users and Context

- **Mantenedor** (`product.md`): trabaja en la plantilla y crea proyectos derivados, con agentes de Claude Code que leen estos archivos como instrucciones. Una instrucción desfasada puede llevar a un agente a usar un flujo retirado.

---

## 3. Desired Outcome

El mantenedor y sus agentes encuentran el contrato de comportamiento en `docs/behaviour/` y una sola descripción del flujo de trabajo, sin nada activo que remita a OpenSpec. Crear un proyecto derivado sigue funcionando como hasta ahora.

---

## 4. Success Criteria

### SC-01: Nada activo remite a OpenSpec

- **Measurement:** Búsqueda de `openspec` y `opsx` en los archivos versionados, sin distinguir mayúsculas.
- **Baseline:** Coincidencias en `.dockerignore`, `README.md`, `docs/development_guide.md`, `scripts/rename_project.py`, su test y varios archivos de `.sdd/`.
- **Target:** Solo quedan menciones históricas, enumeradas en los requirements.

### SC-02: El contrato se conserva completo

- **Measurement:** Comparación de `docs/behaviour/` con `openspec/specs/` en el commit anterior a esta feature.
- **Baseline:** Seis áreas: auth, deployment, health, project-rename, roles y users.
- **Target:** Las seis áreas están presentes y su contenido es idéntico, salvo la exclusión retirada de project-rename (ASM-01).

### SC-03: Crear un proyecto derivado sigue funcionando

- **Measurement:** Suite de tests de backend, incluidos los del renombrado.
- **Baseline:** 87 de 87 tests en verde el 2026-11-01.
- **Target:** Toda la suite en verde.

---

## 5. Scope

### 5.1 In Scope

- Mover el contrato de comportamiento de `openspec/specs/` a `docs/behaviour/`.
- Retirar el resto de `openspec/`: `config.yaml` y `changes/archive/`.
- Que el renombrado deje de tratar de forma especial una carpeta que ya no existe.
- Alinear con el resultado `README.md`, `docs/` y las referencias de `.sdd/`.
- Actualizar el `CLAUDE.md` local del mantenedor, que no se versiona ni aparece en el PR (Q-02).

### 5.2 Non-Goals

- Reescribir o reorganizar las specs movidas, salvo ASM-01.
- Tocar proyectos derivados ya creados, como `gestorbibliografico`.
- Corregir la deuda de `.sdd/architecture.md` o los demás items del roadmap.
- Borrar el historial de git: lo retirado sigue accesible en él.
- Limpiar los permisos antiguos de `.claude/settings.local.json`, que son locales y no afectan a nada.

---

## 6. Constraints

### CON-01: El historial de git se conserva

- **Source:** Decisión del mantenedor en el onboarding: lo borrado "sigue en el historial de git". EP-003 no permite reescribirlo fuera de un PR.

### CON-02: El contrato se mueve a `docs/behaviour/`

- **Source:** Decisión del mantenedor en el onboarding (`roadmap.md`, RM-08).

---

## 7. Assumptions

### ASM-01: La exclusión de `openspec/changes/archive/` se retira del comportamiento y de la spec de project-rename

- **Basis:** La carpeta deja de existir. Las otras dos exclusiones, el propio script y los archivos que no son UTF-8, conservan su razón de ser.
- **Default:** Es el único cambio de contenido en las specs movidas.
- **Impact if incorrect:** Un proyecto derivado no se ve afectado, porque esa carpeta ya no existirá en él.
- **Status:** Unverified

### ASM-02: Las menciones históricas se conservan

- **Basis:** Son registro, no instrucciones: la excepción de `constitution.md`, el título de RM-08 y los propios archivos de esta feature.
- **Default:** No se reescriben.
- **Impact if incorrect:** SC-01 tendría que ampliarse a esos archivos.
- **Status:** Unverified

---

## 8. Open Questions

Ninguna.

---

## 9. Risks

### RISK-01: Un proyecto derivado creado con esta versión recibe instrucciones de arranque incoherentes

- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:** La guía de inicio del README forma parte del alcance, y SC-03 cubre el renombrado.

---

## 10. References

### REF-01: `.sdd/roadmap.md`, RM-08

- **Purpose:** Item que entrega esta feature y sus límites.

### REF-02: `openspec/specs/project-rename/spec.md`

- **Purpose:** Comportamiento actual de las exclusiones del renombrado.

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
