---
artifact: review
feature: F004
kind: task
target: task/004-T-01@dae46a6
sources: [plan.md@1, requirements.md@2, design.md@2, .sdd/constitution.md, .sdd/stack.yaml]
round: 1
verdict: approve
---

# Review: task/004-T-01@dae46a6, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.

---

## 2. Findings

Diff reviewed: `git diff feature/004-compose-sin-credenciales-bd...task/004-T-01` (4 files: `docker-compose.yml`, `.example.env` new, `backend/.example.env`, `.gitignore`). Exactly the files of the plan's T-01; nothing outside them.

### R1-01: El mensaje de rechazo por variable ausente o vacía sale tres veces

- **Severity:** Minor
- **Where:** `docker-compose.yml:17`, `:25`, `:52`
- **What is wrong:** Con la variable sin definir o vacía, Compose imprime tres líneas `error while interpolating ...` (backend, postgres, postgres-check), cada una con el mismo texto en español. Es ruido para el mantenedor. El criterio se cumple (nombra la variable y dice dónde y cómo definirla).
- **Evidence:** Salida real de `docker compose -p rev-f004-t01 up` sin `.env`: tres líneas distintas solo en el nombre del servicio. `design.md@2`, 9.1, ya elige el mismo mensaje en los tres usos para evitar la advertencia extra, así que es una consecuencia aceptada del diseño.
- **Recommended fix:** Ninguna obligatoria. Si se quiere, dejar constancia en la evidencia de Verify de que el mensaje aparece varias veces.

### R1-02: Los casos de Compose se ejecutaron desde Git Bash en Windows, no desde PowerShell

- **Severity:** Minor
- **Where:** `plan.md@1`, T-01 (NFR-02)
- **What is wrong:** Esta revisión no puede afirmar el resultado desde PowerShell ni desde Linux (NFR-02). Que sea idéntico es muy probable, porque la validación ocurre en Compose y en un contenedor Linux, pero no se ha comprobado aquí.
- **Evidence:** Todas las ejecuciones de esta revisión usaron Git Bash sobre Docker Desktop (Compose v5.4.0).
- **Recommended fix:** Que Verify ejecute los casos de SC-02 en PowerShell y declare Linux como no verificado si no hay entorno (como pide NFR-02 y el plan).

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 2 (R1-01, R1-02)
- **Converging:** Yes (primera ronda)
- **Limits of this review:**
  - Ejecutado con proyecto `rev-f004-t01`, en una copia de trabajo propia (`git worktree` en el directorio temporal), con contraseñas de prueba y la cadena `CANARIO-F004-...`. Todo destruido con `down -v`, `.env` y `backend/.env` temporales borrados, y el worktree eliminado.
  - Resultados por criterio (ejecutados):
    - AC-01.1: sin `.env` ni variable, código 1, ningún contenedor ni volumen del proyecto, mensaje en español con la variable. Cumple.
    - AC-01.2: `POSTGRES_PASSWORD=` vacía, mismo resultado. Cumple.
    - AC-02.1: 15 caracteres, código 1; `postgres-check` sale con 1, `postgres` y `backend` quedan `Created`, volumen vacío (0 entradas, sin `PG_VERSION`); el mensaje indica el mínimo de 16. Con `-d` el comando devuelve `didn't complete successfully` y el mensaje está en `docker compose logs postgres-check`. Cumple.
    - AC-02.2: valor `postgres`, mismo rechazo con mensaje. Cumple.
    - AC-02.3 y AC-03.1: 16 caracteres exactos, volumen nuevo, `docker compose up --build`; backend y postgres sanos, `GET /health` 200 con `{"status":"ok"}`. Con la contraseña correcta, `psql` desde la red de Compose conecta; con `postgres` falla la autenticación. Cumple. (Dentro del contenedor, `127.0.0.1` es `trust` por el initdb de la imagen: comportamiento normal de la imagen, no un fallo. Probé la autenticación por la red de Compose, no por el puerto publicado del anfitrión.)
    - AC-04.1: la contraseña solo estaba en el `.env` de la raíz; `backend/.env` era la copia de `backend/.example.env` (sin contraseña). El backend conecta y queda sano. Cumple.
    - AC-02.4: tras el rechazo de 15, cambiar a 22 caracteres y `docker compose up --build -d` sin borrar nada: stack sano, `/health` 200, la contraseña nueva acepta. Cumple.
    - AC-05.1: ningún `postgres:postgres` ni contraseña con valor en `docker-compose.yml`, `.example.env` ni `backend/.example.env`. Cumple.
    - AC-05.2: `.example.env` copiado a `.env` sin editar: rechazo como AC-01.1. Cumple.
    - NFR-01: la cadena `CANARIO-F004-...` no aparece en la salida de los casos de 15 caracteres, de la variable vacía y del caso por entorno de shell (0 apariciones). Solo el caso `postgres` contiene la palabra, porque el propio mensaje y los nombres de servicio la usan, y no es un secreto. Cumple.
    - NFR-02: parcial; ver R1-02. Se probó además una contraseña no ASCII de 15 caracteres (`ñ`), rechazada con mensaje.
  - `docker compose config -q` con un valor de prueba: válido (el `:?` con texto largo no rompe el YAML).
  - `test_settings.py` y `test_rename_project.py`: 47 pasan sobre la rama (no usan base de datos). No se ejecutó la suite completa, que es T-02 y el merge.
  - El puerto 127.0.0.1:5432 lo ocupó un contenedor ajeno (`f004-merge-pg`) durante parte de la revisión; no se tocó. Una ejecución de AC-02.4 falló por ello y se repitió con el puerto libre. Hubo además una ejecución en segundo plano mía que se solapó con otra y obligó a repetir pasos; no afecta a los resultados finales, que son de ejecuciones limpias.
  - No se probó Linux. No se revisó el README (es T-03).

### 3.1 What Should Be Kept

- `postgres-check` con `entrypoint: ["sh", "-c"]` y guion en línea con `$$`: funciona tal como lo diseñó C-01 y mide en caracteres con `wc -m`.
- El mismo mensaje con `:?` en los tres usos, sin la advertencia extra.
- El alcance de la rama se limita a los cuatro archivos de la tarea; usuario, base, healthcheck, puerto y volumen no cambian.
- El comentario de `backend/.example.env` explica por qué la URL no lleva contraseña.

---

## 4. Maintenance Guidelines

This file is never changed once written.

- The answers go in `task-T-01-r1-answers.md`, one line per finding.
