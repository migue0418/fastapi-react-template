---
artifact: review
feature: F004
kind: task
target: task/004-T-03@645228b
sources: [plan.md@1#T-03, requirements.md@2#AC-07.1-AC-07.3, design.md@2#C-05, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/004-T-03@645228b, round 1

> Records one independent review round. Never changed once written; answers go in `task-T-03-r1-answers.md`.

---

## 2. Findings

### R1-01: La nota sobre `-d` es inexacta cuando la contraseña falta o está vacía

- **Severity:** Minor
- **Where:** `README.md:38`
- **What is wrong:** Dice que, si falta o no cumple el mínimo, con `docker compose up -d` el mensaje no sale por pantalla y hay que leerlo con `docker compose logs postgres-check`. Solo es cierto cuando la contraseña existe pero es corta o es `postgres`. Si falta o está vacía, Compose rechaza la interpolación antes de crear nada, imprime el mensaje en pantalla incluso con `-d` y no existe contenedor `postgres-check` cuyos logs leer.
- **Evidence:** Ejecutado con `-p rev-f004-t03`. Con `POSTGRES_PASSWORD=short` y `up -d`, la pantalla solo muestra `service "postgres-check" didn't complete successfully: exit 1`, y el mensaje en español está en `logs postgres-check`. Con `POSTGRES_PASSWORD=` y `up -d`, la pantalla muestra `required variable POSTGRES_PASSWORD is missing a value: Falta POSTGRES_PASSWORD. Defínela en el archivo .env de la raíz...`.
- **Recommended fix:** Acotar la nota al caso «demasiado corta o igual a `postgres`», y decir que si falta o está vacía el mensaje sale directamente.

### R1-02: El paso 3 de «Empezar un proyecto nuevo» solo menciona `backend/.env`

- **Severity:** Minor
- **Where:** `README.md:22`
- **What is wrong:** Esa lista de pasos para un proyecto nuevo no menciona el `.env` de la raíz con `POSTGRES_PASSWORD`, ahora obligatorio para Compose. Quien la siga sin pasar por «Inicio rápido» llegará a un rechazo de Compose. Añadir una referencia es una mejora, no algo que la tarea (plan.md@1#T-03, puntos 1 a 4) pida, por eso es menor.
- **Evidence:** `README.md:22` solo habla de `backend/.env`; el `.env` de la raíz aparece desde la línea 30.
- **Recommended fix:** Si el mantenedor lo quiere, añadir en el paso 3 una frase que remita a «Inicio rápido (Docker)». Puede tratarse como cambio posterior.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2
- **Converging:** Yes (ronda 1)
- **Limits of this review:** Es independiente: el revisor no produjo el trabajo ni vio el razonamiento del autor. No se ejecutó `\password` de forma interactiva porque la sesión no tiene terminal. Se sustituyó por `ALTER USER postgres PASSWORD ...` enviado a `psql` por la entrada estándar, lo que prueba el efecto (el volumen conserva la contraseña antigua, el backend no conecta y se recupera tras el cambio) pero no la interacción de `\password`. La comprobación de AC-07.3 usó la forma `export` (shell bash); el bloque de PowerShell no se ejecutó, aunque solo cambia la sintaxis de la asignación. No se probó en Linux ni macOS. Los comandos se siguieron desde la rama, no desde un clon limpio de GitHub.

### 3.1 What Should Be Kept

- Ningún valor de contraseña en el README: solo `<contraseña>` como marcador. No hay `postgres:postgres` en `README.md`, `docker-compose.yml`, `.example.env` ni `backend/.example.env`. Lo único con valor es `ChangeMe123!` (`ADMIN_PASSWORD`), que ya estaba y no es la contraseña de la base.
- Los nombres de variable y comandos coinciden con lo construido (`POSTGRES_PASSWORD`, `postgres-check`, servicio `postgres`, usuario `postgres`, puerto `127.0.0.1:5432`, `TEST_DATABASE_ADMIN_URL` con esquema `postgresql+asyncpg://`).
- Está en español, solo toca `README.md` y no toca `docs/` ni `.sdd/`.
- La advertencia de que `down -v` destruye los datos, y la nota sobre `\password` para no escribir la contraseña en la línea de comandos.

---

## 4. Maintenance Guidelines

This file is never changed once written. Answers go in `task-T-03-r1-answers.md`.
