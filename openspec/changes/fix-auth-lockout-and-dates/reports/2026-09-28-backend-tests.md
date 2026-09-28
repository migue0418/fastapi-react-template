# Tests de backend: 2026-09-28

Rama: feature/fix-auth-lockout-and-dates. PostgreSQL 15 en Docker (`docker compose up -d postgres`).

## Comandos

```powershell
cd backend
uv run pytest -q
```

Primera ejecución tras escribir los tests y antes de implementar (rojo esperado): 17 fallos, 24 correctos.
Tras la implementación: 41 correctos. Los 3 avisos vienen de slowapi con Python 3.14 (`asyncio.iscoroutinefunction` obsoleto) y no dependen de este cambio.

## Estado de la BD

Los tests crean y borran una base temporal por test; no escriben en `fastapi_template`.

| Comprobación | Antes | Después |
| --- | --- | --- |
| Usuarios en `fastapi_template` | 1 | 1 |
| `auth_refresh_tokens` (total / sin revocar) | 0 / 0 | 0 / 0 |
| Estado de bloqueo (`username:failed_login_attempts:locked_until`) | admin:1:- | admin:1:- |
| Revisión Alembic | 0002 | 0002 |
| Bases temporales de test restantes | 0 | 0 |

Sin mutaciones: no hizo falta restaurar nada.
