---
artifact: brief
feature: F004
status: draft
version: 1
upstream: []
---

# Brief: Compose sin credenciales fijas de base de datos

> Describes the problem or opportunity behind a feature, who it affects, the outcome it must achieve, how success is measured, and the boundaries of the change.
> Once approved, this document and the requirements built from it are the contract every later artifact of the feature is checked against.
> It describes what is needed and why, never how it is built. Keep it to what is needed to understand and bound the change, without duplicating product, architecture, or requirements content maintained elsewhere.

---

## 1. Problem

Hoy el despliegue con Docker Compose usa una contraseña de PostgreSQL fija y pública, `postgres`, escrita en el archivo versionado (`docker-compose.yml`, en dos sitios: la creación de la base y la URL de conexión del backend). El repositorio es público, así que cualquiera conoce esa contraseña. Un derivado que despliega con Compose tal cual hereda credenciales conocidas (`architecture.md`, 9.2; NC-007).

Los tests tienen un problema paralelo: si no se configura nada, se conectan a lo que haya en `127.0.0.1:5432` con `postgres:postgres` y crean y borran bases en ese servidor. En el onboarding se detectó que ese puerto lo ocupaba otro proyecto (`gestorbibliografico`), es decir, los tests pueden tocar el servidor de otro proyecto sin que el mantenedor lo haya decidido.

Hechos observados: el valor fijo en `docker-compose.yml` (líneas 7 y 31), el valor por defecto de los tests (`README.md`, sección Tests, y `backend/tests/test_api.py`), y que Compose publica PostgreSQL solo en `127.0.0.1`. No hay constancia de que se haya explotado nada; es un riesgo por defecto, no un incidente.

---

## 2. Users and Context

- **Mantenedor** (`product.md`, 3.1): mantiene la plantilla y despliega los proyectos derivados. Quiere confiar en lo que hereda, incluido en producción, y poder lanzar los tests sin efectos fuera de su proyecto. Trabaja con agentes de Claude Code, que también lanzan los tests.
- **Usuario de la aplicación derivada** se beneficia de forma indirecta: la base de datos de la aplicación que usa deja de tener una contraseña pública. No interactúa con esta feature.

El contexto es el de una herramienta personal de un solo mantenedor (PR-004), con el desarrollo local y el despliegue usando el mismo `docker-compose.yml`.

---

## 3. Desired Outcome

El mantenedor despliega con Compose usando una contraseña de PostgreSQL elegida por él, sin ninguna fija en los archivos versionados, y Compose se niega a arrancar si no ha elegido una que cumpla los mínimos. Además, lanza los tests sin crear ni borrar bases en el servidor de otro proyecto: si no ha dicho a qué servidor conectarse, los tests se detienen y se lo dicen.

---

## 4. Success Criteria

### SC-01: Ninguna contraseña de base de datos fija en los archivos de Compose

- **Measurement:** Inspección de `docker-compose.yml` y de la configuración de ejemplo que usa Compose: ninguno contiene una contraseña de PostgreSQL con valor.
- **Baseline:** 2 apariciones del valor fijo `postgres` en `docker-compose.yml`.
- **Target:** 0.

### SC-02: Compose solo arranca con una contraseña elegida y válida

- **Measurement:** Ejecutar `docker compose up` en cuatro casos: sin contraseña, con una de menos de 16 caracteres, con exactamente `postgres` y con una válida de 16 o más caracteres.
- **Baseline:** Compose arranca siempre, sin pedir nada, con la contraseña fija.
- **Target:** Los tres primeros casos se rechazan con un mensaje en español que nombra la variable y dice qué hacer; el cuarto arranca y `GET /health` responde 200.

### SC-03: Los tests no se conectan a ningún servidor sin configuración explícita

- **Measurement:** Lanzar la suite del backend sin `TEST_DATABASE_ADMIN_URL`, con un servidor distinto escuchando en `127.0.0.1:5432`, y comprobar que no se crea ninguna base en él.
- **Baseline:** Los tests se conectan a `127.0.0.1:5432` con `postgres:postgres` y crean bases temporales.
- **Target:** La suite se detiene con un mensaje en español que nombra `TEST_DATABASE_ADMIN_URL`; 0 bases creadas en ese servidor.

### SC-04: El README basta para el nuevo flujo

- **Measurement:** Seguir el inicio rápido (Docker) del README, y el apartado de tests, desde un clon limpio, sin consultar otra fuente. Comprobar también que el README explica qué hacer con un volumen ya inicializado.
- **Baseline:** El inicio rápido no tiene el paso de la contraseña, y el apartado de volúmenes no existe.
- **Target:** El flujo llega a `/health` con 200 y a los tests en marcha siguiendo solo el README.

---

## 5. Scope

### 5.1 In Scope

- Compose exige siempre una contraseña de PostgreSQL elegida por el mantenedor, en desarrollo y en producción (Q-01), y ninguna contraseña con valor queda en los archivos versionados que usa Compose.
- La contraseña debe estar definida, no estar vacía, tener al menos 16 caracteres y ser distinta de `postgres` (Q-04, Q-06). Si no cumple, Compose se niega a arrancar con un mensaje en español que nombra la variable y dice qué hacer.
- El mantenedor define la contraseña una sola vez (ASM-01), y la configuración de ejemplo y el README le indican dónde, sin traer ninguna por defecto (ASM-02).
- Los tests, sin `TEST_DATABASE_ADMIN_URL`, se detienen con un mensaje en español que nombra la variable y dice qué poner, sin conectarse a ningún servidor por defecto (Q-05, Q-07; absorbe RM-09).
- El README explica qué hacer con un volumen de PostgreSQL ya inicializado con otra contraseña, y cómo apuntar los tests a la base de Compose (Q-02, Q-03).

### 5.2 Non-Goals

- Detectar automáticamente un volumen ya inicializado con otra contraseña, o cambiar la contraseña dentro de la base (Q-02): solo se documenta.
- Gestión de secretos externa (frontera de RM-03).
- Cambiar el usuario (`postgres`) o el nombre de la base de datos de Compose.
- Reglas de composición de la contraseña (mayúsculas, dígitos, símbolos) y rechazar otros valores débiles además de `postgres` (Q-06).
- Cambiar el valor por defecto de la conexión de la propia aplicación fuera de Compose (OQ-01).
- Propagar el cambio a derivados ya desplegados (`product.md`, 7.2).
- Comprobaciones automáticas de todo esto en pull requests: pertenecen a RM-05.

---

## 6. Constraints

### CON-01: La contraseña no se versiona ni se imprime

- **Source:** NC-007 y `product.md` (8.1): el repositorio es público.

### CON-02: Mensajes y documentación en español

- **Source:** NC-009.

### CON-03: Los tests siguen ejecutándose contra PostgreSQL

- **Source:** NC-005. Cambiar la conexión por defecto no cambia el motor ni permite mockear la base.

### CON-04: Sin dependencias nuevas sin confirmación

- **Source:** NC-008. Si Design necesita una, la pide al mantenedor.

---

## 7. Assumptions

### ASM-01: La contraseña se escribe una sola vez, en un archivo local no versionado

- **Basis:** Escribirla en dos sitios (la base y el backend) la haría desincronizarse, y la constitución prohíbe versionarla. El archivo concreto lo decide Design.
- **Default:** El mantenedor define la contraseña en un solo lugar, local y no versionado, y de ahí la toman tanto la base de datos como el backend.
- **Impact if incorrect:** Habría que escribirla dos veces y los requisitos de configuración cambiarían.
- **Status:** Unverified

### ASM-02: La configuración de ejemplo no incluye una contraseña por defecto

- **Basis:** Una contraseña de ejemplo versionada reintroduciría el problema que la feature resuelve (NC-007).
- **Default:** El ejemplo indica dónde poner la contraseña, con un texto que no es un valor válido, y no hay ninguna por defecto.
- **Impact if incorrect:** Si el mantenedor prefiere un valor de ejemplo funcional, SC-01 y SC-02 cambian.
- **Status:** Unverified

### ASM-03: PostgreSQL aplica la contraseña solo al crear el volumen

- **Basis:** Es el comportamiento conocido de la imagen oficial de PostgreSQL, y la premisa de Q-02 y de RISK-01. No se ha comprobado en esta sesión.
- **Default:** Un volumen ya inicializado conserva la contraseña antigua. Se comprobará con una ejecución real en Design o Verify.
- **Impact if incorrect:** El procedimiento documentado para el volumen cambiaría o sobraría.
- **Status:** Unverified

### ASM-04: «Distinta de `postgres`» es una comparación exacta

- **Basis:** Es la misma regla que F002 aplica a `ADMIN_PASSWORD` (`docs/behaviour/deployment.md`).
- **Default:** Se compara el valor exacto, distinguiendo mayúsculas y minúsculas. `Postgres` no queda rechazada por esta regla, pero sí por la longitud mínima.
- **Impact if incorrect:** Habría que ampliar la lista de valores rechazados.
- **Status:** Unverified

---

## 8. Open Questions

### OQ-01: ¿Debe producción rechazar también el valor por defecto de la conexión de la aplicación?

- **Why it matters:** La propia aplicación trae una URL de base de datos por defecto con `postgres:postgres` (`backend/app/core/settings.py`). Rechazarla en producción sería otro comportamiento, no cubierto por RM-03 ni por RM-09.
- **Proposed default:** Fuera de alcance. Compose siempre define la URL, por lo que el valor por defecto de la aplicación solo se usa fuera de Compose. Si el mantenedor quiere rechazarlo, se añade como candidato al inbox del roadmap.
- **Status:** Open

---

## 9. Risks

### RISK-01: Un volumen ya inicializado impide conectar tras el cambio

- **Likelihood:** High
- **Impact:** Medium
- **Mitigation:** Documentar las dos salidas en el README (borrar el volumen y empezar de cero, o cambiar la contraseña dentro de la base) y comprobarlas con una ejecución real (Q-02, SC-04).

### RISK-02: La feature mezcla dos resultados y supera una señal de tamaño

- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** El mantenedor absorbió RM-09 a sabiendas (H-02). Design puede dividir el trabajo en dos tareas independientes y, si crece más, proponer volver a separar RM-09.

### RISK-03: Los tests que hoy dependen del valor por defecto fallarán hasta definir la variable

- **Likelihood:** High
- **Impact:** Medium
- **Mitigation:** El mensaje de detención dice qué definir y el README lo documenta. El entorno del agente también deberá definir `TEST_DATABASE_ADMIN_URL`: F003 ya registró que el PostgreSQL de tests no estaba disponible en ese entorno.

---

## 10. References

### REF-01: `.sdd/roadmap.md` (versión 6), RM-03 y RM-09

- **Purpose:** El ítem que entrega la feature y el que absorbe (H-02).

### REF-02: `docker-compose.yml`, `README.md` y `backend/tests/test_api.py`

- **Purpose:** Comportamiento actual observado: la contraseña fija y el valor por defecto de los tests.

### REF-03: `.sdd/architecture.md` (9.2) y `.sdd/constitution.md` (NC-007)

- **Purpose:** El gap registrado y la regla que la feature hace cumplir.

### REF-04: `specs/004-compose-sin-credenciales-bd/decisions.md`

- **Purpose:** Las respuestas del mantenedor (Q-01 a Q-07) y las decisiones H-01 y H-02 detrás del alcance.

No hay investigación externa: nada de lo que necesita el brief requería conocimiento fuera del repositorio, salvo la premisa de ASM-03, que queda como supuesto.

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
