---
artifact: review-answers
feature: F003
kind: feature
target: feature/003-limite-login-tras-proxy@14b4cc5
review: feature-r1.md
round: 1
---

# Respuestas a feature-r1

- R1-01: rejected as a fix task: no es bloqueante y el README subestima lo observado sin contradecirlo (evidence/README.md 3.2). Document reescribe ambas viñetas con lo observado en la run 1 (`/16` y `no-es-una-ip`); queda anotado en `decisions.md`, sección 4.
- R1-02: pending the human (H-06): aceptar el procedimiento ejecutado como prueba de AC-01.1 a AC-03.2, o abrir una tarea que lo automatice.
- R1-03: fixed (`evidence/README.md`, esta revisión y estas respuestas se commitean juntas en el checkpoint de Verify).
- R1-04: rejected as a fix task: no es bloqueante y el README no la contradice; la frase viene del diseño (IF-01) y la evidencia la declara no probada (3.2, 5). Document añade "según el diseño; no se ha ejecutado con el 8000 cerrado"; queda anotado en `decisions.md`, sección 4.
