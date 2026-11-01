---
artifact: review
feature: F001
kind: design
target: specs/001-retirar-openspec/design.md@1
sources: [specs/001-retirar-openspec/brief.md@2, specs/001-retirar-openspec/requirements.md@1, specs/001-retirar-openspec/decisions.md, .sdd/constitution.md@1.0.0, .sdd/stack.yaml@1, .sdd/architecture.md@1, .sdd/product.md@1, .sdd/skills.yaml@1, .sdd/documentation.yaml@1, .sdd/roadmap.md@2]
round: 1
verdict: changes-required
---

# Review: specs/001-retirar-openspec/design.md@1, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

### R1-01: 14 de los 16 criterios de aceptación no tendrán un test que los nombre, y la feature no podrá pasar Verify

- **Severity:** Blocking
- **Where:** `design.md`, secciones 9.1 ("Test de repositorio para AC-07.1 y AC-03.3") y 11; `decisions.md`, sección 3, entrada "Comprobar AC-07.1 y AC-03.3 con una búsqueda"
- **What is wrong:** El diseño descarta un test para AC-07.1 y AC-03.3 y los deja a "una búsqueda en Verify". Para los demás criterios de documentación y de repositorio (AC-01.1 a AC-01.3, AC-02.1, AC-02.2, AC-03.3, AC-04.1, AC-04.2, AC-05.1 a AC-05.3, AC-06.1, AC-07.1 y AC-08.1) no nombra ninguna comprobación ejecutable, salvo menciones sueltas en la tabla de fallos. T-01 figura con "Ninguna concreta" como tecnología, y T-03 solo con `packaging-and-deployment`. Únicamente AC-03.1 y AC-03.2 tendrán un test de forma natural. El proceso que el proyecto usa exige lo contrario, así que Build y Verify chocarán con el diseño aprobado, y la feature volverá a Design con fix tasks.
- **Evidence:**
  - `sdd-verify`, Traceability: "A criterion with no test that names it, or whose tests fail, is a failure."
  - Plantilla `evidence.md`: "Every acceptance criterion MUST have at least one test that names its full ID and passes."
  - `sdd-implement`: "Every acceptance criterion the task delivers has at least one test that names it with its full ID (`F003:AC-02.1`)".
  - `methodology.md`, sección 8: Verify termina cuando "every acceptance criterion has a passing test".
  - Constitución, sección 4: los requisitos obligatorios "MUST have appropriate verification evidence", y PR-002 pide evidencia ejecutada.
  - La entrada de `decisions.md` es una decisión tomada por el autor, no por el mantenedor, de modo que no cuenta como decisión humana. Tampoco se ha consultado la desviación.
  - La razón de 9.1 tampoco alcanza a AC-03.3: un test sobre `scripts/rename_project.py` no fallaría en un derivado, porque el renombrado no toca ese archivo. El obstáculo real es otro: el test versionado nombraría el término fuera de la lista cerrada de AC-07.1.
- **Recommended fix:** Definir para cada criterio una comprobación ejecutable que nombre su ID completo (`F001:AC-nn.m`), o llevar al mantenedor una excepción explícita. Una vía compatible con AC-07.1 es un script de comprobación dentro de `specs/001-retirar-openspec/`, carpeta ya exceptuada, que no se ejecuta en los derivados porque no forma parte de la suite. AC-08.1 necesita un tratamiento propio, ligado a R1-02. La tarea de cada criterio debe indicar qué comprobación entrega.

### R1-02: T-03 no puede entregar AC-08.1 desde su propia copia de trabajo

- **Severity:** Blocking
- **Where:** `design.md#C-05`, sección 11 (T-03, AC-08.1)
- **What is wrong:** El diseño asigna la actualización del `CLAUDE.md` local a T-03. Build implementa cada tarea en una copia de trabajo y rama propias, y `CLAUDE.md` está ignorado, de modo que no existe en esa copia. La vía de fallo de C-05 ("se informa en vez de crearlo") permite entonces terminar T-03 sin el cambio. Si el implementador edita el archivo del directorio del mantenedor, ese cambio queda fuera de la rama: la revisión de la tarea no lo ve, y deshacer el merge no lo revierte. El orden tampoco coincide con lo acordado, porque el diseño lo hace durante Build, y un T-03 retenido dejaría el archivo sin nombrar una carpeta que aún existe.
- **Evidence:**
  - `git check-ignore -v CLAUDE.md` devuelve `.gitignore:28`.
  - `sdd-build`, sección 1: "`sdd-implement` builds it, in a subagent with its own working copy and branch". `sdd-implement`, sección 9: "with its own working copy".
  - `sdd-review`, 6.3: la revisión de una tarea juzga "the change the task makes, on its branch".
  - AC-08.1: "al terminar la feature". Q-02, respuesta recomendada y elegida: "retocarlo al terminar, fuera del PR".
  - La tabla de fallos solo contempla que el archivo entre en un commit, no este caso.
- **Recommended fix:** Separar la entrega de C-05 de las tareas de Build y situarla en un paso explícito sobre el directorio principal, con su responsable y su momento, por ejemplo tras Verify o al cerrar la feature. Debe indicar cómo se comprueba AC-08.1 y qué ocurre si el paso no se hace. Si se conserva en T-03, el diseño debe decir cómo llega la tarea al archivo y quién lo comprueba.

### R1-03: T-01 deja el README y la guía remitiendo a una ruta que ya no existe, en contra de lo que afirma el Overview

- **Severity:** Minor
- **Where:** `design.md`, sección 2 ("cada tarea deja el proyecto coherente") y sección 11 (T-01 y T-03)
- **What is wrong:** T-01 mueve las specs, pero el paso 5 del README sigue diciendo que `openspec/specs/` describe el comportamiento heredado hasta T-03. Durante ese intervalo, la rama de la feature da una instrucción falsa. El efecto es limitado porque nada llega a `main` hasta el PR, pero la afirmación del Overview no es exacta, y un T-03 retenido alargaría ese estado.
- **Evidence:** `README.md:25`: "`openspec/specs/` describe el comportamiento que hereda el proyecto". AC-04.1 se entrega en T-03. EP-005 pide actualizar la documentación afectada dentro del mismo cambio.
- **Recommended fix:** Redirigir esa línea del README en T-01, o limitar la afirmación del Overview a los archivos fundacionales y declarar el intervalo.

### R1-04: `docs/base-standards.md` falta en las referencias y en el impacto documental

- **Severity:** Minor
- **Where:** `design.md#C-04`; `decisions.md`, sección 4
- **What is wrong:** La feature añade un elemento a `docs/`, y `base-standards.md` mantiene una lista de esos documentos. El catálogo pide actualizarlo cuando cambia esa lista, pero ni C-04 ni el impacto documental lo nombran. Si se omite, Document puede pasarlo por alto, y el punto de entrada de los estándares no llevará a `docs/behaviour/`.
- **Evidence:** `.sdd/documentation.yaml`, entrada `docs/base-standards.md`: "cambia un principio general o la lista de documentos". `docs/base-standards.md`, líneas 23 a 28: lista de documentos. AC-05.3 añade `docs/behaviour/` a la estructura de `documentation-standards.md`.
- **Recommended fix:** Añadirlo a C-04 y al impacto documental, o dejar constancia de por qué no se considera un cambio de esa lista.

### R1-05: El diseño no aclara qué comprobaciones de Docker ejecuta T-03 ni por qué omite parte de la guía

- **Severity:** Minor
- **Where:** `design.md`, secciones 7 (NFR-01) y 11 (nota final)
- **What is wrong:** T-03 cambia `.dockerignore`, pero `docker compose build backend` solo se demuestra en Verify. La guía de verificación pide, además, levantar los servicios y comprobar el usuario y el puerto. El alcance reducido puede ser razonable, sobre todo porque el puerto 5432 puede estar ocupado por otro proyecto, pero el diseño no lo declara ni lo justifica.
- **Evidence:** EP-006 (MUST, "Toda tarea y toda feature"): "las comprobaciones de Compose si cambia Docker". `docs/verification-guide.md`, sección 3: `docker compose up -d --build`, `exec backend id -u` y `port postgres 5432`. `architecture.md`, 9.2: el puerto 5432 puede ser de otro proyecto. NFR-01 solo fija el build como objetivo.
- **Recommended fix:** Indicar si T-03 ejecuta el build, y justificar de forma explícita por proporción (constitución, sección 4) lo que no se ejecuta de la sección 3 de la guía.

### R1-06: IF-01 afirma que las salidas no cambian, pero la ayuda sí debe cambiar

- **Severity:** Minor
- **Where:** `design.md#IF-01`, Operations
- **What is wrong:** IF-01 incluye `--help` entre las operaciones y dice que "las salidas" no cambian. AC-03.3 obliga a retirar de la ayuda la mención a `openspec`, y la propia sección 1 del diseño reconoce que la ayuda lo nombra. Quien implemente con IF-01 como referencia recibe una indicación contradictoria.
- **Evidence:** `scripts/rename_project.py:46-48`: "salvo en openspec/changes/archive/ y en este script". AC-03.3: "se lee su ayuda y su código... no menciona `openspec`".
- **Recommended fix:** Declarar en IF-01 el cambio del texto de ayuda como única variación de salida.

---

## 3. Verdict

- **Verdict:** Changes required
- **Blocking findings:** 2 (R1-01, R1-02)
- **Minor findings:** 4
- **Converging:** Yes: primera ronda, sin rondas anteriores con las que comparar
- **Limits of this review:** Revisión independiente, desde los archivos, sin explicación del autor. No se ejecutó nada que dependa de la feature: ni el movimiento con `git mv`, ni `git log --follow` sobre las rutas nuevas tras merges de tareas, ni `docker compose build backend` sin `backend/.env`, ni la suite de tests. De `README.md` y `docs/` solo se revisaron las líneas relevantes mediante búsquedas, no el texto completo. Las búsquedas de `openspec` se hicieron sobre el árbol de trabajo, respetando `.gitignore`. Los skills `sdd-build`, `sdd-implement` y `sdd-verify` se consultaron como evidencia del proceso, aunque no figuran en la lista de fuentes. Ningún skill del catálogo aplica a esta revisión: `frontend-design` es el único con `use-when: design`, y la feature no cambia pantallas.

### 3.1 What Should Be Kept

- La cobertura es completa: cada REQ y NFR está en un componente o interfaz, y cada AC en una tarea.
- El inventario de la sección 1 es exacto: se comprobaron 41 archivos, 33 de ellos en `changes/archive/`, LF en el índice y CRLF en disco.
- Las únicas menciones de `openspec` en las specs movidas están en las líneas 41 y 44 de project-rename, ambas cubiertas por AC-01.3. No hay enlaces relativos que el movimiento a archivos planos pueda romper. Esto hace compatibles AC-01.2 y AC-07.1.
- Las referencias que C-04 y T-02 nombran coinciden con el resultado de la búsqueda en el repositorio.
- Es acertado mover las specs en un commit propio antes de cambiar project-rename, y usar un PostgreSQL desechable en otro puerto.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `design-r1-answers.md`, one line per finding: `R1-03: fixed (design.md@2)` or `R1-03: rejected: <reason>`. A rejection is grounded in the requirements, a decision already made, or evidence.
- After a revision, the next round is a new file with the next round number.
- A disagreement that survives a revision, or rounds that stop converging, go to the human through the feature's decisions record.

### Source of Truth

- This file is the canonical record of what this round found and its verdict.
- The answers file records how each finding was resolved.
- The target and its sources are the artifacts reviewed; this file never repeats their content.
