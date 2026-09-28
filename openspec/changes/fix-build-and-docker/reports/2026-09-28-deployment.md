# Verificación de despliegue: 2026-09-28

Ejecutada por el agente en la rama feature/fix-build-and-docker. Todo lo creado lleva el prefijo `verif_` y se borró al terminar.

## 5.1 Alembic por línea de comandos

```bash
# base vacía creada para la prueba
docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE verif_alembic_cli" postgres
cd backend
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/verif_alembic_cli uv run alembic current   # sin revisión
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/verif_alembic_cli uv run alembic upgrade head
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/verif_alembic_cli uv run alembic current   # 0002 (head)
uv run alembic current                                                                                          # 0002 (head), la de backend/.env
grep -n "sqlalchemy.url" alembic.ini                                                                            # sin resultados
```

## 5.2 Contraseña con caracteres que obligan a codificar la URL

Se creó el rol `verif_pct_user` con contraseña `p@ss%word` y la base `verif_pct` como propietario. La app se arrancó en el puerto 8001 con `DATABASE_URL=postgresql+asyncpg://verif_pct_user:p%40ss%25word@127.0.0.1:5432/verif_pct`.

- `GET /health`: 200 `{"status":"ok"}`.
- Log sin "interpolation".
- `alembic current` con esa URL: `0002 (head)`.
- En `verif_pct.users` aparece el admin sembrado.

Incidencia del entorno, no del repo: el primer arranque en segundo plano ejecutó `C:\Python314\python.exe` en lugar del Python del `.venv`, y ese Python importa como `app` el paquete de otro proyecto (HomeStockAI), instalado en modo editable en el site-packages de usuario. Relanzado, se usó el `.venv` y todo fue correcto. No se ha averiguado por qué `uv run` eligió el intérprete del sistema en ese arranque.

## 5.3 Imagen

```bash
docker compose build --progress=plain backend    # transferring context: 617.44kB
docker compose run --rm --no-deps backend sh -c '...'
```

Resultado:

```text
uid=10001 user=app
OK sin /app/backend/.env
OK .venv creado en el build
OK dist presente
uv 0.10.5
Config.User=app
```

`node_modules` de la etapa `frontend-builder`: `rollup-linux-x64-gnu` y `rollup-linux-x64-musl`, sin `rollup-win32-*`.

Primer build: `useradd --system` avisaba de que el uid 10001 supera `SYS_UID_MAX`. Se quitó `--system`: el uid fijo y `--no-create-home` bastan.

## 5.4 Stack de Compose

```text
SERVICE    STATUS                    PORTS
backend    Up 6 seconds (healthy)    0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp
postgres   Up 12 seconds (healthy)   127.0.0.1:5432->5432/tcp
```

```text
$ curl -s -w "\n[HTTP %{http_code}]\n" http://localhost:8000/health
{"status":"ok"}
[HTTP 200]
$ curl -s http://localhost:8000/ | grep -c "<div id=\"root\">"
1
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/usuarios   (fallback SPA)
200
$ curl -s -w "\n[HTTP %{http_code}]\n" http://localhost:8000/api/auth/me
{"detail":"Missing access token"}
[HTTP 401]
$ docker compose port postgres 5432
127.0.0.1:5432
$ docker compose port backend 8000
0.0.0.0:8000
$ docker compose exec backend sh -c "id -u; grep ^Uid /proc/1/status"
10001
Uid:	10001	10001	10001	10001
$ docker compose logs backend | grep -i -E "error|interpolation" (sin salida esperada)
(fin)
```

Quedan volúmenes de Caddy de otros proyectos Compose en la máquina. No son de este stack y no se tocaron.

## 5.5 Restauración

- Vite y el uvicorn de pruebas parados.
- Servicio `backend` parado y eliminado con `docker compose stop` y `rm`. Nunca `down -v`, que borraría el volumen `postgres_data`.
- Postgres sigue en marcha, como antes de empezar.
- `DROP DATABASE verif_alembic_cli`, `DROP DATABASE verif_pct` (`WITH (FORCE)`) y `DROP ROLE verif_pct_user`.
- `fastapi_template` igual que en el baseline: 1 usuario, 0 refresh tokens, `admin:1:-`, revisión 0002. Sin bases ni roles `verif_%`.
