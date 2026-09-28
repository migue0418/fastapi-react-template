# Deployment Specification

## Purpose

Cómo se construye y se sirve la aplicación: contenido de la imagen Docker, puertos que publica Docker
Compose, origen de la URL de la base de datos para las migraciones y build del frontend sin artefactos
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
- **GIVEN** el stack arrancado con `docker compose up --build` y `backend/.env` creado desde `.example.env`
- **WHEN** se llama a `GET http://localhost:8000/health`
- **THEN** responde 200 con `{ "status": "ok" }`
- **AND** `GET http://localhost:8000/` sirve el `index.html` del frontend

#### Scenario: Base de datos no expuesta a la red
- **WHEN** se inspeccionan los puertos del servicio `postgres`
- **THEN** el 5432 solo está enlazado a `127.0.0.1`

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

