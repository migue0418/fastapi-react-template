# F003 T-02: comprobación ejecutada contra la aplicación real

> Registro de la ejecución de T-02 (2026-11-02). Todo se ejecutó fuera del repo, con un proyecto Compose temporal `f003check`, ya eliminado.

## Entorno

- Docker Server 29.7.2 (Docker Desktop, Windows).
- Imagen construida con el `Dockerfile` del repo (uvicorn arrancado sin `--forwarded-allow-ips`). Copia temporal de `docker-compose.yml` con el puerto `127.0.0.1:18000:8000`, la base en `127.0.0.1:15432` y `env_file` apuntando a un `.env` temporal copiado de `backend/.example.env` (sin secretos reales; la variable `FORWARDED_ALLOW_IPS` se añadía solo en cada escenario). No se tocaron `backend/.env`, los contenedores ni los volúmenes del mantenedor.
- Red `f003check_default`: subred `172.25.0.0/16`, puerta de enlace `172.25.0.1`. El registro de acceso de uvicorn confirma que el contenedor ve las conexiones del host desde `172.25.0.1` (ASM-05): `INFO: 172.25.0.1:55022 - "GET /health" 200`.
- IPs en la red: base de datos `172.25.0.2`, backend `172.25.0.3`, segundo contenedor `172.25.0.4`.
- Los intentos usan credenciales inventadas (`nadie` / `x`): la respuesta normal es 401 y no se crean sesiones. Entre escenarios se recreó el servicio `backend` (`up -d --force-recreate --no-deps backend`) para reiniciar los contadores en memoria. Cada petición usa una conexión nueva (`Connection: close`).
- Orden de los intentos: 1 al 10 devuelven 401 y el 11 devuelve 429 (límite `10/minute` en `login` y `token`); en `refresh`, 1 al 20 devuelven 401 y el 21 devuelve 429 (`20/minute`).

## Escenarios y resultados

Comandos: `curl -s -o /dev/null -w "%{http_code}" -H "X-Forwarded-For: <ip>" -H "Connection: close" -H "Content-Type: application/json" -d '{"username":"nadie","password":"x","remember_me":false}' http://127.0.0.1:18000/api/auth/login` (para `token`, cuerpo de formulario `username=nadie&password=x` en `/api/auth/token`; para `refresh`, `POST /api/auth/refresh` sin cuerpo). Desde el segundo contenedor: `urllib` de la propia imagen del backend (`docker run --network f003check_default --entrypoint python f003check-backend`), contra `http://backend:8000`.

### S1: sin variable (`FORWARDED_ALLOW_IPS` vacía en el contenedor)

Nota: este registro dice que el servicio se recreó entre escenarios; no consta si también se recreó entre las dos filas de S1 (ambas usan la IP de conexión `172.25.0.1`). La segunda fila no se puede dar por válida solo con este registro: Verify debe repetirla recreando el servicio antes.

| Prueba | Secuencia observada (11 intentos) |
|---|---|
| `login` desde el host, `X-Forwarded-For` distinto en cada intento (`198.51.100.1` a `.11`) | 401 x10, **429** |
| `login` desde el host, sin cabecera | 401 x10, **429** |

### S2: variable = `172.25.0.1` (IP de la puerta de enlace)

| Prueba | Secuencia observada |
|---|---|
| Cliente A (`203.0.113.10`), `login` x11 | 401 x10, **429** |
| Cliente B (`203.0.113.20`), `login` x1 tras agotar A | **401** (no limitado) |
| Cliente A, `login` x1 más | **429** (sigue limitado) |
| Cliente A, `token` x11 | 401 x10, **429** |
| Cliente A, `refresh` x21 | 401 x20, **429** |

### S3: conexión no confiada (variable = `172.25.0.1`)

| Prueba | Secuencia observada |
|---|---|
| Segundo contenedor (`172.25.0.4`), `login` x11 con `X-Forwarded-For` distinto en cada intento | 401 x10, **429** |

### S4: variable como red (`172.25.0.0/31`: incluye `172.25.0.1`, excluye `172.25.0.2` a `.4`)

| Prueba | Secuencia observada |
|---|---|
| Cliente A (`203.0.113.10`), `login` x11 | 401 x10, **429** |
| Cliente B (`203.0.113.20`), `login` x1 tras agotar A | **401** (no limitado) |
| Segundo contenedor, `login` x11 con `X-Forwarded-For` distinto | 401 x10, **429** |

### S5: variable = `*`

| Prueba | Secuencia observada |
|---|---|
| Host, `login` x11 con `X-Forwarded-For` distinto en cada intento | 401 x11, **sin 429** |
| Segundo contenedor (`172.25.0.4`), `login` x11 con `X-Forwarded-For` distinto | 401 x11, **sin 429** |

## Veredicto por criterio

| Criterio | Veredicto | Evidencia |
|---|---|---|
| AC-01.1 (cabecera falsificada no evita el límite, sin variable) | Cumple | S1, primera fila: el 11 devuelve 429 pese a 11 `X-Forwarded-For` distintos. |
| AC-01.2 (sin cabecera, comportamiento actual) | Cumple | S1, segunda fila: el 11 devuelve 429. |
| AC-02.1 (un cliente agotado no afecta a otro) | Cumple | S2: A recibe 429 en el 11 y B recibe 401. |
| AC-02.2 (el mismo cliente sigue limitado) | Cumple | S2: A recibe 429 también en el intento 12. |
| AC-02.3 (una conexión que no es del proxy no elige su IP) | Cumple | S3: el segundo contenedor (fuera de la lista) recibe 429 en el 11 con cabeceras distintas. |
| AC-03.1 (la variable basta) | Cumple | S2 y S4: solo se definió la variable (IP sola y red `/31`); AC-02.1 y AC-02.3 se cumplen en ambos. |
| AC-03.2 (sin variable, valor por defecto seguro) | Cumple | S1: se cumplen AC-01.1 y AC-01.2 sin definirla. |
| NFR-01 (evidencia ejecutada de AC-01.1, AC-02.1 y AC-02.3) | Cumple | Ejecutados contra la aplicación en marcha, con origen host y segundo contenedor. Nada declarado no verificado de AC-01.1, AC-02.1 y AC-02.3 (los puntos de la sección "No verificado" quedan fuera de ese objetivo). |
| NFR-02 (límites actuales sin cambios) | Cumple | 429 en el intento 11 en `login` y `token`, y en el 21 en `refresh` (S2). `git diff main -- backend/app/core/limiter.py backend/app/features/auth/router.py` vacío. |

Escenario adicional del diseño (S5, `*`): con `*`, un cliente puede falsificar su IP con `X-Forwarded-For` y no se limita, ni desde el host ni desde un contenedor ajeno a la lista. Confirma el riesgo RISK-01 y que el README debe desaconsejar `*`.

## No verificado

- Redes CIDR más amplias que `/31` (por ejemplo `172.25.0.0/16`) no se ejecutaron; por la lectura del diseño incluirían al segundo contenedor.
- Un valor mal escrito (falla cerrado, según el diseño) no se ejecutó.
- Ejecución local sin Docker con un proxy en `127.0.0.1` no se ejecutó (documentada en RISK-04).
- Un proxy real delante (nginx, Caddy): el host hizo de proxy con `curl`.

## Limpieza

`docker compose -p f003check down -v --rmi local`: `docker ps -a`, `docker volume ls`, `docker network ls` y `docker image ls` no muestran nada de `f003check`. Directorio temporal con las copias del compose y del `.env` en el scratchpad, fuera del repo.
