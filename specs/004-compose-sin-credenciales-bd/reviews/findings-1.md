---
artifact: review
feature: F004
kind: findings
target: requirements.md@1
sources: [brief.md@1, requirements.md@1]
round: 1
verdict: changes-required
---

# Review: requirements.md@1, hallazgos del diseño (findings-1)

> Hallazgos levantados por Design contra los requisitos, fuera de una ronda de revisión. Ningún requisito se ha cambiado: se revisan en Define con la aprobación del mantenedor.

---

## 2. Findings

### R1-01: AC-02.1 y AC-02.2 no se pueden cumplir tal como están escritos con `docker compose up`

- **Severity:** Blocking
- **Where:** requirements.md#AC-02.1, requirements.md#AC-02.2 (y, por referencia, REQ-02)
- **What is wrong:** Los dos criterios exigen que, ante una contraseña de menos de 16 caracteres o igual a `postgres`, el comando termine con error, «no se crea ningún contenedor ni el volumen» y el mensaje nombre la variable e indique el mínimo. Ningún mecanismo de Compose cumple las tres cosas a la vez:
  1. La interpolación de Compose (`${VAR:?mensaje}`) solo comprueba que la variable esté definida y no vacía. No mide la longitud ni compara con un valor.
  2. Una comprobación dentro de Compose (un servicio previo que falla, o la comprobación en el arranque de PostgreSQL) sí puede medir y rechazar, pero Compose crea antes todos los contenedores y el volumen, y solo después arranca el servicio que falla.
- **Evidence:** Ejecutado el 2026-11-02 con Docker Compose v5.4.0 (probe en el scratchpad, ya borrado):
  - `${PW:?msg}` rechaza sin definir y vacío, con mensaje propio y sin crear nada; con `PW=abc` acepta. Las formas `${PW#patrón}` y `${PW/#patrón/x}` se rechazan como formato de interpolación inválido.
  - Con un servicio `preflight` que sale con código 1 si la longitud es < 16 y un servicio `db` que depende de él (`service_completed_successfully`): `docker compose up` termina con código 1 y muestra el mensaje en español del servicio, pero deja `preflight-1` (Exited 1), `db-1` (Created, nunca arrancado), el volumen `probe_data` y la red creados.
- **Recommended fix:** Revisar los requisitos en Define (`sdd-define`, revisión de requisitos aprobados), con una de estas opciones (ver H-05): (A) mantener el rechazo por longitud y por `postgres` dentro de Compose y reformular los criterios para que digan lo que sí se puede garantizar (ningún servicio de la aplicación ni la base llega a arrancar; el volumen queda sin inicializar); (B) dejar en Compose solo «definida y no vacía» y mover los mínimos a la documentación; (C) mantener (B) en Compose y añadir un script multiplataforma que valide antes de lanzar Compose.

---

## 3. Verdict

- **Verdict:** Changes required
- **Blocking findings:** 1 (R1-01)
- **Minor findings:** 0
- **Converging:** Yes
- **Limits of this review:** Solo se probó Docker Compose v5.4.0 en Windows. REQ-01, AC-01.1 y AC-01.2 (sin definir y vacía) sí se pueden cumplir con la interpolación nativa y no están afectados.

---

## 4. Maintenance Guidelines

Este archivo no se cambia una vez escrito. Las respuestas, en `findings-1-answers.md`.
