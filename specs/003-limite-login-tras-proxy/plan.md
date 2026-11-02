---
artifact: plan
feature: F003
status: checked
version: 1
upstream: [design.md@3, requirements.md@1]
---

# Plan: El límite de login se aplica por cliente real tras un proxy

> Cómo abordar cada tarea de la lista del diseño. No contiene código. Cada tarea se construye en `task/003-T-nn`, creada desde `feature/003-limite-login-tras-proxy` (EP-001), y sus commits indican `F003 T-nn` (EP-002).

---

## Conventions

Las tareas y sus IDs coinciden con la lista de tareas de `design.md`.

---

## 1. Tasks

### T-01: Variable visible en la configuración de ejemplo

- **Delivers:** AC-04.1
- **Implements:** C-03, IF-01
- **Depends on:** None
- **Stack:** validation-and-settings (`Settings` ignora variables desconocidas, `extra="ignore"`)
- **Skills:** None
- **Files:** `backend/.example.env`
- **Fixes:** n/a

**Approach:** Añadir al final de `backend/.example.env` un bloque con la variable `FORWARDED_ALLOW_IPS`, comentada, siguiendo el estilo del archivo (comentario en español encima de la variable). El valor de ejemplo es una sola IP del rango de documentación (`203.0.113.10`), nunca `*` ni un rango amplio. El comentario dice: cuándo definirla (solo si hay un proxy delante), que se sustituya por la dirección desde la que el proxy se conecta al backend, que sin ella la app no confía en ningún proxy de la red (cupo compartido tras un proxy), que `*` y las redes amplias permiten falsificar la IP, y que el valor se lee de `backend/.env` por el servicio `backend` de Compose.

**How it is checked:** Inspección del archivo contra AC-04.1 (variable presente, comentada, valor que no es `*`, nota en español). Cargar el archivo con la variable descomentada con `dotenv_values` (ya instalado con pydantic-settings) y comprobar que la lee. `git diff` muestra solo ese archivo.

**Technical requirements:** Español en los comentarios (NC-009). Sin secretos. Sin tocar `Settings`, `docker-compose.yml` ni `Dockerfile`.

**Risks:** Un valor de ejemplo copiado sin adaptar no confía en ningún proxy real, no abre nada. Mantener el valor estrecho.

### T-02: Comprobación ejecutada contra la aplicación real

- **Delivers:** AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2 (y NFR-01; aporta los 429 de NFR-02)
- **Implements:** C-05, usando C-01, C-02 e IF-01
- **Depends on:** None
- **Stack:** packaging-and-deployment, rate-limiting, backend-framework
- **Skills:** `superpowers:systematic-debugging` solo si un resultado no es el esperado
- **Files:** `specs/003-limite-login-tras-proxy/evidence/t02-comprobacion-proxy.md`
- **Fixes:** n/a

**Approach:** Todo fuera del repo salvo el registro. Orden:

1. Directorio temporal en el scratchpad con una copia de `docker-compose.yml` (contexto de build con la ruta absoluta del repo, `ports` como `127.0.0.1:18000:8000` y `env_file` apuntando a un `.env` temporal copiado de `backend/.example.env`, sin secretos reales). Proyecto Compose `f003check`, para no tocar los contenedores, el volumen ni `backend/.env` del mantenedor.
2. `docker compose up --build -d`; esperar al healthcheck. Leer con `docker network inspect f003check_default` la IP de la puerta de enlace (la que el contenedor ve para las conexiones del host) y anotarla junto con la versión de Docker.
3. Escenarios; entre uno y otro, `up -d --force-recreate backend` con el `.env` temporal cambiado, para reiniciar los contadores (en memoria). Cada escenario cabe en menos de un minuto. Los intentos usan credenciales inválidas, de modo que la respuesta normal es 401 y no se crean sesiones.
   - **S1, sin variable** (AC-01.1, AC-01.2, AC-03.2): 11 `POST /api/auth/login` desde el host con `X-Forwarded-For` distinto en cada uno: del 1 al 10 devuelven 401 y el 11 devuelve 429. Después, tras recrear, 11 intentos sin cabecera: igual resultado.
   - **S2, variable = IP de la puerta de enlace** (AC-02.1, AC-02.2, AC-03.1 en parte): A (`203.0.113.10`) agota login (429 en el 11) y B (`203.0.113.20`) hace después un intento y recibe 401, no 429. Repetir la agotación de A en `token` (429 en el 11) y `refresh` (429 en el 21), cada intento con una conexión nueva.
   - **S3, conexión no confiada** (AC-02.3): con la variable igual a la IP sola de la puerta de enlace, un segundo contenedor de la red `f003check_default` (la imagen ya construida del backend, con su Python; sin descargas ni dependencias nuevas) envía 11 logins con `X-Forwarded-For` distinto; el 11 devuelve 429. Si no se puede montar, declarar AC-02.3 no verificado.
   - **S4, variable como red** (AC-03.1, ASM-06): definir solo la variable con la red más pequeña que incluye la puerta de enlace y excluye al segundo contenedor, y repetir la comprobación de B no limitado. Si ninguna red cumple las dos condiciones, declarar el uso de CIDR no verificado.
   - **S5, `*`** (README): con `*`, 11 intentos desde el host con `X-Forwarded-For` distinto no se limitan (todos 401); con el mismo valor, el segundo contenedor tampoco.
4. Registrar en `evidence/t02-comprobacion-proxy.md`: entorno (Docker, IP de la puerta de enlace, IP del segundo contenedor), el comando de cada escenario, la secuencia de estados observada y el veredicto por AC; lo no ejecutado, como no verificado. Resultado por AC-02.1 y AC-01.1 explícito para NFR-01, y los 429 del 11 en login y token y del 21 en refresh para NFR-02.
5. `docker compose -p f003check down -v`, borrar el directorio temporal y comprobar con `docker ps -a` y `docker volume ls` que no queda nada del proyecto.

Si un resultado difiere del esperado (por ejemplo, S1 con cupo compartido o S2 con B limitado), no se corrige a mano: se registra y se informa para decidir si cambia el diseño (OQ-01 y sección 8 del diseño).

**How it is checked:** El propio registro, que Verify repite. Además, `git diff main -- backend/app/core/limiter.py backend/app/features/auth/router.py` vacío (NFR-02) y limpieza del proyecto Compose temporal.

**Technical requirements:** Puerto de host libre y distinto del 8000. No imprimir ni guardar secretos; las credenciales de los intentos son inventadas. La base de datos del mantenedor no se toca (NC-006). Ninguna dependencia nueva (NC-008).

**Risks:** Docker Desktop puede presentar las conexiones del host con otra IP (ASM-05): se lee antes de fijar la lista. Una ventana de un minuto que se solape entre intentos: recrear el servicio y ejecutar cada escenario seguido. Un puerto 18000 ocupado: elegir otro.

### T-03: README alineado con lo observado

- **Delivers:** AC-04.2
- **Implements:** C-04
- **Depends on:** T-02
- **Stack:** Ninguna
- **Skills:** None
- **Files:** `README.md` (solo la sección "Despliegue detrás de un proxy")
- **Fixes:** n/a

**Approach:** Releer el registro de T-02 y la sección actual, y corregir solo lo que no coincida o falte:

- Que sin la variable todos los clientes tras un proxy comparten cupo, y que con la variable (IP o red del proxy, lista separada por comas) cada cliente tiene el suyo; nombrar `backend/.env` y que Compose la pasa al contenedor.
- Que el valor debe ser el más estrecho posible, con la IP o red desde la que se conecta el proxy.
- Que con `*`, y con redes amplias que incluyan clientes u otros contenedores, un cliente puede falsificar su IP con `X-Forwarded-For` aunque el puerto 8000 esté cerrado; y que con una lista concreta uvicorn toma la primera IP no confiada desde la derecha.
- Que un valor mal escrito no confía en nadie y no avisa.
- Que, fuera de Compose, uvicorn confía por defecto en `127.0.0.1` (H-04).

Mantener los enlaces y el resto de viñetas (TLS y cookies, un solo camino de entrada, rate limit en memoria) tal como están, salvo lo que contradiga lo observado. Sin cambiar otras secciones; las de `.sdd/` y el ADR las actualiza Document.

**How it is checked:** Comparar cada afirmación de la sección con las líneas de resultado de S1 a S5 del registro de T-02 (AC-01.1, AC-02.1, AC-02.3), anotando la correspondencia en la descripción de la tarea. `git diff` solo en esa sección.

**Technical requirements:** Español (NC-009). Mantener el ancla `#despliegue-detrás-de-un-proxy`, que enlazan otros documentos. Sin afirmaciones que el registro no respalde; lo no verificado se escribe como tal.

**Risks:** Redactar desde `uvicorn` o desde la memoria y no desde el registro. Si T-02 dejó algo no verificado, el README no puede darlo por hecho.

---

## 2. Order

| Group | Tasks | Waits for |
|---|---|---|
| 1 | T-01, T-02 | None |
| 2 | T-03 | Group 1 |

---

## 3. Consistency Check

- Las tareas T-01 a T-03 coinciden con la lista del diseño.
- Cada AC lo entrega una tarea: AC-04.1 (T-01); AC-01.1, AC-01.2, AC-02.1, AC-02.2, AC-02.3, AC-03.1, AC-03.2 (T-02); AC-04.2 (T-03). NFR-01 y NFR-02 los cubre T-02.
- Cada tarea nombra lo que entrega, su stack y sus archivos, e implementa componentes del diseño (C-03, C-05, C-04).
- Sin ciclos: T-03 depende de T-02.
- T-01 y T-02 pueden ir en paralelo: no comparten archivos (`backend/.example.env` y el registro en `evidence/`). T-03 solo toca el README.

- **Consistency:** Clean
- **Issues:** None

---

## 4. Maintenance Guidelines

This document MUST remain aligned with the approved design and the requirements.

Bump `version` on every change, and keep `upstream` pointing to the versions of the design and the requirements it is built from. The plan has no approval of its own: its status becomes `checked` once it passes the consistency check.

### Source of Truth

- This document is the canonical reference for how each task is approached.
- The design defines the approach and the task list; this plan details it and never changes it.
- The requirements define the acceptance criteria each task delivers.
- The feature's state record tracks the status of each task during Build.
