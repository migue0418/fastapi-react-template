---
artifact: review
feature: F001
kind: task
target: task/001-T-03@dd19456
sources: [plan.md@1, requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/001-T-03@dd19456, round 1

> Revisión independiente de T-03 (diff `08c8de7..dd19456`). Juzga el cambio contra el plan, los requisitos y el diseño, no contra la explicación de su autor.

---

## 2. Findings

### R1-01: `.sdd/architecture.md` 10.1 no recoge `docs/behaviour/` (minor)

- **Where:** `.sdd/architecture.md`, sección 10.1.
- **What is wrong:** El plan (T-03, paso 5) pide quitar la línea de la carpeta heredada "y añadir `docs/behaviour/` si la sección no lo recoge". La sección solo lista `docs/`: estándares y guías, sin mencionar el contrato de comportamiento. AC-05.2 se cumple por las referencias de otras secciones, así que no bloquea.
- **Evidence:** `git show dd19456:.sdd/architecture.md`, 10.1, última línea: "`docs/`: estándares y guías."
- **Recommended fix:** Ampliar esa línea, por ejemplo "`docs/`: estándares, guías y `docs/behaviour/` (contrato de comportamiento)".
- **Severity:** minor

No hay otros hallazgos. Comprobado:

- **AC-02.1 / AC-02.2:** `git ls-files openspec` está vacío en `dd19456`. `openspec/config.yaml` sigue disponible en `de1d8a0` y este es antecesor de `HEAD`. Solo se borran archivos de `openspec/` (35 ficheros, solo eliminaciones); no se reescribe historial.
- **AC-04.1:** el paso 4 del README sustituye al 5 y nombra `docs/behaviour/` como entrada del onboarding, sin `openspec`. El test acota la sección "Empezar un proyecto nuevo" y comprueba ambas condiciones.
- **AC-04.2:** el test recorre `README.md` y todos los `docs/**/*.md` y exige que no aparezca `openspec/`. Es más estricto que mirar los enlaces.
- **AC-05.3:** `docs/documentation-standards.md` ya incluía `docs/behaviour/` (T-01); `development_guide.md` cambia la nota heredada por el puntero a `docs/behaviour/` y no menciona `openspec`.
- **AC-06.1 y `.dockerignore`:** la línea `openspec` se retira y `docs` sigue en el archivo; el test lee las líneas efectivas (sin comentarios) y exige `docs` exacto. Comprobado a mano en `dd19456`: `docs` sigue presente.
- **AC-07.1:** `git grep -niI` sobre `dd19456` solo devuelve coincidencias en `.sdd/constitution.md:255`, `.sdd/roadmap.md` (líneas 24 a 29, bajo `### RM-08`) y `specs/001-retirar-openspec/`. El test usa `git grep` (solo versionados), localiza el encabezado `###` más cercano y falla ante cualquier otra coincidencia, así que no pasa por casualidad. Observación menor sin hallazgo: la excepción de `constitution.md` admite cualquier línea del archivo, como dice el criterio ("en la excepción de `.sdd/constitution.md`").
- **Dentro de la tarea:** los archivos cambiados son exactamente los del plan (`openspec/`, `.dockerignore`, `README.md`, `docs/development_guide.md`, `.sdd/architecture.md`, el archivo de comprobaciones). El README solo cambia el paso 4/5. Todos los tests nuevos llevan su ID `F001:` en el docstring.
- **Seguridad y restos:** sin secretos, sin código de depuración, sin dependencias nuevas.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 1 (R1-01)
- **Converging:** Yes (ronda 1)
- **Limits of this review:** Se ejecutó en un clon local en `dd19456`: `specs/001-retirar-openspec/checks/test_acceptance.py` (14 passed); suite completa de backend con `TEST_DATABASE_ADMIN_URL` en el puerto 55432 (87 passed); `docker compose build backend` con una copia temporal de `backend/.example.env` como `backend/.env`, solo en el clon (build correcto). No se ejecutó `docker compose up`, ni lint de frontend, ni los tests de frontend (la tarea no los toca). No se comprobaron enlaces web externos. La revisión no fue ejecutada por quien produjo el trabajo, y no recibió su razonamiento.

### 3.1 What Should Be Kept

- Tests de AC-07.1 y AC-06.1 que fallarían ante una regresión real (coincidencia nueva o `docs` retirado de `.dockerignore`).
- Borrado limitado a `openspec/`, sin tocar el historial.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas van en `task-T-03-r1-answers.md`.
