# Guía de verificación

Cómo validar un cambio de punta a punta. Durante `/opsx:apply`, **el agente ejecuta estas pruebas él
mismo** (ver `.claude/rules/openspec-tasks-mandatory-steps.md`); nunca las delega al usuario.

## 1. Backend — tests

Requiere PostgreSQL disponible (**nunca SQLite**). Levanta la BD si no está en marcha:

```powershell
docker compose up -d postgres
```

```powershell
cd backend
uv run pytest -q
```

- Configura la URL de test según `backend/.example.env` (`TEST_DATABASE_ADMIN_URL`).
- Captura un baseline de la BD si el cambio muta datos y verifica el estado tras los tests; restaura si procede.

## 2. Backend — endpoints con curl

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
- Tras CREATE/UPDATE/DELETE, **restaura el estado de la BD**.
- Prueba casos de error además del happy path.

## 3. Frontend — lint, test, build

```powershell
cd frontend
npm run lint
npm run test
npm run build
```

## 4. Frontend — E2E con Playwright MCP (si hay cambios de UI)

- Arranca frontend y backend.
- Recorre el flujo completo con las herramientas Playwright MCP (`browser_navigate`, `browser_click`,
  `browser_type`, `browser_snapshot`...), incluyendo casos de error.
- Verifica persistencia y estado de la UI; restaura datos de prueba al terminar.

## 5. OpenSpec — consistencia de artefactos

```powershell
openspec validate --all
openspec status --change <change-name>
```

## 6. Antes de archivar

- `docs/` actualizada si cambian contratos/arquitectura/modelo de datos.
- PR creado con la skill `write-pr-report` (`gh`).
- Solo entonces `/opsx:archive`.
