# Tests y verificación: 2026-10-01

Rama: feature/refresh-template-docs. PostgreSQL 15 en Docker (`docker compose up -d postgres`).

## Tests de backend

```powershell
cd backend
uv run pytest -q tests/test_rename_project.py
uv run pytest -q
```

- Antes de crear el script, `tests/test_rename_project.py` daba `1 error during collection` (`FileNotFoundError` al cargar `scripts/rename_project.py`): el rojo esperado.
- Con el script: 33 correctos, sin PostgreSQL.
- Suite completa: 87 correctos (los 54 de antes más los 33 del script). Los 3 avisos vienen de slowapi con Python 3.14 y no dependen de este cambio.
- `ruff format --check`, `ruff check --select I` (ruff 0.11.0) y `flake8` con los argumentos de `.pre-commit-config.yaml` pasan en `scripts/rename_project.py` y en el test.

## Estado de la BD

Los tests no escriben en `fastapi_template`: los del script usan repos git temporales y los de la API, una base temporal por test.

| Comprobación | Antes | Después |
| --- | --- | --- |
| Revisión Alembic | 0003 | 0003 |
| Usuarios / admins activos | 1 / 1 | 1 / 1 |
| Bloqueo del admin (`failed_login_attempts:locked_until`) | 1:- | 1:- |
| `auth_refresh_tokens` (total / sin revocar) | 0 / 0 | 0 / 0 |
| Roles | admin "Administración del sistema", user "Usuario operativo" | igual |
| Bases temporales de test restantes | 0 | 0 |

Sin mutaciones: no hizo falta restaurar nada.

## Prueba real del script en un clon (tarea 1.3)

Clon de la rama con el script confirmado, en una carpeta temporal fuera del repo, ya borrada.

```powershell
uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico
```

- Código 0. Modificó 16 archivos: los 13 de la plantilla y 3 artefactos de este cambio, que citan el nombre y dejarán de tocarse al archivarlo (el script excluye `openspec/changes/archive/`).
- Un aviso, esperado: la línea de la spec que pone como ejemplo dos variantes no reconocidas.
- `git diff --stat` y `git diff --ignore-cr-at-eol --stat` dan lo mismo (16 archivos, 25 líneas): los finales de línea no cambian. `backend/tests/test_api.py` conserva el BOM.
- `git grep -i` no encuentra variantes fuera de `openspec/changes/archive/`, del script y de este cambio. El archivo de cambios queda intacto.
- `cd backend && uv lock --check`: código 0.
- `cd frontend && npm install --package-lock-only --ignore-scripts`: código 0 y `package-lock.json` idéntico byte a byte.

## Comprobaciones de los docs (tarea 3.2)

- Rayas y negritas en `README.md`, `docs/*.md` y `openspec/config.yaml`: ninguna.
- Referencias a la capa local fuera de `openspec/changes/`: solo `.dockerignore:2`, `.gitignore:27-28` y los pasos 2 y 5 de "Empezar un proyecto nuevo" del README, que deben citarla.
- "Agente" en los docs: siempre se refiere a quien implementa (`base-standards.md`, `development_guide.md`, `sdd-guide.md`, `verification-guide.md` y dos reglas de `config.yaml`).
- Enlaces relativos de los `.md` versionados fuera de `openspec/changes/`, con anclas: 0 rotos. La guía antigua tenía 7.
- Variantes del nombre en los docs: solo `README.md:1`. En todo el repo, fuera de `openspec/changes/`: los 13 archivos de la plantilla y `scripts/rename_project.py`.

## Endpoints con curl (tarea 5.1)

No aplica: el cambio no añade ni modifica endpoints.

## E2E con Playwright (tarea 6.1)

No aplica: el cambio no toca el frontend.

## Verificación de frontend (tarea 7.1)

`npm run lint`, `npm run test` (24 tests en 6 archivos) y `npm run build` correctos.
