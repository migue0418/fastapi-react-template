---
artifact: review
feature: F002
kind: design
target: design.md@1
sources: [brief.md@1, requirements.md@1, decisions.md, .sdd/constitution.md, .sdd/stack.yaml, .sdd/architecture.md, .sdd/product.md]
round: 1
verdict: approve
---

# Review: design.md@1, round 1

> Records one independent review round: the findings about the target, judged against the sources it was built from, and the verdict.

---

## 2. Findings

### R1-01: AC-01.3 y "antes de aceptar peticiones" no tienen una verificación definida

- **Severity:** Minor
- **Where:** design.md#7 (Qualities), design.md#11 (T-01), design.md#9.1 (Ubicación de los tests)
- **What is wrong:** AC-01.1 y AC-01.3 hablan de "arrancar la aplicación" (con la base ya con el administrador, o sin responder). El diseño solo describe tests que construyen `Settings(_env_file=None)`; no dice cómo se verifica que el fallo ocurre al importar `app.main`, ni que no depende de la base. La sección 7 solo detalla la verificación de los NFR; ningún apartado indica cómo se demuestra AC-01.3.
- **Evidence:** design.md#9.1: "los tests de `Settings` no necesitan la base"; design.md#7 no menciona AC-01.3. `backend/app/main.py` ejecuta `create_app()` al importar y `get_settings()` tiene `lru_cache`, así que un test en proceso que importe `app.main` sería frágil.
- **Recommended fix:** Declarar en el diseño o en el plan cómo se prueba AC-01.3 (por ejemplo, un test de `Settings` con `DATABASE_URL` inalcanzable más la comprobación manual en Verify arrancando `uvicorn` con y sin administrador en la base), o justificar que basta la ausencia de acceso a la base en el validador.

### R1-02: `docs/behaviour/auth.md` figura en el impacto documental pero no en el diseño

- **Severity:** Minor
- **Where:** design.md#3 (C-02), design.md#11, design.md#12; decisions.md sección 4
- **What is wrong:** decisions.md sección 4 lista `docs/behaviour/` como documentación a revisar ("si hay una spec de despliegue o configuración, recoger el nuevo rechazo"). El diseño no lo menciona: ni como alcance de Document ni como descartado. Hoy `docs/behaviour/auth.md:130` cita `ADMIN_PASSWORD`.
- **Evidence:** `grep` de `ADMIN_PASSWORD` en `docs/behaviour/auth.md` (línea 130); el diseño solo nombra README y `.sdd/`.
- **Recommended fix:** Añadir una línea al diseño (11 o 12) que diga qué se hace con `docs/behaviour/` (lo alinea Document, o no aplica y por qué).

### R1-03: AC-05.2 no tiene tarea

- **Severity:** Minor
- **Where:** design.md#11, design.md#12 (Coverage gaps)
- **What is wrong:** La comprobación de la regla "cada criterio de aceptación lo entrega una tarea" tiene una excepción, AC-05.2, entregado por la fase Document. Es coherente (los archivos de `.sdd/` solo cambian en Document, y la desviación está declarada) pero requiere que el mantenedor la acepte expresamente.
- **Evidence:** design.md#12: "Es la única desviación de la regla «cada criterio, una tarea», y se somete a la aprobación del mantenedor". REQ-05 es `Should`.
- **Recommended fix:** Ninguno en el diseño; que el mantenedor lo confirme al aprobar. No bloquea.

---

## 3. Verdict

- **Verdict:** Approve
- **Blocking findings:** 0
- **Minor findings:** 3 (R1-01, R1-02, R1-03)
- **Converging:** Yes (primera ronda)
- **Limits of this review:** No se ejecutó la suite de tests ni se arrancó la aplicación; no se inspeccionó el Dockerfile ni los workflows de CI. Se verificó con una sonda de solo lectura que, con pydantic 2.13 y `ENVIRONMENT=production`, el `ValidationError` actual incluye `input_value` con `admin_password: 'ChangeMe123!'` y que `hide_input_in_errors=True` en el `model_config` de una subclase de `Settings` lo elimina. También se comprobó con `grep` que ningún test ni código de `backend/` fija `ENVIRONMENT` ni consulta el formato del error. La revisión se hizo desde los archivos, sin el razonamiento del autor.

### 3.1 What Should Be Kept

- La sonda de pydantic y la opción `hide_input_in_errors=True` en `Settings`: el diseño detecta una fuga que los requisitos (AC-02.2, NFR-01) no preveían y que hoy afecta también a `SECRET_KEY`.
- Un único validador y una constante compartida, sin tocar la base ni añadir dependencias (CON-02, CON-03).

---

## 4. Maintenance Guidelines

This file is never changed once written. Answers go in `design-r1-answers.md`.
