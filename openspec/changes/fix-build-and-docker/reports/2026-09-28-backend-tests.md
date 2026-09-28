# Tests de backend: 2026-09-28

Rama: feature/fix-build-and-docker. PostgreSQL 15 del Compose en `127.0.0.1:5432`.

## Comandos

```powershell
cd backend
uv run pytest -q
```

Tests nuevos: `test_alembic_ini_has_no_database_url`, `test_alembic_config_accepts_percent_encoded_database_url` y `test_alembic_cli_uses_settings_database_url`. Este último invoca en proceso el punto de entrada de la CLI (`alembic.config.main`) contra una base temporal.

- Antes de implementar (rojo esperado): 3 fallos, 26 correctos.
  - La URL de una base de otro proyecto seguía en `alembic.ini`.
  - `ValueError: invalid interpolation syntax` con `%40` en la URL.
  - El test de la CLI falla en su guarda sin conectar a ninguna base.
- Tras la implementación: 29 correctos. Los 3 avisos vienen de slowapi con Python 3.14 y no dependen de este cambio.

`build_client` pasa a reutilizar el helper nuevo `temporary_database`, con el mismo orden de limpieza.

## Estado de la BD

| Comprobación | Antes | Después |
| --- | --- | --- |
| `fastapi_template`: usuarios / refresh tokens / bloqueo / revisión | 1 / 0 / admin:1:- / 0002 | 1 / 0 / admin:1:- / 0002 |
| Bases temporales de test o `verif_%` | 0 | 0 |
| Roles `verif_%` | 0 | 0 |

Sin mutaciones: no hizo falta restaurar nada.
