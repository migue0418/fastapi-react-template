---
artifact: requirements
feature: F004
status: approved
version: 2
upstream: [brief.md@1]
---

# Requirements: Compose sin credenciales fijas de base de datos

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

En este documento, «la contraseña de Compose» es la contraseña de PostgreSQL que el mantenedor elige para el despliegue con Docker Compose, y «la variable de la contraseña» es el nombre con el que se define; Design fija ese nombre.

---

## 1. Functional Requirements

### REQ-01: Compose se niega a arrancar sin contraseña

Si la contraseña de Compose no está definida o está vacía, Docker Compose no debe arrancar ningún servicio y debe mostrar un mensaje en español que nombra la variable de la contraseña y dice dónde y cómo definirla.

- **Priority:** Must
- **Source:** brief.md@1, 5.1 (primer y segundo punto); Q-01
- **Rationale:** Sin esta negativa, la ausencia de contraseña acabaría en una base sin credencial elegida o en un valor fijo escondido.

#### AC-01.1: Sin definir

- **Given** que la contraseña de Compose no está definida en ningún sitio y no existe el volumen `postgres_data`
- **When** el mantenedor ejecuta `docker compose up`
- **Then** el comando termina con código distinto de 0, no se crea ningún contenedor ni el volumen, y el mensaje, en español, nombra la variable de la contraseña y dice dónde y cómo definirla

#### AC-01.2: Definida pero vacía

- **Given** que la variable de la contraseña está definida con valor vacío
- **When** el mantenedor ejecuta `docker compose up`
- **Then** el resultado es el mismo que en AC-01.1

### REQ-02: Compose se niega a arrancar con una contraseña que no cumple los mínimos

Si la contraseña de Compose tiene menos de 16 caracteres, ni PostgreSQL ni el backend deben llegar a arrancar, la base de datos debe quedar sin inicializar y Docker Compose debe mostrar un mensaje en español que nombra la variable de la contraseña e indica la longitud mínima.

- **Priority:** Must
- **Source:** brief.md@1, 5.1 (segundo punto); Q-04, Q-06
- **Rationale:** Una contraseña corta o conocida, como `postgres`, anula el sentido de exigir una elegida.

#### AC-02.1: Por debajo del mínimo

- **Given** una contraseña de 15 caracteres y que no existe el volumen `postgres_data`
- **When** el mantenedor ejecuta `docker compose up`
- **Then** el comando termina con código distinto de 0; ni PostgreSQL ni el backend llegan a arrancar; el volumen `postgres_data`, si Compose lo ha creado, queda vacío, sin inicializar; y el mensaje, en español, nombra la variable e indica el mínimo de 16 caracteres

#### AC-02.2: El valor `postgres`

- **Given** que la contraseña es exactamente `postgres` y que no existe el volumen `postgres_data`
- **When** el mantenedor ejecuta `docker compose up`
- **Then** el resultado es el mismo que en AC-02.1

#### AC-02.4: Corregir la contraseña tras un rechazo

- **Given** que un rechazo de AC-02.1 o AC-02.2 ya ha ocurrido y la contraseña se cambia por una de 16 o más caracteres
- **When** el mantenedor ejecuta `docker compose up --build` sin borrar nada a mano
- **Then** el stack arranca como en AC-03.1, con la contraseña corregida

#### AC-02.3: En el mínimo exacto

- **Given** una contraseña de exactamente 16 caracteres
- **When** el mantenedor ejecuta `docker compose up` con un volumen nuevo
- **Then** el stack arranca como en AC-03.1

### REQ-03: Compose arranca con la contraseña elegida

Cuando la contraseña de Compose cumple los mínimos, Docker Compose debe arrancar PostgreSQL y el backend usando esa contraseña, sin ningún paso adicional.

- **Priority:** Must
- **Source:** brief.md@1, 3 y 5.1; SC-02
- **Rationale:** Es el camino feliz: el mantenedor despliega con una contraseña suya.

#### AC-03.1: Volumen nuevo y contraseña válida

- **Given** una contraseña de 16 o más caracteres y que no existe el volumen `postgres_data`
- **When** el mantenedor ejecuta `docker compose up --build`
- **Then** el backend queda sano, `GET http://localhost:8000/health` responde 200 con `{ "status": "ok" }`, PostgreSQL acepta conexiones desde `127.0.0.1:5432` con esa contraseña y rechaza `postgres`

### REQ-04: La contraseña se define una sola vez

La configuración de Compose debe tomar la contraseña de un único lugar local y no versionado, de modo que la base de datos y el backend usen la misma sin que el mantenedor la escriba dos veces.

- **Priority:** Must
- **Source:** brief.md@1, 5.1 (tercer punto); ASM-01
- **Rationale:** Dos definiciones se desincronizan, y una de ellas podría acabar versionada.

#### AC-04.1: Una sola definición basta

- **Given** que la contraseña está definida en un único lugar, y en ningún otro sitio de la configuración local
- **When** el mantenedor ejecuta `docker compose up` con un volumen nuevo
- **Then** el backend se conecta a la base de datos y queda sano, y PostgreSQL acepta esa contraseña

### REQ-05: Ningún archivo versionado trae una contraseña de PostgreSQL

Los archivos versionados que usa Docker Compose, incluida la configuración de ejemplo, no deben contener ninguna contraseña de PostgreSQL con valor, ni sola ni dentro de una URL de conexión.

- **Priority:** Must
- **Source:** brief.md@1, SC-01 y 5.1 (primer y tercer punto); ASM-02; CON-01
- **Rationale:** El repositorio es público: cualquier valor versionado es conocido.

#### AC-05.1: Inspección de los archivos versionados

- **Given** el repositorio en la rama de la feature
- **When** se inspeccionan `docker-compose.yml` y la configuración de ejemplo que usa Compose
- **Then** ninguno contiene una contraseña de PostgreSQL con valor, ni sola ni dentro de una URL de conexión; no aparece `postgres:postgres` en ellos

#### AC-05.2: El ejemplo copiado sin editar

- **Given** que la configuración local se creó copiando el ejemplo sin cambiar nada
- **When** el mantenedor ejecuta `docker compose up`
- **Then** Compose se niega a arrancar como en AC-01.1 o AC-02.1, y el mensaje dice dónde poner la contraseña

### REQ-06: Los tests no se conectan a ningún servidor sin configuración explícita

Si `TEST_DATABASE_ADMIN_URL` no está definida, la suite de tests del backend debe detener los tests que usan la base de datos con un mensaje en español que nombra `TEST_DATABASE_ADMIN_URL` y dice qué poner, sin conectarse a ningún servidor.

- **Priority:** Must
- **Source:** brief.md@1, 5.1 (cuarto punto); Q-05, Q-07; RM-09; ASM-05
- **Rationale:** Evita crear y borrar bases en el servidor de otro proyecto sin que el mantenedor lo haya decidido.

#### AC-06.1: Sin la variable

- **Given** que `TEST_DATABASE_ADMIN_URL` no está definida
- **When** el mantenedor lanza la suite del backend
- **Then** cada test que usa la base de datos falla con un error, no se omite, y el mensaje, en español, nombra `TEST_DATABASE_ADMIN_URL` y dice qué poner

#### AC-06.2: Sin efectos en el servidor del puerto 5432

- **Given** que `TEST_DATABASE_ADMIN_URL` no está definida y que otro servidor PostgreSQL escucha en `127.0.0.1:5432` con las credenciales `postgres:postgres`
- **When** el mantenedor lanza la suite del backend
- **Then** no se abre ninguna conexión a ese servidor y no se crea ninguna base de datos en él

#### AC-06.3: Con la variable

- **Given** que `TEST_DATABASE_ADMIN_URL` apunta a un servidor PostgreSQL válido
- **When** el mantenedor lanza la suite del backend
- **Then** los tests de base de datos se ejecutan contra ese servidor, crean y borran sus bases temporales como antes, y la suite pasa igual que antes del cambio

#### AC-06.4: Tests que no usan la base de datos

- **Given** que `TEST_DATABASE_ADMIN_URL` no está definida
- **When** el mantenedor lanza la suite del backend
- **Then** los tests que no usan la base de datos, como los de configuración y los del renombrado, se ejecutan y pasan

### REQ-07: El README describe el flujo nuevo

El README debe describir cómo definir la contraseña de Compose, qué hacer con un volumen de PostgreSQL ya inicializado con otra contraseña, y cómo apuntar los tests a la base de Compose.

- **Priority:** Must
- **Source:** brief.md@1, 5.1 (quinto punto); SC-04; Q-02, Q-03
- **Rationale:** Sin ello, un volumen existente deja el stack sin poder conectar (RISK-01) y el inicio rápido deja de funcionar tal como está escrito.

#### AC-07.1: El inicio rápido llega a `/health`

- **Given** un clon limpio sin volumen `postgres_data`
- **When** se sigue el inicio rápido (Docker) del README, sin consultar otra fuente
- **Then** el stack arranca y `GET /health` responde 200

#### AC-07.2: Las dos salidas para un volumen ya inicializado

- **Given** un volumen `postgres_data` creado con otra contraseña y una contraseña nueva válida
- **When** se siguen, por separado, cada uno de los dos procedimientos del README (borrar el volumen y empezar de cero, o cambiar la contraseña dentro de la base)
- **Then** tras cada uno, el stack queda sano con la contraseña nueva y `GET /health` responde 200

#### AC-07.3: Tests contra la base de Compose

- **Given** el stack de Compose en marcha con una contraseña válida
- **When** se sigue el apartado de tests del README para apuntar `TEST_DATABASE_ADMIN_URL` a esa base
- **Then** la suite del backend se ejecuta contra ella según AC-06.3

---

## 2. Non-Functional Requirements

### NFR-01: Los mensajes de rechazo no repiten la contraseña

Los mensajes de rechazo de Compose y de la suite de tests no deben repetir el valor de contraseña recibido.

- **Priority:** Must
- **Source:** brief.md@1, CON-01; NC-007
- **Target:** 0 apariciones del valor recibido en la salida de cada caso de rechazo (AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-06.1).
- **Conditions:** Cada caso se ejecuta con una cadena de prueba que no es un secreto real, para poder buscarla en la salida.
- **Verify:** Ejecutar cada caso con esa cadena y buscarla en la salida completa del comando.
- **Rationale:** Una contraseña impresa queda en el historial del terminal y en cualquier log que lo capture.
- **Status:** Confirmed

### NFR-02: El comportamiento es el mismo en Windows y en Linux

El rechazo y el arranque de REQ-01 a REQ-04 deben dar el mismo resultado al ejecutarse desde PowerShell en Windows y desde un shell de Linux.

- **Priority:** Should
- **Source:** brief.md@1, 2 (entorno del mantenedor); `stack.yaml`
- **Target:** Los casos de SC-02 dan el mismo resultado en ambos entornos.
- **Conditions:** El mantenedor trabaja en Windows con PowerShell; un derivado se despliega normalmente en un servidor Linux.
- **Verify:** Ejecutar los casos de SC-02 en PowerShell. En Linux, ejecutarlos si hay un entorno disponible; si no, declararlo como no verificado (PR-002).
- **Rationale:** Un mecanismo atado a un shell concreto funcionaría en un entorno y no en el otro.
- **Status:** Provisional

---

## 3. Quality Attributes Considered

- **Rendimiento:** La validación ocurre una vez, al arrancar Compose o la suite de tests, y no afecta a las peticiones de la aplicación.
- **Accesibilidad y usabilidad de interfaz:** La feature no crea ni cambia ninguna pantalla. La claridad de los mensajes se cubre en los criterios de aceptación de cada rechazo.
- **Privacidad:** No se tratan datos personales.
- **Disponibilidad:** Que Compose no arranque ante una contraseña inválida es el comportamiento pedido, no una pérdida de disponibilidad. El efecto sobre un volumen ya inicializado se trata en REQ-07 y RISK-01.

---

## 4. Scope Exclusions

Los de `brief.md@1`, 5.2, más estas aclaraciones surgidas al escribir los requisitos:

- Los mínimos de la contraseña se aplican solo a la contraseña de Compose, no a la contraseña que pueda llevar `TEST_DATABASE_ADMIN_URL`, que apunta a un servidor que puede no ser el de Compose.
- Cambiar el valor de `TEST_DATABASE_ADMIN_URL` no altera cómo se crean ni se borran las bases temporales de los tests (AC-06.3).

---

## 5. Assumptions and Open Questions

Los supuestos ASM-01 a ASM-04 y la pregunta OQ-01 viven en `brief.md@1`, sección 7 y 8, y se aplican igual aquí.

### ASM-05: Sin `TEST_DATABASE_ADMIN_URL`, fallan los tests que usan la base de datos y siguen los demás

- **Basis:** Q-07 pidió que los tests «se detengan con un mensaje». Detener toda la ejecución ocultaría el resultado de los tests que no necesitan base de datos, que hoy se pueden lanzar sin ella (F003 los registró pasando). Fallar con error, no omitir, mantiene PR-002.
- **Impact:** REQ-06 y AC-06.1 a AC-06.4.
- **Status:** Confirmed
- **Resolution:** Confirmado por el mantenedor al aprobar estos requisitos (H-04, 2026-11-02).

---

## 6. Traceability and Coverage

Cobertura del alcance de `brief.md@1`, 5.1:

- Compose exige siempre una contraseña, sin valor versionado: REQ-01, REQ-05.
- Mínimos de la contraseña, con rechazo y mensaje: REQ-02.
- Una sola definición, y ejemplo y README sin contraseña por defecto: REQ-03, REQ-04, REQ-05, REQ-07.
- Tests sin `TEST_DATABASE_ADMIN_URL`: REQ-06.
- README para el volumen ya inicializado y para los tests: REQ-07.

Nota: con un mínimo de 16 caracteres, el rechazo de `postgres` ya queda implícito en REQ-02. Se conserva AC-02.2 como criterio explícito por pedirlo el mantenedor (Q-04), y ASM-04 queda sin efecto práctico mientras el mínimo sea de 16.

Cambios de la versión 2 (H-05, opción A; R1-01): REQ-02, AC-02.1 y AC-02.2 dejan de exigir que no se cree ningún contenedor ni el volumen, porque Compose solo puede medir la longitud tras crearlos; exigen que nada arranque y que la base quede sin inicializar. Se añade AC-02.4 (corregir la contraseña tras un rechazo, que un volumen vacío no conserva la contraseña mala). REQ-01 (sin definir o vacía) no cambia: la interpolación nativa sí rechaza sin crear nada. En AC-05.2 la referencia a AC-02.1 sigue válida con el resultado nuevo.

- **Coverage gaps:** None
- **Unresolved dependencies:** OQ-01 (abierta con valor por defecto, fuera de alcance) y ASM-05 (confirmado en H-04).

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
