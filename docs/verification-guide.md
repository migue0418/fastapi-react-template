# Guía de verificación

Cómo validar un cambio de punta a punta. El agente ejecuta estas pruebas él mismo y nunca las delega al
usuario. Una tarea solo se da por hecha después de ejecutarla y comprobar el resultado.

## 0. Rama del cambio

Cada cambio se hace en su propia rama, creada desde `main`.

## 1. Backend: tests

Requiere PostgreSQL disponible (nunca SQLite). Levanta la BD si no está en marcha (necesita `POSTGRES_PASSWORD` en el `.env` de la raíz):

```powershell
docker compose up -d postgres
```

1. Revisa y actualiza los tests afectados por el cambio.
2. Si el cambio muta datos, captura un baseline de la BD (conteos y registros clave).
3. Ejecuta los tests del módulo y después la suite completa:

   ```powershell
   cd backend
   uv run pytest -q
   ```

4. Verifica el estado de la BD tras los tests y restáuralo si ha cambiado.

Los tests leen la URL de administración de PostgreSQL de la variable de entorno
`TEST_DATABASE_ADMIN_URL`, no de `backend/.env`. Es obligatoria y no tiene valor por defecto: sin ella
los tests que usan la base fallan con un mensaje que la nombra. Para la base de Compose, apúntala a ella con
la contraseña de tu `.env`. Ver [Tests](../README.md#tests) en el README.

## 2. Backend: endpoints con curl

Arranca el server y prueba el contrato real:
```powershell
cd backend
uv run uvicorn app.main:app --reload
```
```bash
curl -i http://localhost:8000/api/<recurso>
curl -i -X POST http://localhost:8000/api/<recurso> -H "Content-Type: application/json" -d '{...}'
```
- Verifica códigos (200/201/204/400/401/403/404/409/422) y cuerpos.
- Tras CREATE/UPDATE/DELETE, restaura el estado de la BD.
- Prueba casos de error (validación, no autorizado, recurso inexistente) además del happy path.
- Anota los comandos y las respuestas en el informe del cambio (sección 6).

## 3. Imagen y Compose (si el cambio toca Docker)

```bash
docker compose up -d --build
curl -i http://localhost:8000/health
docker compose exec backend id -u        # distinto de 0
docker compose port postgres 5432        # 127.0.0.1:5432
```

- Compose necesita `POSTGRES_PASSWORD` (mínimo 16 caracteres, distinta de `postgres`) en el `.env` de la raíz o en la shell. Si el cambio toca la comprobación de la contraseña, prueba también el rechazo: sin variable, vacía, corta y `postgres`. No uses `docker compose config`: imprime la contraseña interpolada.
- La imagen no debe contener `/app/backend/.env`.
- Para parar: `docker compose down`, sin `-v` (borraría el volumen de PostgreSQL).

## 4. Frontend: lint, test, build

```powershell
cd frontend
npm run lint
npm run test
npm run build
```

## 5. Frontend: E2E con Playwright MCP (si hay cambios de UI)

- Arranca frontend y backend.
- Recorre el flujo completo con las herramientas Playwright MCP (`browser_navigate`, `browser_click`,
  `browser_type`, `browser_snapshot`...), incluyendo casos de error.
- Verifica persistencia y estado de la UI; restaura datos de prueba al terminar.

## 6. Informe del cambio

Guarda el resultado en `specs/NNN-<slug>/evidence/`: comandos, resultados, comparación de la BD antes y
después, restauraciones hechas y pruebas con curl.

## 7. Antes de abrir el PR

- `docs/` actualizada si cambian contratos/arquitectura/modelo de datos.
- En una feature SDD, el PR lo abre `/sdd-kit:sdd-release`; fuera de ella, usa `gh pr create`.
