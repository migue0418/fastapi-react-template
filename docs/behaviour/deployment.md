# Deployment Specification

## Purpose

Cómo se construye y se sirve la aplicación: contenido de la imagen Docker, puertos que publica Docker
Compose, contraseña de PostgreSQL de Compose y conexión de los tests, origen de la URL de la base de datos para las migraciones y build del frontend sin artefactos
compilados.

## Requirements

### Requirement: Imagen Docker sin secretos ni entornos locales
El build de la imagen MUST excluir del contexto los archivos `.env`, los entornos virtuales de Python
(`.venv`), `node_modules`, los builds del frontend (`dist`) y los directorios locales de herramientas,
de modo que la imagen se construya solo con el código fuente y las dependencias que instala el propio
Dockerfile.

#### Scenario: Build con archivos locales presentes
- **GIVEN** un checkout con `backend/.env`, `backend/.venv` y `frontend/node_modules` en disco
- **WHEN** se construye la imagen con `docker compose build backend`
- **THEN** la imagen no contiene `/app/backend/.env`
- **AND** el `.venv` de la imagen es el creado por `uv sync` dentro del build
- **AND** `node_modules` del frontend proviene de `npm ci` dentro del build

### Requirement: Proceso de la aplicación sin privilegios
El contenedor del backend MUST ejecutar uvicorn con un usuario distinto de root.

#### Scenario: Usuario del proceso
- **WHEN** se ejecuta `id -u` dentro del contenedor del backend en marcha
- **THEN** el resultado es distinto de `0`

### Requirement: Versión fija de las herramientas de build
El Dockerfile MUST usar una versión fija de la imagen de uv, alineada con la que genera `uv.lock`.

#### Scenario: Imagen de uv
- **WHEN** se inspecciona el Dockerfile
- **THEN** la imagen de uv lleva una etiqueta de versión concreta y no `latest`

### Requirement: Puertos publicados por Docker Compose
Docker Compose MUST publicar el backend en el puerto 8000 del host y MUST publicar PostgreSQL solo en
`127.0.0.1`, sin reverse proxy incluido en la plantilla.

#### Scenario: Aplicación accesible desde el host
- **GIVEN** el stack arrancado con `docker compose up --build`, `backend/.env` creado desde `backend/.example.env` y `POSTGRES_PASSWORD` válida en el `.env` de la raíz
- **WHEN** se llama a `GET http://localhost:8000/health`
- **THEN** responde 200 con `{ "status": "ok" }`
- **AND** `GET http://localhost:8000/` sirve el `index.html` del frontend

#### Scenario: Base de datos no expuesta a la red
- **WHEN** se inspeccionan los puertos del servicio `postgres`
- **THEN** el 5432 solo está enlazado a `127.0.0.1`

### Requirement: Compose exige una contraseña de PostgreSQL elegida
Docker Compose MUST NOT contener ninguna contraseña de PostgreSQL con valor en los archivos versionados
(`docker-compose.yml`, `.example.env`, `backend/.example.env`). `POSTGRES_PASSWORD`, definida en el `.env`
de la raíz o en el entorno de la shell, MUST ser obligatoria y MUST tener al menos 16 caracteres (contados
como caracteres, no bytes) y ser distinta de `postgres`. Un servicio previo `postgres-check` MUST comprobar
la longitud y el valor antes de que arranque PostgreSQL. Los mensajes de rechazo MUST estar en español,
nombrar `POSTGRES_PASSWORD` y MUST NOT imprimir el valor recibido. La misma contraseña MUST usarse para
PostgreSQL y para el `DATABASE_URL` del backend.

#### Scenario: Variable sin definir o vacía
- **GIVEN** `POSTGRES_PASSWORD` sin definir o vacía
- **WHEN** se ejecuta `docker compose up`
- **THEN** Compose rechaza la configuración antes de crear contenedores ni volumen
- **AND** el mensaje nombra `POSTGRES_PASSWORD` y el `.env` de la raíz

#### Scenario: Contraseña corta o `postgres`
- **GIVEN** `POSTGRES_PASSWORD` con menos de 16 caracteres, o igual a `postgres`
- **WHEN** se ejecuta `docker compose up`
- **THEN** `postgres-check` termina con error y no arranca ningún servicio ni se inicializa la base
- **AND** con `docker compose up -d` el mensaje está en `docker compose logs postgres-check`
- **AND** tras corregir la contraseña, `docker compose up` arranca sin borrar nada a mano

#### Scenario: Contraseña válida
- **GIVEN** `POSTGRES_PASSWORD` de 16 caracteres o más y distinta de `postgres`, y un volumen nuevo
- **WHEN** se ejecuta `docker compose up --build`
- **THEN** `GET /health` responde 200 y la contraseña entra desde `127.0.0.1:5432`, y `postgres` es rechazada

#### Scenario: Volumen ya inicializado
- **GIVEN** un volumen `postgres_data` creado con otra contraseña
- **WHEN** se cambia `POSTGRES_PASSWORD` y se arranca
- **THEN** el backend no conecta, porque PostgreSQL solo aplica la contraseña al crear el volumen
- **AND** el README documenta las dos salidas (borrar el volumen o cambiar la contraseña dentro de la base)

### Requirement: Los tests exigen la URL de administración de PostgreSQL
Los tests que usan la base de datos MUST leer la URL de administración de la variable de entorno
`TEST_DATABASE_ADMIN_URL`, sin valor por defecto. Si falta o está vacía, esos tests MUST fallar con un
mensaje en español que la nombre, antes de abrir ninguna conexión. Los tests que no usan la base de datos
MUST seguir ejecutándose.

#### Scenario: Variable sin definir
- **GIVEN** `TEST_DATABASE_ADMIN_URL` sin definir o vacía
- **WHEN** se ejecuta la suite del backend
- **THEN** los tests que usan la base fallan con un mensaje que nombra la variable, sin conectarse a ningún servidor
- **AND** `test_settings.py` y `test_rename_project.py` pasan

### Requirement: Producción rechaza la contraseña de administrador por defecto
Con `ENVIRONMENT=production`, la aplicación MUST negarse a arrancar si `ADMIN_PASSWORD` es el valor por
defecto (`ChangeMe123!`, comparación exacta). El error MUST nombrar `ADMIN_PASSWORD` y MUST NOT imprimir
ningún valor de contraseña. En `development` y `test` el valor por defecto sigue permitido.

#### Scenario: Valor por defecto en producción
- **GIVEN** `ENVIRONMENT=production` y `ADMIN_PASSWORD` sin definir o igual a `ChangeMe123!`
- **WHEN** se arranca la aplicación
- **THEN** el arranque falla antes de acceder a la base de datos
- **AND** el mensaje indica que `ADMIN_PASSWORD` no puede ser el valor por defecto y dónde definirla

#### Scenario: Contraseña propia en producción
- **GIVEN** `ENVIRONMENT=production` y `ADMIN_PASSWORD` distinta de `ChangeMe123!`
- **WHEN** se arranca la aplicación
- **THEN** el arranque continúa con normalidad

### Requirement: URL de base de datos única para migraciones
Las migraciones de Alembic MUST conectarse a la URL de `Settings.database_url`, tanto al arrancar la
aplicación como al ejecutar `alembic` por línea de comandos. `alembic.ini` MUST NOT contener una URL de
base de datos.

#### Scenario: Alembic por línea de comandos
- **GIVEN** `DATABASE_URL` apunta a una base de datos concreta
- **WHEN** se ejecuta `uv run alembic current` desde `backend/`
- **THEN** Alembic se conecta a esa base de datos y no a otra definida en `alembic.ini`

#### Scenario: URL con caracteres especiales
- **GIVEN** una `DATABASE_URL` cuya contraseña contiene `%` codificado (por ejemplo `%40`)
- **WHEN** se ejecutan las migraciones al arrancar la aplicación
- **THEN** se aplican sin error de interpolación de la configuración

### Requirement: Configuración de Vite sin artefactos compilados
El frontend MUST cargar la configuración de Vite desde `vite.config.ts`. El build (`tsc -b`) MUST NOT
generar ni versionar `vite.config.js`, `vite.config.d.ts` ni archivos `*.tsbuildinfo`.

#### Scenario: Build limpio
- **GIVEN** un checkout recién clonado
- **WHEN** se ejecuta `npm run build` en `frontend/`
- **THEN** no aparece ningún archivo nuevo ni modificado en `git status`
- **AND** no existe `frontend/vite.config.js`

