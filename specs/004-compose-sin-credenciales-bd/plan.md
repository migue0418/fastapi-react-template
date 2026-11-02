---
artifact: plan
feature: F004
status: checked
version: 1
upstream: [design.md@2, requirements.md@2]
---

# Plan: Compose sin credenciales fijas de base de datos

> Describe cómo abordar cada tarea de la lista del diseño: qué entrega, de qué depende, las tecnologías, skills y archivos que implica, cómo se comprueba y sus riesgos.
> Es el diseño aprobado hecho concreto. No contiene código. El diseño es la referencia; este plan nunca lo cambia.

---

## Conventions

Cada tarea se define con un encabezado que empieza por su ID: `### T-01: …`. Las tareas y sus IDs coinciden con la lista de `design.md@2`, sección 11.

---

## 1. Tasks

### T-01: Compose con la contraseña del `.env` de la raíz y la comprobación previa

- **Delivers:** AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-02.4, AC-03.1, AC-04.1, AC-05.1, AC-05.2; NFR-01 (casos de Compose) y NFR-02
- **Implements:** C-01, C-02, C-03, IF-01
- **Depends on:** None
- **Stack:** Docker Compose, PostgreSQL 15 (imagen `postgres:15`, sin imagen nueva)
- **Skills:** None
- **Files:** `docker-compose.yml`, `.example.env` (nuevo, raíz), `backend/.example.env`, `.gitignore`

**Approach:**

1. Añadir el servicio `postgres-check` (C-01): imagen `postgres:15`, `entrypoint: ["sh", "-c"]`, guion en línea, `restart: "no"`, la contraseña recibida por `environment` con `${POSTGRES_PASSWORD:?mensaje}`. El guion sale con código 1 y un mensaje en español, por la salida de error, si la longitud en caracteres (`printf %s "$VAR" | wc -m`) es menor que 16 o si el valor es exactamente `postgres`. El mensaje nombra `POSTGRES_PASSWORD`, indica el mínimo de 16 y el `.env` de la raíz, propone el generador (`python -c "import secrets; print(secrets.token_hex(24))"`) y no imprime el valor. Todo `$` del shell va escrito `$$` en el YAML.
2. En `postgres`: `POSTGRES_PASSWORD` pasa a `${POSTGRES_PASSWORD:?mensaje}` y se añade `depends_on: postgres-check` con `condition: service_completed_successfully`. El resto (usuario, base, healthcheck, puerto `127.0.0.1:5432`, volumen, `restart: unless-stopped`) no cambia.
3. En `backend`: la contraseña dentro de `DATABASE_URL` pasa a `${POSTGRES_PASSWORD:?mensaje}`. El mensaje es idéntico en los tres usos.
4. Crear `.example.env` en la raíz: comentarios en español (qué es, que se copia a `.env` en la raíz, mínimos, que conviene alfanumérica y ASCII, el generador) y `POSTGRES_PASSWORD=` vacía.
5. En `backend/.example.env`: `DATABASE_URL` sin contraseña (`postgresql+asyncpg://postgres@127.0.0.1:5432/fastapi_template`) con un comentario que dice que Compose la sobrescribe y que fuera de Compose hay que añadirla. Sin `postgres:postgres` en ningún lado.
6. `.gitignore`: añadir `/.env`.

**How it is checked:** ejecuciones reales de Compose, con `-p f004-verify` para no tocar el volumen `postgres_data` del mantenedor, y `docker compose -p f004-verify down -v` al terminar. Antes de empezar se captura qué existe (`docker volume ls`, `docker ps -a`) y al terminar se restaura ese estado (PR-002, NC-006). El puerto `127.0.0.1:5432` debe estar libre para AC-03.1: si lo ocupa otro proyecto, no se detiene el otro; se avisa al mantenedor y se declara AC-03.1 como no verificado hasta que lo libere.

- AC-01.1, AC-01.2: `docker compose up` sin `.env` y sin variable, y con `POSTGRES_PASSWORD=` vacía. Código distinto de 0; `docker ps -a` y `docker volume ls` sin contenedores ni volumen del proyecto; mensaje en español que nombra la variable.
- AC-02.1, AC-02.2: con 15 caracteres y con `postgres`. Código distinto de 0; ni `postgres` ni `backend` llegan a arrancar (`postgres` en `Created`); el volumen existe y está vacío (comprobar que no contiene `PG_VERSION`); mensaje con el mínimo de 16. Ejecutar sin `-d`, y también con `-d`, dejando constancia en la evidencia de que con `-d` el mensaje está en `docker compose logs postgres-check`.
- AC-02.3: con exactamente 16 caracteres y volumen nuevo, el stack arranca como en AC-03.1.
- AC-02.4: tras un rechazo, cambiar a una contraseña de 16 o más caracteres y ejecutar `docker compose up --build` sin borrar nada: el stack arranca.
- AC-03.1, AC-04.1: contraseña válida definida solo en el `.env` de la raíz, volumen nuevo, `docker compose up --build`. Backend sano; `GET http://localhost:8000/health` responde 200 con `{"status": "ok"}`; `psql` o `pg_isready` desde `127.0.0.1:5432` acepta la contraseña y rechaza `postgres`.
- AC-05.1: búsqueda de texto: `grep -rn "postgres:postgres"` y de cualquier contraseña con valor en `docker-compose.yml`, `.example.env` y `backend/.example.env`; resultado vacío.
- AC-05.2: copiar `.example.env` a `.env` sin editar y `docker compose up`: rechazo como en AC-01.1 y el mensaje dice dónde poner la contraseña.
- NFR-01: repetir AC-01.2, AC-02.1, AC-02.2 con la cadena `CANARIO-F004-xxxxxxxx` (que no es un secreto real) y buscarla con `grep` en la salida completa y en los logs de `postgres-check`: 0 apariciones.
- NFR-02 y ASM-06: ejecutar desde PowerShell y repetir con una contraseña no ASCII de 15 caracteres (debe rechazarse) para confirmar el conteo en caracteres con el guion final. Linux: ejecutarlos si hay entorno; si no, declararlo no verificado.

**Technical requirements:** no imprimir ni versionar ninguna contraseña real (NC-007): las de prueba son aleatorias, del `.env` local (ignorado) o de la shell, y se destruyen con el proyecto de prueba. Mensajes en español (NC-009). No cambiar usuario ni nombre de la base (brief, 5.2). Sin imagen ni dependencia nuevas.

**Risks:** el `:?` con mensajes con caracteres especiales dentro del YAML (comillas, `:`) puede romper el archivo: probar `docker compose config -q` con un valor de prueba. `docker compose config` imprime la contraseña interpolada: no usarlo con una real ni pegar su salida en la evidencia. Puerto 5432 ocupado por otro proyecto (ver arriba).

### T-02: Los tests exigen `TEST_DATABASE_ADMIN_URL`

- **Delivers:** AC-06.1, AC-06.2, AC-06.3, AC-06.4; NFR-01 (caso de los tests)
- **Implements:** C-04, IF-02
- **Depends on:** None
- **Stack:** Python, pytest, asyncpg, PostgreSQL 15 (NC-005)
- **Skills:** `superpowers:test-driven-development`, `superpowers:systematic-debugging` (si un test falla)
- **Files:** `backend/tests/test_api.py`

**Approach:**

1. Test primero (EP-004), sin PostgreSQL: en `test_api.py`, con `monkeypatch.delenv("TEST_DATABASE_ADMIN_URL", raising=False)` y con la variable vacía, comprobar que `temporary_database` lanza `RuntimeError` con un mensaje que contiene `TEST_DATABASE_ADMIN_URL`, y que `asyncpg.connect` (sustituido por una función que hace fallar el test si se llama) no se invoca. Verlos fallar contra el código actual.
2. Cambiar `_get_test_database_admin_url`: devolver la variable, y si falta o está vacía lanzar `RuntimeError` con un mensaje en español que nombra `TEST_DATABASE_ADMIN_URL`, dice que debe apuntar a un PostgreSQL con permiso para crear y borrar bases, da un ejemplo con marcador de posición (no un valor real) y remite al README. Eliminar `DEFAULT_TEST_DATABASE_ADMIN_URL`. Mantener intacto el mensaje de «PostgreSQL de tests no disponible».
3. Que el error se lance antes de abrir ninguna conexión: en `temporary_database`, la URL se resuelve antes del `try` que llama a `_create_test_database` (ya es así) y fuera de él, para que el `RuntimeError` no se capture ni se reenvuelva.

**How it is checked:**

- AC-06.1, AC-06.2: los tests nuevos del punto 1. Además, lanzar la suite real sin la variable y comprobar que cada test que usa la base de datos termina en error, no omitido, con el mensaje (`pytest -q` y el resumen). AC-06.2, si el puerto 5432 está libre, con un segundo PostgreSQL desechable en `127.0.0.1:5432` con `postgres:postgres`: tras la ejecución sin variable no hay ninguna base nueva en él (`\l`) y su log no registra conexiones. Si el puerto está ocupado por otro proyecto, no se toca; se declara esa parte no verificada y queda el test automatizado.
- AC-06.3: con `TEST_DATABASE_ADMIN_URL` apuntando a un servidor PostgreSQL válido y desechable, `cd backend && uv run pytest -q` pasa con los mismos resultados que antes del cambio (anotar el recuento antes y después).
- AC-06.4: sin la variable, los tests de `test_settings.py` y `test_rename_project.py` se ejecutan y pasan.
- NFR-01: lanzar sin la variable y con una variable de prueba reconocible (`CANARIO-F004-xxxxxxxx`) en otra variable no relacionada, y buscar la cadena en la salida; en el caso de AC-06.1 no hay valor que imprimir. Capturar el estado de la base de datos antes y restaurarlo (NC-006): las bases temporales de los tests se borran al terminar, comprobar que no queda ninguna `fastapi_template_test_*`.

**Technical requirements:** los tests siguen contra PostgreSQL real (NC-005); no se añaden dependencias; mensajes en español (NC-009); no se leen variables desde código de dominio (el cambio es solo de tests).

**Risks:** el entorno del agente ya no tiene valor por defecto: para lanzar la suite hay que definir la variable, apuntando a un servidor desechable (RISK-03). No apuntar nunca a `gestorbibliografico` ni a otro servidor ajeno.

### T-03: README con el flujo nuevo

- **Delivers:** AC-07.1, AC-07.2, AC-07.3
- **Implements:** C-05
- **Depends on:** T-01, T-02
- **Stack:** Documentación (README), Docker Compose
- **Skills:** None
- **Files:** `README.md`

**Approach:** editar solo las partes que cambia C-05, en español y manteniendo el estilo del README:

1. Inicio rápido (Docker): paso de copiar `.example.env` a `.env` en la raíz y definir `POSTGRES_PASSWORD` (mínimo de 16 caracteres, alfanumérica y ASCII, con el generador), antes de `docker compose up --build`; en ese mismo apartado, la nota de que con `-d` el mensaje de rechazo está en `docker compose logs postgres-check`.
2. «Desarrollo local» (sin Docker): nota de que `DATABASE_URL` del ejemplo no trae contraseña y hay que añadirla.
3. Apartado nuevo sobre un volumen ya inicializado con otra contraseña (la imagen aplica la contraseña solo al crear el volumen, ASM-03), con las dos salidas: `docker compose down -v` (avisando de que destruye los datos de la aplicación) y empezar de cero; o cambiar la contraseña dentro de la base con `\password` interactivo de `psql` mediante `docker compose exec postgres psql -U postgres`, sin escribirla en la línea de comandos, y reiniciar el backend si hace falta.
4. Tests: quitar el valor por defecto, decir que `TEST_DATABASE_ADMIN_URL` es obligatoria, y explicar cómo apuntarla a la base de Compose (PowerShell y shell de Linux; `docker compose up -d postgres` y la URL con la contraseña definida). Actualizar la fila de la tabla de variables.
5. No tocar `docs/` ni `.sdd/`: es trabajo de Document (`decisions.md`, sección 4).

**How it is checked:** siguiendo solo el README, desde un proyecto Compose nuevo (`-p`, sin volumen):

- AC-07.1: el inicio rápido llega a `GET /health` con 200.
- AC-07.2: crear un volumen con una contraseña, definir otra válida y seguir por separado cada salida; en ambas, el stack queda sano con la contraseña nueva y `/health` responde 200. Esto verifica ASM-03 (el volumen conserva la antigua) y si hace falta reiniciar el backend.
- AC-07.3: con el stack en marcha, definir `TEST_DATABASE_ADMIN_URL` según el README y lanzar `uv run pytest -q`: la suite pasa como en AC-06.3.
- Las contraseñas de prueba son aleatorias y no se escriben en la evidencia. Al terminar, `down -v` del proyecto de prueba y restaurar el estado capturado.

**Technical requirements:** el README no contiene ninguna contraseña con valor ni `postgres:postgres` como valor de Compose; los ejemplos usan marcadores de posición claros.

**Risks:** que el README describa algo distinto de lo construido: se redacta tras T-01 y T-02 y se sigue paso a paso. El puerto 5432 ocupado impide AC-07.3 y AC-07.1: se avisa al mantenedor, sin detener el otro servidor.

---

## 2. Order

| Group | Tasks | Waits for |
|---|---|---|
| 1 | T-01, T-02 | None |
| 2 | T-03 | Group 1 |

T-01 y T-02 pueden construirse en paralelo: no comparten archivos. Si ambas necesitan el puerto 5432 a la vez, se ejecutan sus comprobaciones en serie.

---

## 3. Consistency Check

- Las tareas coinciden con la lista de `design.md@2`: T-01, T-02 y T-03, con los mismos IDs y dependencias.
- Cada criterio de aceptación lo entrega una tarea: AC-01.1, AC-01.2, AC-02.1 a AC-02.4, AC-03.1, AC-04.1, AC-05.1 y AC-05.2 en T-01; AC-06.1 a AC-06.4 en T-02; AC-07.1 a AC-07.3 en T-03. Los 17 ID de AC de `requirements.md@2` están cubiertos.
- Cada tarea nombra lo que entrega, su stack y sus archivos, e implementa componentes e interfaces del diseño (C-01 a C-05, IF-01, IF-02).
- Las dependencias no tienen ciclos (T-03 depende de T-01 y T-02).
- T-01 y T-02 no cambian los mismos archivos; T-03 solo toca `README.md`.

- **Consistency:** Clean
- **Issues:** None

---

## 4. Maintenance Guidelines

Este documento DEBE mantenerse alineado con el diseño aprobado y con los requisitos.

Sube `version` con cada cambio, y mantén `upstream` apuntando a las versiones del diseño y de los requisitos. Cuando cualquiera cambie, revisa este plan: confírmalo actualizando `upstream`, o revísalo.

El plan no tiene aprobación propia: su estado pasa a `checked` al superar la comprobación de consistencia.

### Source of Truth

- Este documento es la referencia de cómo se aborda cada tarea.
- El diseño define el enfoque y la lista de tareas; este plan la detalla y nunca la cambia.
- Los requisitos definen los criterios de aceptación que entrega cada tarea.
- El registro de estado de la feature sigue el estado de cada tarea durante Build.
