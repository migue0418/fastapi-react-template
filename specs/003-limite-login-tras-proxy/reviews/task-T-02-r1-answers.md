# Respuestas a task-T-02-r1

- R1-01: fixed (el registro no dice si hubo recreación entre las dos filas de S1 y ese dato no consta; no se inventa. Se añadió una nota en S1 que lo declara y pide a Verify repetir la segunda fila recreando el servicio antes).
- R1-02: rejected: el bucle con `X-Forwarded-For` y el script Python del segundo contenedor no constan en el registro de la ejecución; reconstruirlos sería inventar lo ejecutado. Es un hallazgo menor y no bloqueante; Verify repite la ejecución con la plantilla de `curl` y la descripción ya recogidas, y la aproximación del plan.
- R1-03: fixed (la fila de NFR-01 dice ahora "nada declarado no verificado de AC-01.1, AC-02.1 y AC-02.3").
