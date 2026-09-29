# Tests de backend: 2026-09-29

Rama: feature/cleanup-template-leftovers. PostgreSQL 15 en Docker (`docker compose up -d postgres`).

## Comandos

```powershell
cd backend
uv run pytest -q -k "token or refresh or session or seed or spa or migration_0003 or last_admin"
uv run pytest -q
```

- Tests dirigidos: 20 correctos.
- Suite completa: 54 correctos. Los 3 avisos vienen de slowapi con Python 3.14 (`asyncio.iscoroutinefunction` obsoleto) y no dependen de este cambio.
- Ningún test compara ya los textos en inglés o sin tilde. La única cadena antigua que queda es "Administracion del sistema" en el test de la migración 0003, que la necesita como dato de entrada.

## alembic check (tarea 3.1)

Contra una base temporal migrada hasta `head` (nunca contra `fastapi_template`), antes y después de mover `AuthRefreshToken` a `auth/models.py`. La salida es idéntica:

```text
FAILED: New upgrade operations detected: [('add_constraint', UniqueConstraint(Column('user_id', NullType(), table=<user_roles>), Column('role_id', NullType(), table=<user_roles>)))]
```

Es un falso positivo anterior a este cambio: `user_roles` declara una PK compuesta y una restricción única sobre las mismas columnas, y en PostgreSQL solo existe una. No aparece ninguna operación sobre `auth_refresh_tokens`.

## Estado de la BD

Los tests crean y borran una base temporal por test; no escriben en `fastapi_template`.

| Comprobación | Baseline | Tras pytest | Tras curl y restauración |
| --- | --- | --- | --- |
| Revisión Alembic | 0002 | 0002 | 0003 |
| Usuarios | 1 | 1 | 1 |
| Admins activos | 1 | 1 | 1 |
| Bloqueo del admin (`failed_login_attempts:locked_until`) | 1:- | 1:- | 1:- |
| `auth_refresh_tokens` (total / sin revocar) | 0 / 0 | 0 / 0 | 0 / 0 |
| Descripción del rol `admin` | Administracion del sistema | Administracion del sistema | Administración del sistema |
| Descripción del rol `user` | Usuario operativo | Usuario operativo | Usuario operativo |
| Bases temporales de test restantes | 0 | 0 | 0 |

Diferencia esperada, no se restaura: al arrancar el backend para las pruebas de curl, `init_database` aplicó la migración 0003 sobre `fastapi_template`. La revisión pasó de 0002 a 0003 y la descripción del rol `admin` se corrigió porque conservaba el valor original. Para revertirla: `alembic downgrade 0002`.
