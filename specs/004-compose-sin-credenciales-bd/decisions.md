---
artifact: decisions
feature: F004
---

# Decisions: Compose sin credenciales fijas de base de datos

> Records every question, answer, and decision about a feature: what was put to the human and what they decided, the Discover questions and their answers, the notable choices made along the way, and the documentation the feature affects.
> This document is the feature's record of why it is the way it is. Together with the state record, it lets any later session resume the feature from the files alone.
> It is append-only: entries are added, never rewritten. It points to the artifacts by ID and version and never duplicates their content.

---

## 1. Human Decisions

### H-01: El cambio se trata como «Pequeño»: feature SDD con una sola tarea

- **Raised in:** Define / clasificación del cambio (EP-007)
- **Concerns:** RM-03
- **Blocks:** Abrir la feature
- **Context:** RM-03 toca despliegue, seguridad y datos persistentes (el volumen de PostgreSQL), así que no es trivial. Es un solo comportamiento observable con pocos archivos y, por ahora, sin decisiones difíciles de revertir.
- **Options:** Pequeño (una sola tarea) / Normal (varias tareas) / Trivial (chore sin feature SDD)
- **Recommendation (not binding):** Pequeño. Se reclasifica a Normal si el Discover revela una decisión difícil de revertir.
- **Status:** Decided
- **Answer:** Pequeño (Recomendado)
- **Decided on:** 2026-11-02

### H-02: La feature absorbe RM-09 y pasa a «Normal»

- **Raised in:** Define / Discover, ronda 2 (Q-03, Q-05)
- **Concerns:** RM-03, RM-09, H-01
- **Blocks:** El alcance del brief
- **Context:** El mantenedor respondió «Dentro» a Q-03 (el valor por defecto de los tests). Eso es el resultado de RM-09, fuera de RM-03. Absorberlo da a la feature dos comportamientos valorables por separado, lo que supera una señal de tamaño de la metodología (el resultado lleva un «y»), y ensancha el ítem: es un cambio de roadmap y decisión del mantenedor.
- **Options:** Absorber RM-09 (reclasificar a Normal, dos tareas; RM-09 se cierra absorbido en RM-03) / Dejarlo fuera (RM-09 sigue en el inbox)
- **Recommendation (not binding):** Dejarlo fuera, por alcance mínimo. El mantenedor eligió absorberlo.
- **Status:** Decided
- **Answer:** Absorber RM-09
- **Decided on:** 2026-11-02

### H-03: Aprobación de brief.md@1

- **Raised in:** Define / brief approval
- **Concerns:** brief.md@1, ASM-01 a ASM-04, OQ-01, RISK-01 a RISK-03
- **Blocks:** Escribir requirements.md
- **Context:** El brief recoge las respuestas Q-01 a Q-07 y las decisiones H-01 y H-02. Supuestos a revisar: ASM-01 (contraseña escrita una sola vez en un archivo local), ASM-02 (el ejemplo no trae contraseña por defecto), ASM-03 (el volumen conserva la contraseña antigua), ASM-04 (comparación exacta con `postgres`). Pregunta abierta con valor por defecto: OQ-01 (no rechazar la URL por defecto de la aplicación).
- **Options:** Aprobar / aprobar con cambios / replantear
- **Recommendation (not binding):** Aprobar, tras revisar ASM-02 y OQ-01, que son las dos que más pueden cambiar el alcance.
- **Status:** Decided
- **Answer:** Aprobar (Recomendado). Aprueba brief.md@1 con ASM-01 a ASM-04 y OQ-01 con su valor por defecto.
- **Decided on:** 2026-11-02

### H-04: Aprobación de requirements.md@1

- **Raised in:** Define / requirements approval
- **Concerns:** requirements.md@1 (built from brief.md@1), ASM-05
- **Blocks:** Cerrar Define y pasar a Design
- **Context:** Siete requisitos funcionales y dos cualidades. Decisiones de interpretación que el mantenedor debe confirmar: (1) con el mínimo de 16 caracteres, «distinta de `postgres`» queda cubierta por la longitud y se conserva solo como criterio de aceptación explícito (AC-02.2); (2) ASM-05: si falta `TEST_DATABASE_ADMIN_URL`, fallan con el mensaje los tests que usan la base de datos, y los que no la usan siguen ejecutándose, en lugar de abortar toda la ejecución; (3) el ejemplo versionado deja de traer una URL con contraseña (AC-05.1), lo que cambia el flujo de desarrollo local sin Docker.
- **Options:** Aprobar / aprobar con cambios / replantear
- **Recommendation (not binding):** Aprobar tras revisar ASM-05 y el punto (3).
- **Status:** Decided
- **Answer:** Aprobar (Recomendado). Aprueba requirements.md@1, con los tres puntos de interpretación y ASM-05.
- **Decided on:** 2026-11-02

### H-05: Cómo se rechaza una contraseña corta o `postgres` si Compose no puede hacerlo sin crear contenedores

- **Raised in:** Design / Phase 2 (incógnita: cómo valida Compose la longitud)
- **Concerns:** requirements.md@1 (REQ-02, AC-02.1, AC-02.2), brief.md@1 (5.1, Q-04, Q-06), reviews/findings-1.md#R1-01
- **Blocks:** El diseño de REQ-02 y la tarea de Compose. REQ-01, REQ-03 a REQ-07 y los tests (REQ-06) no dependen de la respuesta.
- **Context:** Comprobado con Compose v5.4.0: la interpolación nativa solo rechaza «sin definir» y «vacía». Medir la longitud exige una comprobación dentro de Compose, que se ejecuta cuando Compose ya ha creado los contenedores y el volumen. Los criterios AC-02.1 y AC-02.2 piden que no se cree ninguno. Los requisitos se revisan en Define y el mantenedor los aprueba de nuevo.
- **Options:**
  - A. Comprobación dentro de Compose (servicio previo que falla): rechaza < 16 y `postgres` con mensaje en español. Hay que reformular AC-02.1 y AC-02.2: ningún servicio arranca, la base queda sin inicializar; el contenedor de comprobación y el volumen vacío sí quedan creados.
  - B. Solo la interpolación nativa: Compose rechaza sin definir y vacía. El mínimo de 16 y `postgres` pasan a la documentación y al comentario del ejemplo, sin comprobación. Se retira REQ-02.
  - C. B más un script multiplataforma (Python, con `uv run`, como `rename_project.py`) que valida el mínimo y lanza Compose. Quien ejecute `docker compose up` directamente se salta la comprobación de longitud.
- **Recommendation (not binding):** A. Es la única que mantiene la validación pedida en Q-04 y Q-06 con el comando `docker compose up` de siempre. Su coste es que un rechazo deja un contenedor parado y un volumen vacío, que no guardan ninguna contraseña.
- **Status:** Decided
- **Answer:** A: Comprobación en Compose (Recomendado)
- **Decided on:** 2026-11-02

### H-06: Aprobación de requirements.md@2

- **Raised in:** Define / revisión de requisitos aprobados (R1-01, H-05)
- **Concerns:** requirements.md@2 (built from brief.md@1), REQ-02, AC-02.1, AC-02.2, AC-02.4
- **Blocks:** Reanudar Design desde la Fase 2
- **Context:** La opción A de H-05 no puede garantizar que no se cree ningún contenedor ni el volumen. @2 exige que nada arranque y que la base quede sin inicializar, y añade AC-02.4 (corregir la contraseña y volver a ejecutar sin borrar nada a mano). Es un cambio del comportamiento aprobado, por eso vuelve al mantenedor. El resto de los requisitos no cambia.
- **Options:** Aprobar / aprobar con cambios / replantear
- **Recommendation (not binding):** Aprobar.
- **Status:** Decided
- **Answer:** Aprobar (Recomendado). Aprueba requirements.md@2.
- **Decided on:** 2026-11-02

### H-07: Aprobación de design.md@2

- **Raised in:** Design / Phase 6
- **Concerns:** design.md@2 (built from brief.md@1 y requirements.md@2), reviews/design-r1.md y reviews/design-r1-answers.md, ASM-03, ASM-06, RISK-04, RISK-05
- **Blocks:** Escribir el plan y pasar a Build
- **Context:** Tres tareas: T-01 Compose (contraseña en el `.env` de la raíz, servicio previo `postgres-check`, ejemplos sin contraseña), T-02 tests (exigen `TEST_DATABASE_ADMIN_URL`) y T-03 README, que depende de las dos primeras. Sin decisiones de sentido único, sin ADR y sin cambios en el stack. La revisión independiente (ronda 1) aprobó con 6 hallazgos menores, todos corregidos en @2; ninguno rechazado. A revisar: la contraseña no puede llevar caracteres reservados de URL ni `$` (RISK-04) y no se comprueba, porque sería una regla de composición excluida del brief; un rechazo por contenido deja un contenedor parado y un volumen vacío (RISK-05, ya aceptado en H-05); el flujo de «Desarrollo local» sin Docker pasa a exigir añadir la contraseña a `DATABASE_URL` (H-04, punto 3).
- **Options:** Aprobar / aprobar con cambios / replantear
- **Recommendation (not binding):** Aprobar.
- **Status:** Decided
- **Answer:** Aprobar (Recomendado). Aprueba design.md@2.
- **Decided on:** 2026-11-02

---

## 2. Discover Questions

### Round 1

#### Q-01: ¿Compose exige una contraseña elegida también en desarrollo local, o solo en producción?

- **Why it matters:** Decide si `docker compose up` sigue funcionando sin configurar nada en desarrollo. Cambia el alcance y el flujo del inicio rápido del README.
- **Recommended:** Siempre exigida, también en desarrollo. Compose no sabe si es producción, y el resultado de RM-03 es que no haya ninguna fija en el archivo versionado. El coste es un paso más en el inicio rápido.
- **Answer:** Siempre exigida (Recomendado)
- **Answered on:** 2026-11-02

#### Q-02: ¿Qué debe pasar con un volumen de PostgreSQL ya inicializado con la contraseña antigua?

- **Why it matters:** PostgreSQL solo aplica la contraseña la primera vez que crea el volumen. Con una contraseña nueva y un volumen viejo, el backend no podrá conectar. Define si la feature solo documenta la salida o también añade un aviso.
- **Recommended:** Documentar en el README las dos salidas (borrar el volumen y empezar de cero, o cambiar la contraseña dentro de la base) y no añadir detección automática. La plantilla la usa un solo mantenedor (PR-004) y el aviso exigiría mecanismo propio.
- **Answer:** Solo documentarlo (Recomendado)
- **Answered on:** 2026-11-02

#### Q-03: ¿Entra en esta feature el valor por defecto de los tests (`postgres:postgres` contra `127.0.0.1:5432`)?

- **Why it matters:** Sin la contraseña fija de Compose, los tests contra la base de Compose necesitan `TEST_DATABASE_ADMIN_URL`. Incluirlo ensancha el alcance más allá de `docker-compose.yml`.
- **Recommended:** Fuera de alcance. Ya lo cubre RM-09 en el inbox. Esta feature solo documenta en el README cómo apuntar los tests a la base de Compose con `TEST_DATABASE_ADMIN_URL`.
- **Answer:** Dentro
- **Answered on:** 2026-11-02

#### Q-04: ¿Basta con exigir que la contraseña esté definida, o Compose debe rechazar además valores concretos como `postgres`?

- **Why it matters:** Rechazar valores concretos añade un requisito y un mecanismo de comprobación propio. Exigir solo que esté definida cumple el resultado de RM-03 (ninguna fija en el archivo versionado).
- **Recommended:** Basta con exigir que esté definida y no vacía. La elección de una contraseña débil queda en manos del mantenedor, igual que su `SECRET_KEY` fuera de producción.
- **Answer:** Más estricto, aparte de no poder poner postgres, debe de ser una contraseña que cumpla unos mínimos
- **Answered on:** 2026-11-02

### Round 2

Sigue lo que abrieron Q-03 («Dentro») y Q-04 («unos mínimos»). Q-03 ensancha el alcance más allá del ítem RM-03: widening the feature beyond its roadmap item es una decisión del mantenedor.

#### Q-05: ¿Qué significa «Dentro» en Q-03: absorber RM-09 entero, o dejarlo fuera?

- **Why it matters:** RM-03 solo cubre `docker-compose.yml` y su configuración. Cambiar el valor por defecto de los tests es el resultado de RM-09 («los tests no usan por defecto un PostgreSQL ajeno»): absorberlo da a la feature dos comportamientos que el mantenedor valoraría por separado y las señales de tamaño de la metodología lo desaconsejan. La feature pasaría de «Pequeño» a «Normal» (H-01) y RM-09 se cerraría como entregada por F004.
- **Recommended:** Fuera: RM-09 sigue aparte y esta feature solo documenta cómo apuntar los tests a la base de Compose. Es la opción de menor alcance y la que respeta el ítem. Si el mantenedor prefiere absorberlo, es decisión suya y se reclasifica.
- **Answer:** Absorber RM-09
- **Answered on:** 2026-11-02

#### Q-06: ¿Qué mínimos debe cumplir la contraseña de PostgreSQL?

- **Why it matters:** Define los requisitos y criterios de aceptación de la validación. Q-04 ya fijó que no puede ser `postgres` ni estar vacía; falta decidir los mínimos de longitud y de composición.
- **Recommended:** Al menos 16 caracteres y distinta de `postgres`, sin reglas de composición (mayúsculas, dígitos, símbolos). La longitud aporta más que la composición, y la contraseña la usa una máquina, no una persona. Mínimos más exigentes que los de `SECRET_KEY` no tendrían sentido.
- **Answer:** 16+ caracteres, sin composición (Recomendado)
- **Answered on:** 2026-11-02

### Round 3

Sigue lo que abrió Q-05: absorber RM-09 obliga a decidir qué comportamiento tienen los tests cuando no se configura su conexión.

#### Q-07: Al lanzar los tests sin configurar `TEST_DATABASE_ADMIN_URL`, ¿qué deben hacer?

- **Why it matters:** Es el comportamiento observable de la parte de RM-09 (no tocar el servidor de otro proyecto). Cambia los requisitos y criterios de aceptación de los tests.
- **Recommended:** Que la suite se detenga con un mensaje en español que nombre `TEST_DATABASE_ADMIN_URL` y diga qué poner. Es seguro y visible (PR-002, NC-009). Saltarse los tests dejaría una suite en verde sin haber probado nada.
- **Answer:** Detenerse con un mensaje (Recomendado)
- **Answered on:** 2026-11-02

---

## 3. Decided Along the Way

| Date | Decision | Why | Refs |
|---|---|---|---|
| 2026-11-02 | La feature entrega RM-03 entera, sin dividirla. | Cumple los criterios de `ready` y ninguna señal de tamaño: un resultado, un usuario (Mantenedor), sin dependencias. | RM-03 |
| 2026-11-02 | Rama `feature/004-compose-sin-credenciales-bd` y commits convencionales en español. | EP-001 y EP-002 de la constitución. | F004 |
| 2026-11-02 | Corrige la primera fila: la feature entrega RM-03 ensanchado con RM-09 (H-02), no RM-03 a secas. En `roadmap.md` (versión 6) RM-03 amplía su resultado y RM-09 pasa a Closed como absorbido, sin borrarse. | Decisión del mantenedor en Q-05; un ítem ensanchado cambia el roadmap en la rama. | H-02, RM-03, RM-09 |
| 2026-11-02 | La feature se reclasifica de «Pequeño» a «Normal». Su tamaño se revisa en Design por si conviene dividirla en dos tareas. | EP-007: dos comportamientos observables dejan de caber en una sola tarea. El mantenedor conocía la consecuencia al decidir Q-05. | H-01, H-02 |
| 2026-11-02 | Design se detiene en la Fase 2 hasta que Define revise AC-02.1 y AC-02.2 según H-05 (opción A). Notas para esa revisión y para el diseño posterior: (1) la comprobación debe ser un servicio previo con `restart: "no"`; hacerla en el arranque de `postgres` provocaría un bucle de reinicios por su `restart: unless-stopped`; (2) con la opción A, un rechazo por longitud deja creados el contenedor de comprobación (parado con error), el contenedor de PostgreSQL (sin arrancar), el volumen (sin inicializar) y la red; (3) con `up -d` el mensaje queda en los logs del servicio de comprobación y Compose solo informa de que falló. | Evita rediseñar tras la revisión de Define. | H-05, R1-01, AC-02.1, AC-02.2 |
| 2026-11-02 | Define revisa requirements.md@1 -> @2 por H-05 (A): reformula REQ-02, AC-02.1 y AC-02.2 (nada arranca, volumen sin inicializar; el contenedor de comprobación y el volumen vacío pueden quedar creados) y añade AC-02.4 (corregir la contraseña tras un rechazo). Supuesto de la redacción: los criterios se comprueban con `docker compose up` sin `-d`, donde el mensaje se ve en la salida. @2 queda en borrador, puesto a aprobación (H-06). | Cierra R1-01; el cambio altera comportamiento aprobado, así que vuelve al mantenedor. | H-05, R1-01, REQ-02 |
| 2026-11-02 | Design (design.md@1 y @2): (1) la contraseña vive en un `.env` en la raíz con la variable `POSTGRES_PASSWORD`, porque es lo que Compose lee para interpolar sin opciones, y `.example.env` en la raíz la trae vacía; (2) la comprobación es el servicio `postgres-check` con la imagen `postgres:15`, `sh -c` en línea y `restart: "no"`, y mide con `wc -m` (comprobado: `${#VAR}` cuenta bytes); (3) `${POSTGRES_PASSWORD:?mensaje}` con el mismo mensaje en cada uso (comprobado: un uso sin `:?` añade una advertencia); (4) `backend/.example.env` pierde la contraseña de `DATABASE_URL`; (5) los tests lanzan `RuntimeError` en `_get_test_database_admin_url` (variable ausente o vacía) antes de conectar; (6) sin ADR, sin cambios en `stack.yaml`, sin pytest que dependa de Docker (las comprobaciones de Compose son ejecuciones reales, y RM-05 las automatizará). | Todo reversible y dentro del stack y del alcance aprobados. Probado con Compose v5.4.0: rechazo, recuperación sin borrar nada (AC-02.4) y conteo de caracteres. | H-05, REQ-02, REQ-04, REQ-06, ASM-06 |
| 2026-11-02 | Build, línea base: `uv run python -m pytest -q` en la rama de la feature con un PostgreSQL 15 desechable (`postgres:postgres` en 127.0.0.1:5432, retirado después) da 101 passed, sin fallos previos. El frontend no se toca en esta feature y no se ejecutó. | Fase 2 de Build; fija el recuento de referencia para AC-06.3. | T-02, AC-06.3 |
| 2026-11-02 | T-02: el mensaje de `RuntimeError` remite al README y da el ejemplo `postgresql+asyncpg://postgres:<contraseña>@127.0.0.1:5432/postgres` con marcador, sin valor real. La variable debe llevar el esquema `postgresql+asyncpg://`; con `postgresql://` los tests fallan con `No module named 'psycopg2'`, algo que T-03 debe dejar claro en el README. Sin la variable, 52 tests terminan en rechazo (49 ERROR y 3 FAILED, ninguno omitido): Verify cuenta 52. En la comprobación de AC-06.2 con un PostgreSQL en 5432, tras ejecutar sin la variable no quedó ninguna base `fastapi_template_test_*`; la parte «sin conexiones en el log» no se pudo comprobar porque PostgreSQL no registra conexiones por defecto, y queda el test automatizado que sustituye `asyncpg.connect`. | Informes de implementación y revisión de T-02 y comprobación del coordinador tras el merge. | T-02, AC-06.1, AC-06.2, AC-07.3 |
| 2026-11-02 | T-01: el mensaje de `:?` no lleva comillas dobles, `}` ni `: ` (rompen el YAML o la interpolación) y es idéntico en los tres usos, así que un rechazo por variable ausente o vacía imprime el mensaje tres veces (R1-01, aceptado en design.md@2, 9.1). El generador de contraseñas va en el mensaje de `postgres-check` y en `.example.env`, no en el de `:?`. Compose exige `backend/.env` (`env_file`, ya existía), así que `docker compose config` falla sin él, algo que T-03 debe tener presente en las comprobaciones. Queda para Verify repetir NFR-02 desde PowerShell y, si hay entorno, en Linux (R1-02). | Informes de implementación y revisión de T-01. | T-01, R1-01, R1-02, NFR-02 |
| 2026-11-02 | La revisión independiente del diseño (ronda 1, design.md@1) aprobó con 6 hallazgos menores; los 6 se corrigieron en design.md@2 (`reviews/design-r1-answers.md`). El R1-02 se resolvió midiendo en caracteres, sin rebajar REQ-02. | Phase 5 del diseño. | R1-01 a R1-06 |

---

## 4. Documentation Impact

| Date | Document | What changes | Refs |
|---|---|---|---|
| 2026-11-02 | `README.md` | El inicio rápido (Docker) ya no puede decir `admin` / `ChangeMe123!` junto a una base sin configurar; añadir el paso de la contraseña de PostgreSQL y el procedimiento para un volumen ya inicializado. | RM-03 |
| 2026-11-02 | `docs/behaviour/deployment.md` | Nuevo requisito sobre las credenciales de la base de datos de Compose. | RM-03 |
| 2026-11-02 | `.sdd/architecture.md` (9.2), `.sdd/product.md` (CAP-06), `.sdd/constitution.md` (NC-007) | El gap de `postgres:postgres` pasa a cerrado; NC-007 ya no cita `postgres:postgres` como valor por defecto versionado de Compose. | RM-03 |
| 2026-11-02 | `.sdd/architecture.md` (9.2), `README.md`, `docs/development_guide.md`, `docs/verification-guide.md` | El gap de los tests contra `127.0.0.1:5432` pasa a cerrado (RM-09). El README y las guías sustituyen el valor por defecto de `TEST_DATABASE_ADMIN_URL` por la obligación de definirla. | RM-09, H-02 || 2026-11-02 | `README.md` (T-02) | La línea 65 y siguientes y la fila de la tabla de variables aún dicen que hay un valor por defecto `postgres:postgres`; las cubre T-03. Indicar el esquema `postgresql+asyncpg://` de `TEST_DATABASE_ADMIN_URL`. | T-02, AC-07.3 || 2026-11-02 | `README.md`, `backend/.example.env` (T-01) | El inicio rápido necesita el paso del `.env` de la raíz; la nota de que con `-d` el mensaje de rechazo está en `docker compose logs postgres-check`; el volumen vacío que deja un rechazo y el que conserva la contraseña antigua (ASM-03); `DATABASE_URL` de `backend/.example.env` ya no trae contraseña. | T-01, AC-07.1, AC-07.2 |

---

## 5. Maintenance Guidelines

This document is append-only.

- Add entries at the end of their section. Never rewrite or delete an earlier entry.
- The only change allowed to an existing entry is filling in its answer fields once, when the human answers.
- To correct an entry, add a new one that names the entry it corrects and why.
- Record the human's answers verbatim. A summary or an interpretation is never recorded as their answer.
- Date every entry, and name the IDs and versions it concerns.

### Source of Truth

- This document is the canonical record of what was asked, answered, and decided about the feature.
- The feature's state record says where the feature stands and points to the open entries here; it never repeats them.
- An approval is recorded here, and mirrored by the `status` of the approved artifact. If the two disagree, this document is correct and the artifact is fixed.
- The artifacts hold the content that was decided. This document records the decision, not the content.
