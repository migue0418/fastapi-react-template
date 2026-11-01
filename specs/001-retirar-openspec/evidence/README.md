---
artifact: evidence
feature: F001
run: 1
commit: df75bbd8a30e142a468f2ad144677719727f1875
date: 2026-11-01
result: pass
upstream: [requirements.md@1, design.md@3, plan.md@1]
---

# Evidence: Retirar OpenSpec

> Records what the full check of a feature showed: the checks that ran and their results, which test proves each acceptance criterion, how each quality was verified, and what failed.
> It is the evidence the feature review and the human judge the feature on. It states what was observed, never what was expected.
> Each Verify run replaces this file with the next run number; earlier runs remain in the repository's history.

---

## 1. Checks

Todas las comprobaciones se ejecutaron sobre `feature/001-retirar-openspec` en `df75bbd`, con el árbol limpio. El backend se probó contra un `postgres:15` desechable en `127.0.0.1:55433`, creado para esta run y eliminado al terminar. El puerto 5432, que ocupa el contenedor de otro proyecto, no se usó.

| Check | Command | Result | Notes |
|---|---|---|---|
| Suite de backend | `cd backend && uv run python -m pytest -q` con `TEST_DATABASE_ADMIN_URL` apuntando a `127.0.0.1:55433` | Pass | 87 passed, 3 warnings de deprecación de slowapi, ya presentes en la línea base |
| Comprobaciones de aceptación de F001 | `cd backend && uv run python -m pytest ../specs/001-retirar-openspec/checks -v` | Pass | 15 passed |
| Tests del renombrado | `uv run python -m pytest tests/test_rename_project.py -v` | Pass | 33 passed |
| Lint de frontend | `cd frontend && npm run lint` | Pass | Sin avisos |
| Tests de frontend | `cd frontend && npm run test` | Pass | 6 archivos, 24 tests |
| Build de frontend | `cd frontend && npm run build` | Pass | `built in 745ms` |
| Build de la imagen | `docker compose build backend`, en un worktree temporal de `df75bbd` con `backend/.env` copiado de `backend/.example.env` | Pass | `Image verify-wt-backend Built`. Imagen, `.env` y worktree eliminados después |
| Búsqueda de menciones (AC-07.1) | `git grep -niI -e openspec -e opsx -- . ":(exclude)specs/001-retirar-openspec"` | Pass | 4 coincidencias: `.sdd/constitution.md:255` y `.sdd/roadmap.md:24`, `27` y `29`, estas tres bajo el encabezado de RM-08 |
| Historial de los documentos movidos (NFR-02) | `git log --follow --oneline -- docs/behaviour/<área>.md` | Pass | auth 4 commits, deployment 3, health 2, project-rename 4, roles 2, users 4. El primero de cada uno es anterior a la feature |
| Archivos retirados accesibles en el historial (AC-02.2) | `git cat-file -t de1d8a0:openspec/config.yaml`; `git merge-base --is-ancestor de1d8a0 HEAD` | Pass | `blob`; `de1d8a0` es antecesor de `HEAD` |
| Archivos versionados bajo `openspec/` (AC-02.1) | `git ls-files openspec` | Pass | 0 archivos, y la carpeta no existe en disco |

### 1.1 Known Failures

Ninguno al empezar Build (`known-failures: []`). La suite sigue sin fallos.

---

## 2. Traceability

Los tests de `specs/001-retirar-openspec/checks/test_acceptance.py` se abrevian como `checks::`. Los de `backend/tests/test_rename_project.py`, como `rename::`. Cada test nombra su ID completo (`F001:AC-nn.m`) en su docstring.

| Requirement | Acceptance criterion | Components and interfaces | Tasks | Tests | Result |
|---|---|---|---|---|---|
| REQ-01 | AC-01.1 | C-01, IF-02 | T-01 | `checks::test_f001_ac_01_1_six_areas_present` | Pass |
| REQ-01 | AC-01.2 | C-01, IF-02 | T-01 | `checks::test_f001_ac_01_2_content_unchanged` | Pass |
| REQ-01 | AC-01.3 | C-01, IF-02 | T-02 | `checks::test_f001_ac_01_3_project_rename_only_planned_changes` | Pass |
| REQ-02 | AC-02.1 | C-03 | T-03 | `checks::test_f001_ac_02_1_no_tracked_files_under_openspec` | Pass |
| REQ-02 | AC-02.2 | C-03 | T-03 | `checks::test_f001_ac_02_2_removed_files_remain_in_history` | Pass |
| REQ-03 | AC-03.1 | C-02, IF-01 | T-02 | `rename::test_behaviour_documents_are_renamed` | Pass |
| REQ-03 | AC-03.2 | C-02, IF-01 | T-02 | `rename::test_script_does_not_rename_itself`, `rename::test_non_utf8_file_is_skipped` | Pass |
| REQ-03 | AC-03.3 | C-02, IF-01, C-06 | T-02 | `checks::test_f001_ac_03_3_script_does_not_name_openspec` | Pass |
| REQ-04 | AC-04.1 | C-04 | T-03 | `checks::test_f001_ac_04_1_readme_start_steps` | Pass |
| REQ-04 | AC-04.2 | C-04 | T-03 | `checks::test_f001_ac_04_2_no_links_into_openspec` | Pass |
| REQ-05 | AC-05.1 | C-04, IF-02 | T-01 | `checks::test_f001_ac_05_1_catalogue_entry` | Pass |
| REQ-05 | AC-05.2 | C-04, IF-02 | T-01 | `checks::test_f001_ac_05_2_product_and_architecture_references` | Pass |
| REQ-05 | AC-05.3 | C-04 | T-01, T-03 | `checks::test_f001_ac_05_3_documentation_structure` | Pass |
| REQ-06 | AC-06.1 | C-03 | T-03 | `checks::test_f001_ac_06_1_dockerignore_entry_removed` | Pass |
| REQ-07 | AC-07.1 | C-04, C-06 | T-03 | `checks::test_f001_ac_07_1_closed_list_of_mentions` | Pass |
| REQ-08 | AC-08.1 | C-05, C-06 | T-04 | `checks::test_f001_ac_08_1_local_claude_md_updated` | Pass |

---

## 3. Qualities

| NFR | How it was verified | Target | Measured | Result |
|---|---|---|---|---|
| NFR-01 | Suite completa de backend sobre PostgreSQL desechable; `docker compose build backend`; frontend como comprobación adicional | Suite de backend en verde sobre un PostgreSQL que no sea de otro proyecto; `docker compose build backend` sin error | 87 de 87 en `127.0.0.1:55433`; build de la imagen correcto; frontend 24 de 24, lint limpio y build correcto | Pass |
| NFR-02 | `git log --follow` sobre los seis documentos de `docs/behaviour/`, y el test `checks::test_f001_nfr_02_history_traceable` | `git log --follow` muestra commits anteriores a la feature | Entre 2 y 4 commits por documento, con el primero anterior a la feature; el test pasa | Pass |

### 3.1 Unverified Qualities

Ninguna.

---

## 4. What Failed

Nada falló en esta run.

---

## 5. Limits

- **AC-08.1 depende de la máquina del mantenedor.** El test solo puede pasar donde existe el `CLAUDE.md` local, que no se versiona. En un clon limpio o en CI fallaría. Es lo que el criterio y el diseño (C-05) prevén, y el test no forma parte de la suite de backend.
- **Alcance del build de Docker.** Se construyó la imagen en un worktree temporal con un `backend/.env` de ejemplo, no con el `.env` del mantenedor, que no existe en esta copia de trabajo. No se ejecutó `docker compose up`, `/health`, la comprobación del usuario del contenedor ni la del puerto, por la razón registrada en `decisions.md`: la imagen no cambia y el 5432 es de otro proyecto.
- **Intento previo de build en el directorio principal.** El primer comando copió `backend/.example.env` a `backend/.env` en el directorio principal, antes de que una regla de permisos de la sesión denegara el acceso a esa ruta. Ese archivo, ignorado por git y con valores de ejemplo, se retiró enseguida, y el build se repitió en el worktree temporal. No quedó ningún `.env` ni cambio en el árbol.
- **Comprobaciones de texto.** AC-04.2 y AC-05.3 buscan cadenas, no resuelven enlaces. AC-07.1 acepta las coincidencias de `.sdd/roadmap.md` solo bajo el encabezado de RM-08.
- **Sin pruebas de UI ni de curl.** La feature no cambia ninguna interfaz ni ningún endpoint, así que no se ejecutaron E2E con Playwright ni pruebas con curl, y no se capturó ni restauró estado de la base de datos de la aplicación.
- **Comparaciones con el original.** AC-01.2 y AC-01.3 comparan con el commit `de1d8a0`, ignorando los finales de línea, porque en disco los archivos están en CRLF y en el índice en LF.

---

## 6. Maintenance Guidelines

This document records one Verify run. It is never edited after the run; the next run replaces it, with the next run number and the commit it checked.

- `result` is `pass` only when every check passes with no failure beyond the known ones, every acceptance criterion has a passing test, and every quality passes or is put to the human as unverified.
- Record what was observed. Never mark something as passing that was not run.

### Source of Truth

- This document is the canonical record of what the full check observed.
- The feature review judges the feature against the requirements, the design, and this evidence; its verdict is in its own review file.
- The requirements define the acceptance criteria and the qualities; this document never changes them.
