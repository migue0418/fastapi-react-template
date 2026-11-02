---
artifact: review
feature: F004
kind: design
target: design.md@1
sources: [brief.md@1, requirements.md@2, decisions.md, reviews/findings-1.md, .sdd/constitution.md, .sdd/stack.yaml, .sdd/architecture.md, .sdd/roadmap.md, docs/adr/ADR-0001-confianza-en-cabeceras-de-proxy-delegada-en-uvicorn.md]
round: 1
verdict: approve
---

# Review: design.md@1, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.
> The review judges the work, never its author's explanation of it, and never edits what it reviews.
> A review file is never changed once written. The answers to its findings go in a separate answers file, and the next round is a new review file.

---

## 2. Findings

### R1-01: La expresión de longitud `${#POSTGRES_PASSWORD}` no está escapada para la interpolación de Compose

- **Severity:** Minor
- **Where:** design.md#C-01 (párrafo «Decisiones de forma»)
- **What is wrong:** C-01 dice que la longitud se mide con `${#POSTGRES_PASSWORD}` en un guion en línea dentro del YAML. Compose interpola todo `${...}` del YAML antes de pasar el texto al contenedor. Si no se escribe `$${#POSTGRES_PASSWORD}`, Compose intenta interpretarlo y falla, o el guion mide otra cosa. El diseño no menciona el escape, y es la parte más frágil del servicio de comprobación.
- **Evidence:** `findings-1.md#R1-01` (evidencia): las formas `${PW#patrón}` y `${PW/#patrón/x}` «se rechazan como formato de interpolación inválido». El diseño, sección 1, hecho 3, dice que la comprobación se probó, pero no registra el texto del guion probado.
- **Recommended fix:** Que el diseño o el plan indiquen que en el guion en línea todo `$` del shell se escribe `$$`, y que T-01 ejecute el rechazo de 15 caracteres y la aceptación de 16 con el guion final.

### R1-02: Una contraseña no ASCII de menos de 16 caracteres pasa la comprobación, en contra de REQ-02

- **Severity:** Minor
- **Where:** design.md#C-01, design.md#8 (fila «Contraseña no ASCII»), design.md#ASM-06
- **What is wrong:** REQ-02 exige rechazar menos de 16 caracteres. El diseño admite que `sh` cuenta bytes, así que 8 caracteres de dos bytes serían aceptados. Lo trata como supuesto sin verificar (ASM-06) y lo resuelve con una nota de «usar ASCII» en el README. Es una desviación consciente y registrada, no silenciosa, pero cambia el comportamiento aprobado sin pasar por el mantenedor.
- **Evidence:** requirements.md#REQ-02 («menos de 16 caracteres») frente a design.md#8: «podría aceptar una de menos de 16 caracteres».
- **Recommended fix:** Verificarlo en T-01 con una contraseña no ASCII y, si se confirma, ponerlo al mantenedor como limitación aceptada (o rechazar los bytes no ASCII, que es más sencillo que medir caracteres). Un diseño no puede rebajar un requisito aprobado por su cuenta.

### R1-03: Que el mensaje de rechazo se vea depende de ejecutar `docker compose up` sin `-d`, y eso solo consta en decisions.md

- **Severity:** Minor
- **Where:** design.md#8 (fila `docker compose up -d`), design.md#C-05; requirements.md#AC-02.1
- **What is wrong:** AC-02.1 y AC-02.2 piden que el mensaje, en español, nombre la variable e indique el mínimo. Con `-d` no se muestra: el comando solo informa de que la dependencia falló, y el mensaje queda en los logs de `postgres-check`. La suposición «sin `-d`» está en `decisions.md` (Decided Along the Way, 2026-11-02), no en los requisitos. Un despliegue en producción suele usar `-d`, que es justo el caso que motiva la feature.
- **Evidence:** design.md#8: «El comando devuelve el error "didn't complete successfully" sin el mensaje». decisions.md, fila de H-06: «los criterios se comprueban con `docker compose up` sin `-d`».
- **Recommended fix:** Mantener la nota en el README, pero que el plan de T-01 pruebe también el caso con `-d` y deje constancia en la evidencia de que el mensaje solo está en los logs. El README debe decirlo cerca del inicio rápido, no solo en un apartado aparte.

### R1-04: El diseño no dice cómo se prueban AC-06.1 y AC-06.2 ni cómo se hace test primero en T-02

- **Severity:** Minor
- **Where:** design.md#C-04, design.md#9.1 (última alternativa), design.md#11 (T-02)
- **What is wrong:** Para la parte de Compose, el diseño explica cómo se verifica (ejecuciones reales y búsqueda de texto). Para REQ-06 no. AC-06.2 exige no abrir ninguna conexión con otro servidor escuchando en 5432, y AC-06.1 exige error y no omisión. Falta indicar si el test de `_get_test_database_admin_url` se escribe sin base de datos (por ejemplo, con `monkeypatch.delenv` y comprobando que `asyncpg.connect` no se llama) y si además se ejecuta la suite real sin la variable. EP-004 (test primero, SHOULD) aplica a un cambio de comportamiento en backend.
- **Evidence:** design.md#9.1 solo justifica las pruebas de la parte de Compose. constitution.md#EP-004: «Cambios de comportamiento en backend y frontend».
- **Recommended fix:** Añadir una línea en C-04 o en la tarea T-02 con el método de verificación de AC-06.1 a AC-06.4, incluido el caso de que el test de la protección no necesite PostgreSQL.

### R1-05: Los procedimientos del README para un volumen ya inicializado no cuidan la contraseña ni los datos

- **Severity:** Minor
- **Where:** design.md#C-05
- **What is wrong:** C-05 propone `ALTER USER` mediante `docker compose exec postgres psql`, que pone la contraseña en la línea de comandos y en el historial del terminal. Eso va contra el espíritu de CON-01 y NFR-01. Propone también `docker compose down -v`, que borra los datos de la aplicación del volumen; en un despliegue real no es neutro. Tampoco dice si hace falta reiniciar el backend tras cambiar la contraseña.
- **Evidence:** brief.md#CON-01 (la contraseña no se imprime ni se versiona) y requirements.md#NFR-01 (rationale: «queda en el historial del terminal»); design.md#C-05.
- **Recommended fix:** Que el README use `\password` interactivo de `psql`, o variables de entorno en lugar de la línea de comandos, y avise de que `down -v` destruye los datos. AC-07.2 (ejecución real de los dos procedimientos) ya cubre comprobar el reinicio del backend.

### R1-06: La sección «Desarrollo local» del README no está en el alcance de C-05

- **Severity:** Minor
- **Where:** design.md#C-05, design.md#C-03
- **What is wrong:** `docker-compose.yml` comenta que el desarrollo usa `127.0.0.1:5432`. Con `backend/.example.env` sin contraseña en `DATABASE_URL`, quien siga «Desarrollo local» tal cual (copiar el ejemplo y lanzar `uvicorn`) no conectará. C-03 lo cubre con un comentario en el ejemplo, pero C-05 no incluye esa sección entre las que cambian. H-04 punto 3 ya aceptó el cambio del flujo, pero no quién lo documenta.
- **Evidence:** README.md, secciones «Desarrollo local» y «Inicio rápido»; design.md#C-05 (lista de lo que cambia); decisions.md#H-04 punto 3.
- **Recommended fix:** Incluir en C-05 una nota en «Desarrollo local» sobre añadir la contraseña de `POSTGRES_PASSWORD` a `DATABASE_URL`. Es una nota, no alcance nuevo.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 6 (R1-01 a R1-06)
- **Converging:** Yes (primera ronda)
- **Limits of this review:** No se ejecutó Docker ni Compose: los hechos del diseño (sección 1, hechos 1 a 5) se contrastan solo con `findings-1.md` y con el código y los archivos leídos, no se repitieron. No se verificó el comportamiento de `dash` con bytes no ASCII (ASM-06), ni que el backend quede sin arrancar con una comprobación fallida. No se revisó Linux. Revisión independiente: el revisor no participó en la producción del diseño y solo usó los archivos.

### 3.1 What Should Be Kept

- La cobertura completa: cada REQ, AC y NFR está en un componente y en una tarea, y `upstream` apunta a `brief.md@1` y `requirements.md@2`.
- El servicio previo con `restart: "no"`, que evita el bucle de reinicios de `postgres`, y la reutilización de `postgres:15`, sin dependencias nuevas (CON-04).
- El mismo `:?` con el mismo mensaje en los tres usos de la variable, que evita la advertencia de Compose, y el `.env` de la raíz como único origen. `.dockerignore` ya lo excluye (`**/.env`).
- `_get_test_database_admin_url` falla antes de `asyncpg.connect`: se contrastó con `backend/tests/test_api.py` (líneas 33 a 101), donde solo `temporary_database` usa esa URL, y los tests de `test_settings.py` y `test_rename_project.py` no la tocan.
- Los modos de fallo honestos (`-d`, no ASCII, caracteres reservados) y las alternativas descartadas con su motivo.

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
