# FastAPI Template

Plantilla de proyecto full-stack lista para usar. Incluye autenticación JWT, gestión de usuarios y roles, y una interfaz React moderna.

## Stack

- Backend: FastAPI, SQLAlchemy async, Alembic, PostgreSQL, uv
- Frontend: React 19, TypeScript, Vite, React Router 7
- Auth: JWT (access token 15 min) + refresh token en cookie HTTP-only
- Deploy: Docker Compose (backend + PostgreSQL)

## Empezar un proyecto nuevo

1. Crea el repositorio desde la plantilla y clónalo. Con el árbol de trabajo limpio, renómbralo desde la raíz (requiere [uv](https://docs.astral.sh/uv/getting-started/installation/)):

   ```powershell
   uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico
   ```

   El primer argumento es el nombre visible. El segundo es el identificador (minúsculas, dígitos y guiones bajos, hasta 25 caracteres): es el nombre de la base de datos y, con guiones, el de los paquetes. El script cambia el nombre de la plantilla en los archivos versionados, salvo en el propio script y en los archivos que no son UTF-8, lista los archivos modificados y avisa de las variantes que no reconoce. Revisa el resultado con `git diff` y confírmalo.
2. Si tienes configuración local de Claude Code (`CLAUDE.md` y `.claude/`), cópiala al proyecto: no se versiona.
3. Crea `backend/.env` desde `backend/.example.env`, con un `SECRET_KEY` y un `ADMIN_PASSWORD` nuevos (con `ENVIRONMENT=production`, `ADMIN_PASSWORD` no puede ser `ChangeMe123!`). Para generar la clave: `python -c "import secrets; print(secrets.token_hex(32))"`.
4. Instala sdd-kit si aún no lo tienes y lanza `/sdd-kit:sdd-onboarding` (ver [Spec-Driven Development](#spec-driven-development-sdd-kit)). `docs/behaviour/` describe el comportamiento que hereda el proyecto (auth, users, roles, health, despliegue y renombrado): úsalo como entrada del onboarding.

## Inicio rápido (Docker)

```powershell
# Copiar y rellenar variables de entorno
cp backend/.example.env backend/.env
cp .example.env .env

# Edita .env (en la raíz) y define POSTGRES_PASSWORD
docker compose up --build
```

`POSTGRES_PASSWORD` es la contraseña de PostgreSQL y no tiene valor por defecto. Defínela en el `.env` de la raíz (no versionado), con al menos 16 caracteres, distinta de `postgres`, y mejor alfanumérica y ASCII (los caracteres `@ / : # % $` rompen la URL de conexión). Para generar una: `python -c "import secrets; print(secrets.token_hex(24))"`.

Si la contraseña es demasiado corta o igual a `postgres`, `docker compose up` termina con un mensaje en español y no arranca PostgreSQL ni el backend. Con `docker compose up -d` ese mensaje no sale por pantalla: léelo con `docker compose logs postgres-check`. Si la variable falta o está vacía, Compose rechaza la configuración antes de crear nada y muestra el mensaje en pantalla incluso con `-d`.

Compose construye `DATABASE_URL` del backend con esa contraseña y sobrescribe la de `backend/.env`.

App disponible en `http://localhost:8000`  
Credenciales por defecto: `admin` / `ChangeMe123!`

PostgreSQL se publica solo en `127.0.0.1:5432`. Para servir la app con HTTPS, ver [Despliegue detrás de un proxy](#despliegue-detrás-de-un-proxy).

## Desarrollo local

Requiere [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado.

```powershell
# Backend (uv crea .venv e instala todo, incluidas deps de dev)
cd backend
uv sync
uv run uvicorn app.main:app --reload

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

- Backend en `http://127.0.0.1:8000`
- Frontend Vite en `http://127.0.0.1:5173`

El `DATABASE_URL` de `backend/.example.env` no lleva contraseña: al ejecutar el backend fuera de Compose, añádela en `backend/.env` (`postgresql+asyncpg://postgres:<contraseña>@127.0.0.1:5432/fastapi_template`).

## Volumen de PostgreSQL ya inicializado con otra contraseña

La imagen de PostgreSQL aplica `POSTGRES_PASSWORD` solo al crear el volumen. Si el volumen `postgres_data` ya existe (por ejemplo, creado con una contraseña anterior), cambiar `POSTGRES_PASSWORD` en el `.env` no cambia la contraseña de la base y el backend no podrá conectarse. Hay dos salidas:

- Empezar de cero: `docker compose down -v` borra el volumen y **destruye los datos de la aplicación**. Después, `docker compose up --build` crea la base con la contraseña actual del `.env`.
- Conservar los datos: cambia la contraseña dentro de la base, con el stack en marcha, usando `\password` interactivo para no escribirla en la línea de comandos:

  ```powershell
  docker compose exec postgres psql -U postgres
  # dentro de psql:
  \password postgres
  ```

  Introduce la misma contraseña que has puesto en `POSTGRES_PASSWORD` y reinicia el backend si no se reconecta: `docker compose restart backend`.

## Tests

```powershell
cd backend
uv run pytest -q
```

Requiere PostgreSQL accesible. Los tests de la API crean una base de datos temporal por test y la borran al terminar. Para crearlas se conectan con la URL de `TEST_DATABASE_ADMIN_URL`, que es obligatoria y no tiene valor por defecto: sin ella, esos tests fallan con un mensaje que la nombra y no abren ninguna conexión.

`TEST_DATABASE_ADMIN_URL` es una variable de entorno de la shell que lanza `pytest`: los tests no la leen de `backend/.env` ni del `.env` de la raíz. Debe llevar el esquema `postgresql+asyncpg://` y apuntar a un PostgreSQL con permiso para crear y borrar bases de datos.

Para usar la base de Compose, levántala y apunta la variable a ella con la contraseña de tu `.env` (sustituye `<contraseña>` por el valor de `POSTGRES_PASSWORD`):

```powershell
docker compose up -d postgres
cd backend
$env:TEST_DATABASE_ADMIN_URL = "postgresql+asyncpg://postgres:<contraseña>@127.0.0.1:5432/postgres"
uv run pytest -q
```

En una shell de Linux o macOS:

```bash
docker compose up -d postgres
cd backend
export TEST_DATABASE_ADMIN_URL="postgresql+asyncpg://postgres:<contraseña>@127.0.0.1:5432/postgres"
uv run pytest -q
```

Si la contraseña tiene caracteres especiales, codifícalos en la URL (por eso se recomienda alfanumérica).

## Dependencias

Las dependencias se gestionan con `uv` y `pyproject.toml`:

- Producción (`[project.dependencies]`): instaladas en Docker con `uv sync --no-dev`
- Desarrollo (`[dependency-groups] dev`): `pytest`, `httpx`. Solo en local, nunca en la imagen Docker

```powershell
cd backend
uv add <paquete>             # añadir dependencia de producción
uv add --dev <paquete>       # añadir dependencia de desarrollo
uv lock                      # regenerar uv.lock (commitear)
```

## Añadir nuevas features

Sigue la arquitectura por slice:

```
backend/app/features/<feature>/
    router.py       # endpoints FastAPI
    schemas.py      # modelos Pydantic
    service.py      # lógica de negocio
    repository.py   # acceso a datos
    models.py       # modelos SQLAlchemy (si hay tabla nueva)

frontend/src/features/<feature>/
    api.ts          # llamadas HTTP
    types.ts        # interfaces TypeScript
    FeaturePage.tsx # componentes
```

Cuando añadas un modelo SQLAlchemy nuevo, impórtalo en `backend/app/core/database.py::import_model_modules` y genera la migración:

```powershell
cd backend
uv run alembic revision --autogenerate -m "descripcion"
uv run alembic upgrade head
```

Alembic toma la URL de la base de datos de `Settings` (`DATABASE_URL` o `backend/.env`), igual que la app. Ejecútalo desde `backend/`.

## Spec-Driven Development (sdd-kit)

La plantilla usa el plugin de Claude Code [sdd-kit](https://github.com/daniel-torresc/sdd-kit). No viene en el repo: instálalo una vez en tu máquina y reinicia Claude Code.

```powershell
claude plugin marketplace add daniel-torresc/sdd-marketplace
claude plugin install sdd-kit@sdd-marketplace
```

Si la descarga falla con `Host key verification failed`, define `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` y repite la instalación.

El ciclo:

```
/sdd-kit:sdd-onboarding  # una vez por proyecto: archivos fundacionales en .sdd/ y primer roadmap
/sdd-kit:sdd-roadmap     # refinar, dividir y ordenar los próximos incrementos
/sdd-kit:sdd-define      # qué y por qué: brief y requirements
/sdd-kit:sdd-design      # cómo: design, tareas y plan
/sdd-kit:sdd-build       # implementar y revisar tarea a tarea
/sdd-kit:sdd-verify      # comprobar la feature completa
/sdd-kit:sdd-document    # alinear la documentación con lo construido
/sdd-kit:sdd-release     # abrir el PR en borrador; el merge lo hace una persona
```

- Estándares y guías versionadas en `docs/` (empieza por `docs/development_guide.md` y `docs/base-standards.md`).

## Despliegue detrás de un proxy

La plantilla no incluye proxy: Compose publica el backend en el puerto 8000 del host. Para servirla con HTTPS, pon delante un proxy que termine TLS (nginx, Caddy, Traefik...) y que reenvíe al puerto 8000.

- TLS y cookies. Con `ENVIRONMENT=production`, la cookie de refresh lleva el atributo `Secure` y la app envía `Strict-Transport-Security`. Los navegadores no guardan cookies `Secure` recibidas por HTTP salvo en `localhost` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure)), así que en producción la sesión solo se mantiene por HTTPS.
- IP real del cliente. uvicorn solo acepta `X-Forwarded-For` y `X-Forwarded-Proto` de las IPs listadas en `FORWARDED_ALLOW_IPS` ([uvicorn](https://uvicorn.dev/settings/#http)). En Compose, sin esa variable, la app no confía en ningún proxy de la red (fuera de Compose, ver el último punto de esta lista) y el rate limit de login, token y refresh ve la IP del proxy: todos los clientes tras él comparten cupo. Con la variable, cada cliente tiene el suyo. Defínela en `backend/.env` (hay un ejemplo comentado en `backend/.example.env`); Compose la pasa al contenedor del servicio `backend` con `env_file`. El valor es una IP o una red CIDR, o una lista separada por comas (la lista no se ha ejecutado; según la documentación de uvicorn).
- Usa el valor más estrecho posible: la IP o la red mínima desde la que se conecta el proxy al backend. En Docker Desktop, la conexión que ve el contenedor puede ser la puerta de enlace de la red de Compose y no la del cliente. Con una lista concreta, uvicorn toma como IP del cliente la primera no confiada empezando por la derecha de `X-Forwarded-For` (según la documentación de uvicorn; no se ha ejecutado con varias entradas), y una conexión que no está en la lista no puede elegir su IP. Con `*` esa garantía no existe: cualquier cliente que llegue al backend puede falsificar su IP con `X-Forwarded-For` y saltarse el límite (observado con `*`, tanto desde el host como desde otro contenedor de la red). Según el diseño, ocurre también con el puerto 8000 cerrado al exterior, aunque no se ha ejecutado con el 8000 cerrado. Lo mismo pasa con una red amplia que incluya clientes u otros contenedores (observado con `172.25.0.0/16`: otro contenedor de la red fijó su IP con la cabecera y no quedó limitado).
- Un valor mal escrito no es una IP ni una red válidas: uvicorn no confía en nadie y no avisa, así que el cupo sigue compartido (observado con `no-es-una-ip`: un cliente agotado limitó a otro). Si tras definirla un cliente agotado limita a otros, revisa el valor.
- Fuera de Compose (uvicorn local), `FORWARDED_ALLOW_IPS` vale por defecto `127.0.0.1`: un proxy en la misma máquina ya es de confianza, y una cabecera enviada desde esa máquina se respeta. En Compose no ocurre, porque ningún cliente externo llega al contenedor desde su propio `127.0.0.1`.
- Un solo camino de entrada. Con el proxy delante, publica el backend como `127.0.0.1:8000:8000` o quita `ports` y comparte red con el proxy. Si el 8000 queda accesible desde fuera y `FORWARDED_ALLOW_IPS` es amplio (o `*`), cualquiera puede falsificar `X-Forwarded-For` y saltarse el rate limit.
- Rate limit en memoria. Los contadores viven en la memoria de cada proceso y se pierden al reiniciar. Con varios workers de uvicorn o varias réplicas, cada proceso cuenta por separado y el límite real se multiplica.

## Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `APP_NAME` | Nombre de la aplicación |
| `ENVIRONMENT` | `development` / `production` / `test` |
| `SECRET_KEY` | Clave para firmar JWT (cambiar en producción) |
| `POSTGRES_PASSWORD` | Solo Docker Compose, en el `.env` de la raíz. Contraseña de PostgreSQL: obligatoria, mínimo 16 caracteres y distinta de `postgres`. Compose la usa para PostgreSQL y para el `DATABASE_URL` del backend |
| `DATABASE_URL` | URL de conexión a PostgreSQL. En Compose se construye con `POSTGRES_PASSWORD`; fuera de Compose, añade la contraseña en `backend/.env` |
| `ADMIN_USERNAME` | Usuario administrador inicial |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial. Con `ENVIRONMENT=production` no puede ser `ChangeMe123!` |
| `FORWARDED_ALLOW_IPS` | Opcional, solo tras un proxy. IP, red CIDR o lista separada por comas desde las que uvicorn acepta `X-Forwarded-For`; sin ella no se confía en ningún proxy. La lee uvicorn, no `Settings`. Ver [Despliegue detrás de un proxy](#despliegue-detrás-de-un-proxy) |
| `TEST_DATABASE_ADMIN_URL` | Solo tests. URL de PostgreSQL con permiso para crear y borrar bases de datos. Obligatoria, sin valor por defecto. Con esquema `postgresql+asyncpg://`. Se lee del entorno de la shell, no de `backend/.env` |
