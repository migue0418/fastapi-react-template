---
artifact: review-answers
feature: F003
kind: task
target: task/003-T-03
review: task-T-03-r1.md
round: 1
---

# Respuestas a task-T-03-r1

- R1-01: fixed (README: la lista separada por comas y la regla "primera no confiada por la derecha de `X-Forwarded-For`" quedan marcadas como "según la documentación de uvicorn" y no ejecutadas; son afirmaciones del diseño (ASM-06), no del registro de T-02).
- R1-02: fixed (tabla de correspondencia entre afirmaciones del README y escenarios de `evidence/t02-comprobacion-proxy.md` abajo; el commit de esta ronda lo referencia).
- R1-03: fixed (README: el primer punto empieza por "En Compose, sin esa variable ..." y remite al último punto para la ejecución fuera de Compose).

## Correspondencia afirmación a escenario

| Afirmación del README | Respaldo |
|---|---|
| Sin variable, clientes tras el proxy comparten cupo (login, token, refresh) | S1 (429 en el intento 11); token y refresh en S2 |
| Con variable, cada cliente tiene su cupo | S2 |
| Valor IP o CIDR | S2 (IP), S4 (/31) |
| Valor más estrecho; gateway en Docker Desktop | Sección Entorno y línea de access log (ASM-05) |
| Conexión fuera de la lista no elige su IP | S3, S4 |
| Con `*` se puede falsificar la IP (host y otro contenedor) | S5 |
| Red amplia, valor mal escrito, ejecución local | No verificado (registro) / diseño RISK-03, RISK-04, H-04 |
| Lista con comas, regla de la derecha | No verificado; diseño ASM-06 y documentación de uvicorn |
| `backend/.env`, `.example.env`, `env_file` | `docker-compose.yml` y `backend/.example.env` |
