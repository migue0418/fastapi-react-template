---
artifact: design
feature: F004
status: draft
version: 2
upstream: [brief.md@1, requirements.md@2]
---

# Design: Compose sin credenciales fijas de base de datos

> Describe cómo se construye la feature: los componentes e interfaces que añade o cambia, sus datos, las tecnologías, cómo cumple sus cualidades y maneja los fallos, y las tareas que la construyen.
> Una vez aprobado, es el enfoque contra el que se construye y revisa cada tarea. Cumple los requisitos aprobados; nunca los cambia.

---

## Conventions

Cada componente e interfaz se define con un encabezado que empieza por su ID (`### C-01: …`, `### IF-01: …`) y nombra en **Covers** los requisitos que sirve.

Los IDs de supuestos (`ASM`), preguntas abiertas (`OQ`) y riesgos (`RISK`) continúan la numeración del brief y de los requisitos (hasta ASM-05, OQ-01 y RISK-03).

---

## 1. Context

Punto de partida, tal como está hoy (código leído el 2026-11-02):

- `docker-compose.yml` tiene dos servicios, `postgres` (imagen `postgres:15`) y `backend`. La contraseña `postgres` está escrita dos veces: en `POSTGRES_PASSWORD` del servicio `postgres` y dentro de `DATABASE_URL` del servicio `backend`. El backend además carga `./backend/.env` con `env_file`; `environment` tiene prioridad sobre ese archivo. `postgres` publica `127.0.0.1:5432` y usa el volumen `postgres_data`.
- `.gitignore` ignora `backend/.env`, no un `.env` en la raíz. `.dockerignore` ya ignora `**/.env`.
- `backend/.example.env` trae `DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/…`. Compose lo consume de forma indirecta (a través de `backend/.env`).
- `backend/tests/test_api.py` resuelve la URL de administración en `_get_test_database_admin_url`, con el valor por defecto `postgres:postgres@127.0.0.1:5432` (`DEFAULT_TEST_DATABASE_ADMIN_URL`). Solo `temporary_database` (y, por ello, `build_client`) la usa. Los tests de `test_settings.py` y `test_rename_project.py` no usan la base de datos.
- `backend/app/core/settings.py` mantiene su URL por defecto `postgres:postgres`; queda fuera de alcance (OQ-01).
- El README documenta hoy el inicio rápido (Docker), los tests y la tabla de variables, todo con el valor por defecto.

Aplican: `architecture.md` 9.2 (los dos gaps que cierra la feature), NC-005 (tests sobre PostgreSQL real), NC-007 (secretos), NC-008 (sin dependencias nuevas), NC-009 (español), PR-002 (evidencia ejecutada), PR-003 (seguro por defecto) y ADR-0001 (solo como referencia de convenciones de Compose; no se toca).

Restricciones del brief: CON-01 a CON-04. La tecnología fijada, PostgreSQL 15, no cambia.

**Hecho comprobado para este diseño** (Docker Compose v5.4.0, Windows, 2026-11-02, y `findings-1.md`):

1. `${VAR:?mensaje}` rechaza «sin definir» y «vacía» al cargar el archivo, sin crear nada, con el mensaje propio.
2. Un uso de `${VAR}` sin `:?` además imprime una advertencia («Defaulting to a blank string»); por eso cada uso lleva `:?` con el mismo mensaje.
3. Un servicio previo `postgres-check` (`postgres:15`, `sh -c`), con `postgres` dependiendo de él con `service_completed_successfully`: con una contraseña corta, `docker compose up` termina con código 1, el servicio de comprobación queda `exited`, `postgres` queda `created` sin arrancar y el volumen existe vacío.
4. Tras corregir la contraseña en el `.env` de la raíz y repetir `docker compose up`, Compose recrea `postgres`, la comprobación pasa, PostgreSQL inicializa el volumen con la contraseña nueva y acepta conexiones con ella (AC-02.4).
5. Compose lee el `.env` de la raíz para interpolar; `env_file: ./backend/.env` no alimenta la interpolación.

---

## 2. Overview

La contraseña vive en un único sitio local y no versionado: un `.env` en la raíz del repositorio, con la variable `POSTGRES_PASSWORD` (IF-01). El mantenedor lo crea copiando `.example.env`, que trae la variable vacía.

Compose interpola `${POSTGRES_PASSWORD:?mensaje}` en tres sitios: la creación de la base, la URL de conexión del backend y la comprobación previa. Si la variable falta o está vacía, Compose no arranca nada (REQ-01). Si está definida, el servicio `postgres-check` comprueba la longitud y el valor y falla con un mensaje en español sin repetir la contraseña (REQ-02). `postgres` solo arranca cuando la comprobación termina bien, y el backend espera a `postgres` como hoy (REQ-03).

```
 .env (raíz, local, no versionado)
   POSTGRES_PASSWORD ──► interpolación de Compose  ── ausente/vacía ──► rechazo (REQ-01)
                              │
            ┌─────────────────┼───────────────────────┐
            ▼                 ▼                       ▼
     postgres-check       postgres                backend
     (sh, restart no)     POSTGRES_PASSWORD       DATABASE_URL = …://postgres:<pw>@postgres:5432/…
     <16 o "postgres"     depends_on: check OK    depends_on: postgres sano
      ──► exit 1          initdb con <pw>
```

Los tests (REQ-06) son independientes de Compose: `temporary_database` exige `TEST_DATABASE_ADMIN_URL` y falla con un error claro antes de abrir ninguna conexión. El README (REQ-07) cuenta el flujo completo.

---

## 3. Components

### C-01: Comprobación previa de la contraseña (`postgres-check`)

- **Responsibility:** Rechazar, antes de que arranque PostgreSQL, una contraseña de menos de 16 caracteres o igual a `postgres`, con un mensaje en español que no la repite.
- **Covers:** REQ-02, NFR-01, NFR-02
- **Status:** New
- **Owns:** Nada: no tiene estado ni volumen.
- **Depends on:** La variable `POSTGRES_PASSWORD` (IF-01), recibida por entorno; la imagen `postgres:15` que ya usa el stack (sin imagen nueva); `sh` de esa imagen.
- **On failure:** Sale con código 1 y escribe el mensaje en su salida de error. Con `restart: "no"` no se reinicia en bucle. `postgres` no arranca y `docker compose up` termina con error.

Decisiones de forma: servicio propio, no un cambio en el arranque de `postgres` (con `restart: unless-stopped` un fallo allí provocaría un bucle de reinicios); `entrypoint: ["sh", "-c"]` con el guion en línea en el propio YAML, sin archivo aparte, para que no dependa de finales de línea ni de permisos en Windows. La longitud se mide en caracteres con `printf %s "$POSTGRES_PASSWORD" | wc -m` (no con `${#VAR}`, que en `dash` cuenta bytes; comprobado, ver ASM-06) y la igualdad con `postgres` es exacta (ASM-04). Todo `$` del shell en el guion en línea se escribe `$$` en el YAML, porque Compose interpola cualquier `${...}` antes de pasar el texto al contenedor (un `${VAR#…}` sin escapar se rechaza como interpolación inválida, `findings-1.md`). El mensaje nombra `POSTGRES_PASSWORD`, indica el mínimo de 16 y el `.env` de la raíz, y propone cómo generar una. No imprime el valor.

### C-02: Servicios `postgres` y `backend` de Compose

- **Responsibility:** Tomar la contraseña de IF-01 en lugar de un valor fijo, y arrancar `postgres` solo tras C-01.
- **Covers:** REQ-01, REQ-03, REQ-04, REQ-05
- **Status:** Changed
- **Owns:** El volumen `postgres_data`, como hoy.
- **Depends on:** C-01, IF-01 y la interpolación de Compose.
- **On failure:** Contraseña ausente o vacía: Compose se niega al cargar el archivo y no crea nada (REQ-01). Volumen ya inicializado con otra contraseña: PostgreSQL conserva la antigua y el backend no conecta (ASM-03, RISK-01); lo resuelve el README (C-05).

`postgres.environment.POSTGRES_PASSWORD` y la contraseña dentro de `backend.environment.DATABASE_URL` pasan a `${POSTGRES_PASSWORD:?mensaje}` (mismo mensaje en cada uso, ver contexto 2). `postgres` añade `depends_on: postgres-check: condition: service_completed_successfully`. Usuario, base de datos, healthcheck, puertos y volumen no cambian. El `healthcheck` de `postgres` no usa la contraseña (`pg_isready`).

### C-03: Configuración local de ejemplo

- **Responsibility:** Indicar al mantenedor dónde y cómo definir la contraseña sin traer ninguna por defecto.
- **Covers:** REQ-04, REQ-05
- **Status:** New (`.example.env` en la raíz) y Changed (`backend/.example.env`, `.gitignore`)
- **Owns:** Nada.
- **Depends on:** IF-01.
- **On failure:** Copiado sin editar, la variable vacía hace que Compose se niegue como en AC-01.1 y el mensaje dice dónde ponerla (AC-05.2).

`.example.env` (raíz) contiene comentarios en español (qué es, dónde se copia, mínimos, un comando multiplataforma para generar una, p. ej. `python -c "import secrets; print(secrets.token_hex(24))"`) y `POSTGRES_PASSWORD=` vacío. `backend/.example.env` deja de traer contraseña en `DATABASE_URL` (`postgresql+asyncpg://postgres@127.0.0.1:5432/fastapi_template`, con un comentario que explica que Compose lo sobrescribe y que fuera de Compose hay que añadir la contraseña) y no repite `postgres:postgres`. `.gitignore` añade `/.env`; `.dockerignore` ya lo cubre.

### C-04: Resolución de la URL de administración de los tests

- **Responsibility:** Devolver `TEST_DATABASE_ADMIN_URL` o, si falta, detener los tests que usan la base de datos con un error en español, sin abrir ninguna conexión.
- **Covers:** REQ-06, NFR-01
- **Status:** Changed (`_get_test_database_admin_url` y `temporary_database` en `backend/tests/test_api.py`)
- **Owns:** Nada.
- **Depends on:** El entorno de la shell que lanza `pytest`.
- **On failure:** Sin variable (o vacía): lanza `RuntimeError` con el mensaje, antes de `asyncpg.connect`, de modo que cada test que usa la base falla con error, no se omite (ASM-05). Variable definida pero servidor inalcanzable: el mensaje actual de «PostgreSQL de tests no disponible», que no imprime la URL.

Se elimina `DEFAULT_TEST_DATABASE_ADMIN_URL`. Los tests que no usan la base (configuración, renombrado) no pasan por esta función y siguen ejecutándose (AC-06.4). El mensaje nombra `TEST_DATABASE_ADMIN_URL`, dice que debe apuntar a un PostgreSQL con permiso para crear y borrar bases, da un ejemplo con un marcador de posición que no es un valor real y remite al README.

Verificación (EP-004, test primero): los tests nuevos se escriben antes del cambio y no necesitan PostgreSQL. Con `monkeypatch.delenv` (y con la variable vacía) comprueban que `temporary_database` lanza el error con el texto en español y que `asyncpg.connect` no se llama nunca (AC-06.1, AC-06.2). Además, en T-02 se lanza la suite real sin la variable y se comprueba que los tests con base de datos fallan (no se omiten) y los demás pasan (AC-06.1, AC-06.4); y con la variable apuntando a un servidor válido, que la suite pasa como antes (AC-06.3). AC-06.2 se completa con un segundo servidor PostgreSQL en `127.0.0.1:5432` y la comprobación de que no recibe ninguna base nueva, si el puerto está libre en el entorno.

### C-05: README

- **Responsibility:** Describir el flujo nuevo para que baste por sí solo.
- **Covers:** REQ-07
- **Status:** Changed (`README.md`)
- **Owns:** Nada.
- **Depends on:** C-01 a C-04 ya construidos, para describir lo que hacen.
- **On failure:** No aplica.

Cambia: el inicio rápido (Docker), con el paso de crear el `.env` de la raíz y definir la contraseña, y, en ese mismo apartado, la nota de que `docker compose up -d` deja el mensaje de rechazo en `docker compose logs postgres-check`; «Desarrollo local» (sin Docker), con la nota de que `DATABASE_URL` del ejemplo no trae contraseña y hay que añadirla (el cambio de flujo aceptado en H-04, punto 3); un apartado sobre el volumen ya inicializado con las dos salidas (borrar el volumen con `docker compose down -v`, avisando de que **destruye los datos** de la aplicación, y empezar de cero; o cambiar la contraseña dentro de la base con `\password` interactivo de `psql` mediante `docker compose exec postgres psql -U postgres`, sin escribirla en la línea de comandos, y reiniciar el backend si hace falta, lo que AC-07.2 comprueba con una ejecución real); el apartado Tests, que sustituye el valor por defecto por la obligación de definir `TEST_DATABASE_ADMIN_URL` y explica cómo apuntarla a la base de Compose; y la fila de la tabla de variables. Indica que la contraseña conviene alfanumérica y ASCII (ver RISK-04).

---

## 4. Interfaces

### IF-01: La variable `POSTGRES_PASSWORD`

- **Kind:** File (archivo `.env` de la raíz) y Command (entorno de la shell)
- **Covers:** REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, NFR-01
- **Provided by:** El mantenedor, a través del `.env` de la raíz o del entorno de la shell; la lee la interpolación de Compose (C-02) y el servicio C-01.
- **Used by:** C-01, C-02.
- **Operations:**
  - *Definir:* una línea `POSTGRES_PASSWORD=<valor>` en el `.env` de la raíz, o la variable en la shell (Compose da prioridad a la shell).
  - *Rechazo por falta:* variable ausente o vacía → Compose termina con código distinto de 0 al cargar el archivo, sin crear nada, con el mensaje de C-02 (nombra la variable, dice dónde y cómo definirla).
  - *Rechazo por contenido:* menos de 16 caracteres o igual a `postgres` → C-01 sale con código 1; Compose muestra el mensaje y termina con código distinto de 0 (AC-02.1, AC-02.2).
- **Guarantees:** Un único origen para base y backend. Los mensajes no contienen el valor. Ninguna contraseña con valor en un archivo versionado.
- **Compatibility:** Cambio incompatible para quien ya despliegue con Compose: necesita crear el `.env` y, con un volumen ya inicializado, seguir el procedimiento del README. La propagación a derivados ya desplegados queda fuera de alcance (`product.md`, 7.2).

### IF-02: La variable `TEST_DATABASE_ADMIN_URL`

- **Kind:** Command (entorno de la shell que lanza `pytest`)
- **Covers:** REQ-06
- **Provided by:** El mantenedor o el entorno del agente.
- **Used by:** C-04.
- **Operations:** Definida y con valor → los tests de base de datos crean y borran sus bases temporales en ese servidor, como antes (AC-06.3). Ausente o vacía → C-04 lanza el error de la sección 3.
- **Guarantees:** Sin ella no se abre ninguna conexión (AC-06.2). No se lee de `backend/.env`, como hoy.
- **Compatibility:** Antes era opcional con valor por defecto; ahora es obligatoria para los tests con base de datos. Quien dependía del valor por defecto, incluido el entorno del agente, debe definirla (RISK-03).

---

## 5. Data

La feature no introduce ni cambia datos de la aplicación: ni tablas, ni migraciones. El único dato persistente que toca es el volumen `postgres_data`, que conserva la contraseña con la que PostgreSQL lo inicializó (ASM-03). El diseño no lo modifica: un rechazo deja el volumen vacío, sin inicializar (AC-02.1), y un volumen ya inicializado con otra contraseña se trata solo con el procedimiento del README (Q-02).

---

## 6. Technologies

- **Del stack:** Docker Compose (`docker-compose.yml`), PostgreSQL 15 (fija, sin cambios), Python/pytest y asyncpg para los tests.
- **Nuevas:** Ninguna. La comprobación reutiliza la imagen `postgres:15`. No hay dependencias nuevas (CON-04), y no se toca `stack.yaml`.
- **Skills** (`.sdd/skills.yaml`): `superpowers:test-driven-development` y `superpowers:systematic-debugging` en Build, en la tarea de los tests. Ninguna aplica a Design.

---

## 7. Qualities

- **NFR-01 (los mensajes no repiten la contraseña):** el mensaje de `:?` es texto fijo, el guion de C-01 no imprime la variable y el mensaje de C-04 solo se emite cuando no hay valor. Verificado por: ejecutar AC-01.2, AC-02.1, AC-02.2 y AC-06.1 con una cadena de prueba reconocible (por ejemplo `CANARIO-F004-xxxxxxxx`, que no es un secreto real) y buscarla en la salida completa del comando (`docker compose up` y `pytest`).
- **NFR-02 (mismo comportamiento en Windows y Linux):** la validación ocurre en Compose y en un contenedor Linux, no en la shell del anfitrión; el valor sale de un archivo `.env`, no de sintaxis de shell; el guion no está en un archivo con finales de línea sensibles. Verificado por: ejecutar los casos de SC-02 en PowerShell; en Linux, ejecutarlos si hay un entorno disponible y, si no, declararlo no verificado (PR-002).

---

## 8. Failure Modes

| Failure | How it is detected | What the system does | How it recovers |
|---|---|---|---|
| `POSTGRES_PASSWORD` ausente o vacía | Compose, al cargar el archivo | No crea nada; código distinto de 0; mensaje de C-02 | Definirla en el `.env` de la raíz |
| Contraseña corta o igual a `postgres` | C-01 (`exit 1`) | `postgres` queda creado sin arrancar; el volumen queda vacío; el backend no arranca; código distinto de 0 | Cambiar la contraseña y repetir `docker compose up`; sin borrar nada (AC-02.4, comprobado) |
| `docker compose up -d` con contraseña corta | El comando devuelve el error «didn't complete successfully» sin el mensaje | El mensaje queda en los logs de C-01 | `docker compose logs postgres-check` (lo dice el README, en el inicio rápido). T-01 prueba este caso y deja constancia en la evidencia |
| Volumen ya inicializado con otra contraseña | El backend no queda sano; PostgreSQL rechaza la autenticación | PostgreSQL conserva la contraseña antigua (ASM-03) | Las dos salidas del README: `down -v`, o `ALTER USER` |
| Contraseña con caracteres reservados de URL (`@`, `/`, `:`, `#`, `%`) o con `$` | El backend no conecta, o Compose interpola de más | Un stack no sano | Usar una contraseña alfanumérica (RISK-04) |
| Contraseña no ASCII | C-01 mide en caracteres (`wc -m`, ASM-06) | Se rechaza si tiene menos de 16 caracteres | Como cualquier rechazo. Caracteres no ASCII pueden fallar en la URL de conexión (RISK-04) |
| `TEST_DATABASE_ADMIN_URL` ausente o vacía | C-04, antes de conectar | Cada test con base de datos falla con error; los demás se ejecutan | Definirla (README) |
| `TEST_DATABASE_ADMIN_URL` apunta a un servidor inalcanzable | `asyncpg`/`OSError` | Mensaje existente «PostgreSQL de tests no disponible», sin la URL | Arrancar el servidor o corregir la URL |
| Entorno que depende del valor por defecto (agente, CI futuro) | Los tests con base de datos fallan | Mensaje de C-04 | Definir la variable en ese entorno (RISK-03) |

---

## 9. Decisions

- **ADRs:** Ninguno. Ninguna decisión del diseño es arquitectónicamente significativa: todas son reversibles y están dentro del stack y del alcance aprobados.
- **Human decisions:** H-05 (opción A: comprobación en Compose), que dio forma a C-01 y a requirements.md@2. Ningún otro punto es de sentido único.
- **Research:** Ninguna nota. Las incógnitas se resolvieron con pruebas ejecutadas (sección 1), registradas en `findings-1.md` y en el registro de decisiones.

### 9.1 Alternatives Considered

- **Dónde vive la contraseña:** `.env` en la raíz (elegido) frente a pasar `--env-file backend/.env`, que cambiaría el comando `docker compose up` que piden los requisitos (AC-01.1), y frente a mover la contraseña a `backend/.env` y leerla desde el backend, que obligaría a cambiar `settings.py` (fuera de alcance, OQ-01). `.env` en la raíz es lo que Compose lee sin opciones.
- **Dónde se comprueba la longitud:** servicio previo (elegido, H-05) frente a hacerlo en el arranque de `postgres` (bucle de reinicios por `restart: unless-stopped`) y frente a un script externo (se salta quien ejecute `docker compose up`, opción C de H-05, descartada por el mantenedor).
- **Imagen de la comprobación:** `postgres:15` (elegida, ya descargada y con `sh`) frente a `alpine` o `busybox` (imagen nueva que descargar y mantener).
- **Mensaje de `:?`:** el mismo texto en los tres usos (elegido) frente a un solo `:?` y `${POSTGRES_PASSWORD}` simple en los demás, que imprime una advertencia extra (comprobado).
- **Contraseña con caracteres reservados:** documentar (elegido) frente a rechazarlos en la comprobación o codificarlos en la URL. Rechazarlos sería una regla de composición, que el brief excluye (5.2); codificar exigiría una función que Compose no tiene.
- **Tests sin la variable:** error en `_get_test_database_admin_url` (elegido) frente a un fixture `autouse` de sesión que aborte la ejecución entera, que ocultaría los tests sin base de datos (ASM-05, H-04).
- **Pruebas de la parte de Compose:** ejecuciones reales de `docker compose` y búsqueda de texto en los archivos, registradas como evidencia (PR-002, EP-006), frente a un test en `pytest` que dependa de Docker o parsee YAML (dependencia nueva, y RM-05 es quien automatiza estas comprobaciones).

---

## 10. Assumptions, Open Questions, and Risks

Los supuestos ASM-01 a ASM-05, OQ-01 y RISK-01 a RISK-03 siguen como en `brief.md@1` y `requirements.md@2`. ASM-01 y ASM-02 se concretan aquí: la contraseña vive en el `.env` de la raíz (C-03) y el ejemplo la trae vacía.

### ASM-06: `wc -m` de la imagen `postgres:15` cuenta caracteres, y `${#VAR}` de su `sh` cuenta bytes

- **Basis:** Comprobado el 2026-11-02 con la imagen `postgres:15` (`LANG=en_US.utf8`): una contraseña de 15 caracteres `ñ` da 30 con `${#VAR}` y `wc -c`, y 15 con `wc -m`. Por eso C-01 mide con `wc -m`.
- **Impact if incorrect:** Si otra versión de la imagen cambiara la configuración regional, una contraseña no ASCII podría contarse en bytes. T-01 repite la comprobación con el guion final.
- **Status:** Confirmed (con la imagen actual; T-01 la repite con el guion final)

### RISK-04: Una contraseña con caracteres reservados deja el stack sin conectar

- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:** El README y el `.example.env` proponen un generador alfanumérico (`token_hex`), y el README avisa de que `@`, `/`, `:`, `#`, `%` y `$` no sirven. No se rechazan automáticamente: sería una regla de composición, excluida del alcance.

### RISK-05: Un rechazo deja un contenedor parado y un volumen vacío

- **Likelihood:** High (siempre que ocurre un rechazo por contenido)
- **Impact:** Low
- **Mitigation:** Ya aceptado en H-05 y reflejado en requirements.md@2: ni la comprobación ni el volumen vacío guardan ninguna contraseña, y AC-02.4 comprueba que se recupera sin borrar nada.

---

## 11. Task List

| Task | Delivers | Acceptance criteria | Technologies | Depends on |
|---|---|---|---|---|
| T-01 | Compose con la contraseña tomada del `.env` de la raíz, la comprobación previa C-01 y los archivos de ejemplo sin contraseña | AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-02.4, AC-03.1, AC-04.1, AC-05.1, AC-05.2 | Docker Compose, PostgreSQL 15 | None |
| T-02 | Tests que exigen `TEST_DATABASE_ADMIN_URL` y fallan con mensaje sin conectar | AC-06.1, AC-06.2, AC-06.3, AC-06.4 | Python, pytest, asyncpg | None |
| T-03 | README con el flujo nuevo, el volumen ya inicializado y los tests contra la base de Compose | AC-07.1, AC-07.2, AC-07.3 | Documentación, Docker Compose | T-01, T-02 |

NFR-01 se verifica dentro de T-01 (casos de Compose) y de T-02 (caso de los tests). NFR-02 se verifica en T-01.

---

## 12. Traceability and Coverage

- REQ-01: C-02, IF-01. REQ-02: C-01, IF-01. REQ-03: C-02. REQ-04: C-02, C-03, IF-01. REQ-05: C-02, C-03. REQ-06: C-04, IF-02. REQ-07: C-05. NFR-01: C-01, C-04, IF-01. NFR-02: C-01.
- Cada AC de REQ-01 a REQ-07 está en una tarea de la sección 11 (AC-01.1 a AC-05.2 en T-01, AC-06.x en T-02, AC-07.x en T-03).
- Cada NFR tiene su diseño y su verificación (sección 7).
- Ningún componente sin requisito: C-03 sirve a REQ-04 y REQ-05 como parte necesaria del único origen.
- Respeta CON-01 a CON-04, NC-005, NC-007, NC-008, NC-009 y PostgreSQL 15 (fija).
- Tamaño: dos resultados que el mantenedor aceptó juntos (H-02), en dos tareas independientes y una de documentación; no se propone volver a separar RM-09 (RISK-02).

- **Coverage gaps:** None
- **Unresolved dependencies:** OQ-01 (fuera de alcance, con valor por defecto). ASM-03 sin verificar: se comprueba en T-03 (AC-07.2). ASM-06 comprobado, y T-01 lo repite con el guion final.

---

## 13. Maintenance Guidelines

Este documento DEBE mantenerse alineado con los requisitos aprobados y con cómo se construye la feature.

Sube `version` con cada cambio posterior a la primera revisión o aprobación, y mantén `upstream` apuntando a las versiones del brief y de los requisitos. Un cambio del enfoque aprobado vuelve al mantenedor.

### Source of Truth

- Este documento es la referencia de cómo se construye la feature.
- Los requisitos definen qué debe hacer; el diseño los cumple y nunca los cambia.
- El plan define cada tarea en detalle; la lista de tareas de aquí es su resumen aprobado.
