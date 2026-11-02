---
artifact: roadmap
version: 7
status: active
owner: Mantenedor de la plantilla (Miguel Ángel Benítez)
---

# Roadmap: FastAPI Template

> Describes how the product will grow: the small, independently deliverable increments that come next, in the order the human has chosen, and the ones already delivered, split or dropped.
> Each item is a future feature: one increment, specified, built and released on its own. The roadmap is where the next feature is chosen from, and where work deferred by a feature goes so that it is not lost.
> It plans the order of change, not the product itself. It never restates the product description, the requirements or the design: it points to them by ID.

---

## 1. Focus

La única fuente del flujo de trabajo (RM-08, F001), el rechazo de la contraseña de administrador por defecto (RM-01, F002), el límite de login por cliente real tras un proxy (RM-02, F003) y Compose sin credenciales fijas, con tests sin PostgreSQL ajeno por defecto (RM-03 con RM-09, F004), ya están entregados. Ahora, la superficie HTTP en producción (`CAP-06`). Después, comprobar cada cambio automáticamente (`CAP-07`) y poder diagnosticar en operación (`CAP-08`). El mantenedor eligió el 2026-11-01 poner la seguridad primero, por delante de la recomendación de empezar por CI.

---

## 2. Sequence

### RM-04: Superficie HTTP reducida en producción

- **Status:** candidate
- **Outcome:** En producción, un visitante sin permiso no accede a la documentación de la API y el navegador recibe las cabeceras de seguridad acordadas.
- **Capability:** CAP-06
- **Why:** Reduce la exposición una vez cerrados los valores por defecto.
- **Depends on:** none
- **Boundaries:** TBD
- **Origin:** onboarding
- **Notes:** Su resultado lleva un "y": probablemente se divida en dos al refinarlo.

### RM-05: Un pull request muestra lint, tests y build

- **Status:** candidate
- **Outcome:** Al abrir un pull request, el mantenedor ve si pasan el lint, los tests y el build.
- **Capability:** CAP-07
- **Why:** Sustituye la verificación manual por comprobaciones automáticas.
- **Depends on:** none
- **Boundaries:** TBD
- **Origin:** onboarding
- **Notes:** GitHub Actions está como `proposed` en `stack.yaml`. F003 dejó la comprobación del límite tras un proxy como procedimiento manual con Docker (H-06); la automatización está en RM-11, para que el mantenedor decida si entra aquí o aparte.

### RM-06: Logs estructurados por petición

- **Status:** candidate
- **Outcome:** Quien opera un derivado puede seguir cada petición y sus errores en los logs.
- **Capability:** CAP-08
- **Why:** Hoy no hay nada para diagnosticar en operación.
- **Depends on:** none
- **Boundaries:** TBD
- **Origin:** onboarding
- **Notes:** Requiere decidir la herramienta (`stack.yaml`); una dependencia nueva necesita confirmación (NC-008).

### RM-07: Calidad de Python comprobada

- **Status:** candidate
- **Outcome:** El mantenedor ve los errores de estilo y de tipos de Python antes de integrar un cambio.
- **Capability:** CAP-07
- **Why:** El backend no tiene hoy esa comprobación.
- **Depends on:** RM-05
- **Boundaries:** TBD
- **Origin:** onboarding
- **Notes:** Incluye resolver el solape entre flake8 y ruff. Una dependencia nueva necesita confirmación (NC-008).

---

## 3. Inbox

### RM-10: El test de arranque sin base de datos no depende de `backend/.env`

- **Status:** candidate
- **Outcome:** El mantenedor ve pasar los tests de configuración con cualquier `backend/.env` local, incluido uno con una `ADMIN_PASSWORD` propia.
- **Capability:** enabler; hace fiable la suite local.
- **Why:** El test de AC-01.3 de F002 llama a `create_app()`, que lee `backend/.env`; con una contraseña propia el test falla (revisión R1-01, ASM-04).
- **Depends on:** none
- **Boundaries:** TBD
- **Origin:** F002 (`reviews/feature-r1.md`, R1-01)
- **Notes:** Muy pequeño; puede ser una chore. Relacionado con RM-09 (entregado por F004). F004 no lo cambia: los tests de configuración siguen leyendo `backend/.env`.

### RM-11: La comprobación del límite de login tras un proxy se ejecuta sola

- **Status:** candidate
- **Outcome:** El mantenedor ve pasar o fallar, sin ejecutar nada a mano, la comprobación de que cada cliente tras un proxy tiene su propio límite y de que una cabecera falsificada se ignora.
- **Capability:** CAP-06
- **Why:** F003 la verificó con un procedimiento manual con Docker, aceptado como riesgo registrado (H-06, opción B descartada por alcance). Hoy ningún test nombra AC-01.1 a AC-03.2 de F003.
- **Depends on:** RM-05
- **Boundaries:** TBD
- **Origin:** F003 (`decisions.md`, H-06; `evidence/README.md`, sección 3)
- **Notes:** Necesita Docker en el entorno de ejecución. Los comandos exactos y el script del segundo contenedor constan en la evidencia de F003. Puede quedar absorbida por RM-05 si el mantenedor lo decide. RM-12 tiene el mismo patrón para Compose.

### RM-12: Las comprobaciones de la contraseña de Compose se ejecutan solas y se verifican en Linux

- **Status:** candidate
- **Outcome:** El mantenedor ve pasar o fallar, sin ejecutar nada a mano, el rechazo de `POSTGRES_PASSWORD` (sin definir, vacía, corta, `postgres`), el arranque con una válida y la recuperación tras un rechazo, en Windows y en Linux.
- **Capability:** CAP-06
- **Why:** F004 verificó esos casos con ejecuciones reales de Compose, y 15 de sus criterios no tienen un test que nombre su ID (H-08, aceptado como riesgo registrado). NFR-02 solo se verificó en Windows (H-09).
- **Depends on:** RM-05
- **Boundaries:** TBD
- **Origin:** F004 (`decisions.md`, H-08 y H-09; `evidence/README.md`, secciones 2 y 3.1)
- **Notes:** Necesita Docker en el entorno de ejecución. Los casos y comandos constan en la evidencia de F004. Puede quedar absorbida por RM-05 junto con RM-11.

---

## 4. Closed

### RM-03: Compose sin credenciales fijas de base de datos y tests sin PostgreSQL ajeno por defecto

- **Delivered:** F004, verificada el 2026-11-03 (absorbe RM-09). La fecha del merge la fija su pull request.
- **Outcome:** El mantenedor despliega con Compose usando una contraseña de PostgreSQL elegida por él, sin ninguna fija en el archivo versionado, y lanza los tests sin crear ni borrar bases en el servidor de otro proyecto.
- **Capability:** CAP-06
- **Why:** Completa el rechazo de valores por defecto en el despliegue.
- **Depends on:** none
- **Boundaries:** In: `docker-compose.yml` y su configuración, y el valor por defecto de la conexión de los tests / Not in: gestión de secretos externa
- **Origin:** onboarding
- **Notes:** Ensanchado el 2026-11-02 por el mantenedor (F004, H-02) para absorber RM-09. `POSTGRES_PASSWORD` es obligatoria (16+ caracteres, distinta de `postgres`) y la comprueba el servicio `postgres-check`; un rechazo por contenido deja un contenedor parado y un volumen vacío (H-05, opción A). `TEST_DATABASE_ADMIN_URL` es obligatoria. Quedan sin automatizar los casos de Compose (15 criterios sin test que nombre su ID, H-08) y sin verificar NFR-02 en Linux (H-09); ver RM-12.

### RM-09: Los tests no usan por defecto un PostgreSQL ajeno

- **Absorbed into:** RM-03, por decisión del mantenedor el 2026-11-02 (F004, H-02). Entregado por F004, verificada el 2026-11-03.
- **Outcome:** Al lanzar los tests sin configurar nada, el mantenedor no crea ni borra bases en el servidor de otro proyecto.
- **Capability:** enabler; protege a los demás proyectos locales.
- **Why:** Se detectó en el onboarding: el puerto 5432 lo ocupaba `gestorbibliografico`.
- **Depends on:** none
- **Boundaries:** TBD
- **Origin:** onboarding
- **Notes:** Relacionado con RM-03.

### RM-02: El límite de login se aplica por cliente real tras un proxy

- **Delivered:** F003, verificada el 2026-11-02. La fecha del merge la fija su pull request.
- **Outcome:** Detrás de un proxy, un cliente que supera el límite de login queda limitado sin afectar a los demás clientes.
- **Capability:** CAP-06
- **Why:** El README recomienda desplegar tras un proxy, donde el límite podría fallar. Va después de RM-01 porque aquí el riesgo aún está sin confirmar.
- **Depends on:** none
- **Boundaries:** In: comportamiento tras un proxy con el despliegue actual / Not in: contadores compartidos entre réplicas
- **Origin:** onboarding
- **Notes:** El fallo se confirmó con una ejecución real y se resolvió sin código nuevo: uvicorn decide con `FORWARDED_ALLOW_IPS` (ADR-0001). Sin la variable los clientes comparten cupo; con ella, cada uno tiene el suyo; una conexión no confiada no puede elegir su IP. Quedan sin ejecutar: uvicorn local sin Docker, varias entradas de `X-Forwarded-For`, `*` con el 8000 cerrado y un proxy real.

### RM-01: Producción rechaza la contraseña de administrador por defecto

- **Delivered:** F002, verificada el 2026-11-01. La fecha del merge la fija su pull request.
- **Outcome:** El mantenedor ve que un derivado se niega a arrancar en producción con la contraseña de administrador por defecto, y un mensaje le dice qué cambiar.
- **Capability:** CAP-06
- **Why:** Cierra el riesgo más directo: un administrador con contraseña pública. El mantenedor lo situó el primero.
- **Depends on:** none
- **Boundaries:** In: `ADMIN_PASSWORD` por defecto / Not in: `SECRET_KEY`, que ya se rechaza por longitud; credenciales de Compose (RM-03)
- **Origin:** onboarding
- **Notes:** Sin CI todavía: la verificación la ejecutó el agente (NC-006).

### RM-08: Retirar OpenSpec y conservar su contrato en docs/

- **Delivered:** F001, verificada el 2026-11-01. La fecha del merge la fija su pull request.
- **Outcome:** El mantenedor encuentra el contrato de comportamiento en `docs/behaviour/`, sin restos del flujo OpenSpec en el repositorio.
- **Capability:** enabler; deja una sola fuente del flujo de trabajo y una ruta estable para `documentation.yaml`.
- **Why:** Lo decidió el mantenedor en el onboarding: mover `openspec/specs/` y borrar `config.yaml` y el archivo de cambios. Lo colocó el primero el 2026-11-01 para que RM-01 ya actualice la ruta definitiva.
- **Depends on:** none
- **Boundaries:** In: mover las specs; borrar el resto; actualizar `.dockerignore`, `scripts/rename_project.py` con su test, `README.md`, `docs/development_guide.md` y las referencias en `.sdd/` / Not in: reescribir las specs
- **Origin:** onboarding
- **Notes:** Pequeño. Su ID es mayor que el de RM-01 porque se creó después en el onboarding. Se conservó el historial de git de las specs movidas.

---

## 5. Readiness

An item is `ready`, and can be picked as the next feature, when:

- Its outcome is one sentence, for one user group, along one main flow, and can be shown working on its own.
- The product still works, and could be released, if work stops after it.
- It is a vertical slice through what users or callers observe, not a layer of the system.
- Every item it depends on is delivered.
- It needs at most one hard-to-reverse choice (one-way door).
- None of the size signals in the methodology applies, and it respects any sizing practice the constitution sets.

An item that is not ready is refined first, and split when it is too large. The methodology reference describes the size signals and the ways to split an item.

---

## 6. Maintenance Guidelines

This document MUST stay aligned with the product description, with what has been delivered, and with the human's priorities.

- The order of the sequence, placing an item from the inbox, and dropping an item are the human's decisions.
- A feature that narrows or splits its item, or defers part of its scope, adds the remainder to the inbox, on its own branch.
- The Document phase of every feature closes the item it delivered and adds the feature's follow-ups to the inbox.
- Whether an item is in progress is not recorded here: it is the feature whose state record names it.
- Bump `version` on every change.

### Source of Truth

- This document is the canonical reference for which increments come next, their order, and which are delivered, split or dropped.
- `product.md` describes the product as a whole and its capabilities, current and planned. An item names the capability it advances; it does not describe it.
- A feature's brief and requirements define what an item turns out to mean in detail, once it is picked.
- A feature's state record says whether its item is in progress.
- `architecture.md` holds the known technical debt; an item that pays some of it off points to it.

When information changes, update its authoritative source rather than maintaining competing copies across documents.
