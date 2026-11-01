---
artifact: review
feature: F001
kind: task
target: task/001-T-04@2b96076
sources: [plan.md@1, requirements.md@1, design.md@3, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/001-T-04@2b96076, round 1

> Revisión independiente de T-04 (diff `1570490..2b96076`). Juzga el cambio contra el plan, los requisitos y el diseño, no contra la explicación de su autor.

---

## 2. Findings

### R1-01: el test AC-08.1 depende de un archivo local que no existe fuera de la máquina del mantenedor (minor)

- **Where:** `specs/001-retirar-openspec/checks/test_acceptance.py`, `test_f001_ac_08_1_local_claude_md_updated`.
- **What is wrong:** `CLAUDE.md` está ignorado por git, así que en un clon limpio o en CI el test falla en `assert claude_md.is_file()`. Es el comportamiento que pide el diseño (C-05, "On failure": no se crea el archivo y la comprobación falla), por lo que no bloquea. Conviene que Verify y Release sepan que este test solo es válido en el directorio principal del mantenedor.
- **Evidence:** plan T-04, "Technical requirements" y design.md C-05 y sección 8.
- **Recommended fix:** Ninguno en el código. Dejar constancia en la evidencia de Verify de que AC-08.1 se ejecuta en el directorio principal, y que un clon no lo reproduce.
- **Severity:** minor

No hay otros hallazgos. Comprobado:

- **Delivers AC-08.1:** el test localiza `CLAUDE.md` con `git rev-parse --path-format=absolute --git-common-dir` (padre del directorio común), falla si falta, y comprueba las cuatro condiciones del plan: sin `openspec` (sin distinguir mayúsculas), `git check-ignore` lo reconoce, no está en `git ls-files`, y no aparece en `git diff --name-only BASE...HEAD`. Lleva el ID `F001:AC-08.1` en el docstring. Fallaría si la línea volviera o el archivo desapareciera.
- **Within the task:** el diff toca solo `specs/001-retirar-openspec/checks/test_acceptance.py` (16 líneas añadidas, ninguna borrada). Un solo commit, sin restos ni dependencias.
- **Worktree:** la tarea se hizo en un worktree enlazado (`git worktree list` lo muestra bajo `.claude/worktrees/`), como exige C-05.
- **CLAUDE.md local, comprobación de solo lectura en el directorio principal:** 0 coincidencias de `openspec` (`grep -ic`); `git ls-files CLAUDE.md` vacío; `git check-ignore -v` lo atribuye a `.gitignore:28`. Tiene 176 líneas.
- **Nada más perdido:** sin imprimir el archivo entero, se revisó el contexto del punto de edición (líneas 150 a 176). La lista de la sección "SDD / sdd-kit" conserva sus cuatro viñetas (features, estándares, agentes, skills propias) y la siguiente línea en blanco, y la subsección "El agente ejecuta las pruebas" y la sección "NO hacer" están completas y coinciden con el texto de las instrucciones cargadas al inicio de la sesión, que tenían la línea de `openspec/` como viñeta adicional tras las skills propias. Esa es la única diferencia observada, coherente con 177 a 176 líneas. No hay copia previa del archivo para un diff exacto, y por eso esta comparación es contextual, no byte a byte.
- **Tests:** ejecutado `specs/001-retirar-openspec/checks/test_acceptance.py` en el worktree de la tarea (HEAD 2b96076, árbol limpio): 15 passed.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 1 (R1-01)
- **Converging:** Yes (ronda 1)
- **Limits of this review:** Se ejecutó el archivo de comprobaciones de aceptación en el worktree de la tarea (15 passed). No se ejecutó la suite de backend con PostgreSQL: el diff solo añade un test que no usa la base de datos ni código de la aplicación. La integridad del resto de `CLAUDE.md` se comprobó por contexto y no byte a byte, al no existir copia previa. La revisión no fue ejecutada por quien produjo el trabajo, y no recibió su razonamiento.

### 3.1 What Should Be Kept

- Comprobación del contrato de C-05 con las cuatro condiciones, incluida la de no aparecer en el diff.
- Cambio mínimo: un único test, sin tocar nada más en git.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas van en `task-T-04-r1-answers.md`.
