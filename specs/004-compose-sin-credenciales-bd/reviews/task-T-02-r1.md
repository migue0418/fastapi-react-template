---
artifact: review
feature: F004
kind: task
target: task/004-T-02@37df8bb
sources: [plan.md@1#T-02, requirements.md@2#AC-06.1-AC-06.4, requirements.md@2#NFR-01, design.md@2#C-04, design.md@2#IF-02, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/004-T-02@37df8bb, round 1

> Records one independent review round. Never changed once written; answers go in `task-T-02-r1-answers.md`.

---

## 2. Findings

### R1-01: Una sola línea en blanco entre los imports y `_get_test_database_admin_url`

- **Severity:** Minor
- **Where:** backend/tests/test_api.py:28
- **What is wrong:** Al borrar `DEFAULT_TEST_DATABASE_ADMIN_URL` quedó una sola línea en blanco antes de `def _get_test_database_admin_url`. El estilo (PEP 8 / E302) pide dos antes de una definición de primer nivel; un linter de formato lo marcaría.
- **Evidence:** el diff muestra que se eliminaron las dos líneas en blanco previas a la función y solo queda una (`from sqlalchemy.engine import URL, make_url` seguido de una línea vacía y `def`). `ruff` no está instalado en el entorno de la copia de trabajo, por lo que no se pudo confirmar con la herramienta.
- **Recommended fix:** dejar dos líneas en blanco antes de la función.

### R1-02: Los 3 tests que abren `temporary_database` dentro del cuerpo fallan (FAILED) en vez de dar ERROR

- **Severity:** Minor
- **Where:** backend/tests/test_api.py (`test_alembic_cli_uses_settings_database_url`, `test_migration_0003_fixes_only_seeded_admin_description[...]` x2)
- **What is wrong:** Sin la variable, 49 tests terminan en ERROR (fixture) y 3 en FAILED (llaman a `temporary_database` en el cuerpo). Todos fallan con el mensaje; ninguno se omite, así que AC-06.1 se cumple. Solo se anota para que la evidencia de Verify cuente 52 rechazos (49 + 3), no 49.
- **Evidence:** ejecución sin la variable: `3 failed, 51 passed, 49 errors`; todos los rechazos muestran `RuntimeError: Falta TE...`; 0 omitidos.
- **Recommended fix:** ninguno en el código; registrar el recuento correcto en la evidencia.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2 (R1-01, R1-02)
- **Converging:** Yes (primera ronda)
- **Limits of this review:**
  - Se ejecutó la suite en una copia de trabajo desechable de `37df8bb` con un PostgreSQL 15 desechable en 127.0.0.1:55433. Con la variable: 103 passed (101 previos + 2 casos parametrizados nuevos; el recuento previo se deduce del diff, no se ejecutó la rama base). Sin la variable: `test_settings.py` y `test_rename_project.py`, 47 passed (AC-06.4); 0 omitidos; 0 apariciones de una cadena `CANARIO-F004-x` definida en otra variable (NFR-01, el mensaje no imprime ningún valor).
  - AC-06.2 solo se comprobó por el test automatizado (`asyncpg.connect` sustituido, no se invoca) y por lectura de código: `_get_test_database_admin_url()` se resuelve antes de cualquier conexión y fuera del `try`, de modo que el `RuntimeError` no se reenvuelve. No se levantó un segundo PostgreSQL en 5432 (puerto no tocado, por instrucción).
  - Tras las ejecuciones, una consulta a `pg_database` devolvió una salida no vacía para `fastapi_template_test_%` (aprox. una base). No se pudo identificar su origen porque el contenedor se retiró; podría ser preexistente (no se ejecutó la rama base), por lo que la comprobación de limpieza de NC-006 queda no concluyente. Verify debería repetirla con `\l` antes de borrar el servidor.
  - No se ejecutó linter (ruff ausente). Revisión realizada por un subagente con acceso solo a los archivos; independiente.

### 3.1 What Should Be Kept

- El test falla primero y sin PostgreSQL, parametrizado con variable ausente y vacía, comprueba que no se llama a `asyncpg.connect` y que no se mezcla con el mensaje «PostgreSQL de tests no disponible».
- Mensaje en español con marcador `<contraseña>`, sin valor real; cambio limitado a `backend/tests/test_api.py`; sin dependencias nuevas; `DEFAULT_TEST_DATABASE_ADMIN_URL` eliminado.

---

## 4. Maintenance Guidelines

Este archivo no se modifica una vez escrito. Las respuestas van en `task-T-02-r1-answers.md`.
