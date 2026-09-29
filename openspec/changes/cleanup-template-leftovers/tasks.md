## 0. Setup (OBLIGATORIO - PRIMER PASO)

- [x] 0.1 Crear y cambiar a la rama `feature/cleanup-template-leftovers` desde `main`
- [x] 0.2 Generar el plan técnico con los agentes `backend-developer` y `frontend-developer` en `.claude/doc/cleanup-template-leftovers/{backend,frontend}.md` y leerlo antes de tocar código

## 1. Backend: mensajes y seed (TDD)

- [x] 1.1 Tests: `detail` en español de los escenarios de la spec (sin token, token no válido, caducado, sin refresh, refresh desconocido, refresh caducado, reutilización, sesión no encontrada, sesión ya revocada, último admin)
- [x] 1.2 Test: el seed crea el rol `admin` con "Administración del sistema"
- [x] 1.3 Traducir los `detail` en `auth/security.py`, `auth/service.py`, `users/service.py` y `web/spa.py`; corregir `auth/seed.py`

## 2. Backend: migraciones (TDD)

- [x] 2.1 Test de la migración 0003: con la descripción antigua pasa a la nueva; con una descripción personalizada no cambia
- [x] 2.2 Migración de datos `0003` con `downgrade` simétrico
- [x] 2.3 Quitar las ramas legacy de `0001_initial.py`, `_seed_legacy_schema` y `test_legacy_schema_is_migrated_and_seeded`

## 3. Backend: modelos y repositorios

- [x] 3.1 Mover `AuthRefreshToken` a `auth/models.py` y actualizar imports e `import_model_modules`; comprobar que la salida de `alembic check` es idéntica antes y después (ya tiene un falso positivo previo en `user_roles`)
- [x] 3.2 `Role.users` con `lazy="raise"`
- [x] 3.3 `UsersRepository`: quitar el `selectinload` redundante y `get_user_by_username_without_roles`

## 4. Frontend

- [x] 4.1 Borrar `useBarcodeScanner`, `BarcodeScannerModal` y `SearchableSelect` con sus CSS; `npm uninstall @undecaf/barcode-detector-polyfill`
- [x] 4.2 Dashboard con nombres genéricos (`dashboard.ts`, `HomePage.tsx`, `HomePage.css`)
- [x] 4.3 Textos con tilde y `aria-label` distintos en `Sidebar` y `AppShell`; "Acciones rápidas", "Esta acción" y los tres textos de `Pagination.tsx`; tests Vitest de lo que cambie de forma observable

## 5. Backend: tests y estado de BD (OBLIGATORIO)

- [x] 5.1 Revisar y actualizar los tests unitarios afectados (textos de `detail`)
- [x] 5.2 Capturar baseline de `fastapi_template` (usuarios, refresh tokens, roles y sus descripciones, revisión Alembic, bases de test)
- [x] 5.3 `cd backend && uv run pytest -q` en verde
- [x] 5.4 Verificar el estado de la BD; la migración 0003 corrige la descripción de `admin` en `fastapi_template`: documentarlo como cambio esperado; informe en `openspec/changes/cleanup-template-leftovers/reports/YYYY-MM-DD-backend-tests.md`

## 6. Backend: endpoints con curl (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 6.1 Mensajes de 401 (sin token, token no válido, sin refresh, refresh no válido), 404 de sesión, 400 de sesión revocada y 400 del último admin (solo si hay un único admin activo); `GET /api/roles` sigue respondiendo igual. La reutilización y el refresh caducado los cubre pytest (en curl revocarían sesiones reales)
- [x] 6.2 Restaurar la BD y documentar comandos y respuestas en el informe

## 7. Frontend: E2E con Playwright MCP (OBLIGATORIO - EL AGENTE LO EJECUTA)

- [x] 7.1 Dashboard renderiza sin errores; menú lateral con los nuevos `aria-label`; alta, edición y borrado de un usuario (cubre `Role.users` sin carga ansiosa) y diálogo de borrado con "Esta acción"
- [x] 7.2 Restaurar datos de prueba

## 8. Frontend: verificación (OBLIGATORIO)

- [x] 8.1 `cd frontend && npm run lint && npm run test && npm run build`

## 9. Cierre (OBLIGATORIO)

- [x] 9.1 Actualizar `docs/data-model.md` (modelo de refresh tokens en `auth/models.py`, `Role.users` sin carga ansiosa), `docs/backend-standards.md` (ejemplos con métodos borrados) y `docs/frontend-standards.md` (`shared/hooks/`)
- [ ] 9.2 Abrir el PR con `gh` usando la skill `write-pr-report`
