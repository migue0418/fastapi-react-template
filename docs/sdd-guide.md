# Guía SDD paso a paso

Cómo implementar una feature con el flujo de Spec-Driven Development de esta plantilla, con los
comandos exactos y prompts reales que puedes copiar en Claude Code. Incluye cómo empezar en un
proyecto nuevo o en uno con código ya existente.

> Resumen del ciclo (perfil core de OpenSpec):
>
> ```
> (explorar) → /opsx:propose → /opsx:apply → PR → /opsx:archive
> ```

---

## 0. Requisitos previos (una vez)

1. Instala el CLI de OpenSpec, que requiere Node.js 20.19.0 o superior
   ([instalación](https://github.com/Fission-AI/OpenSpec/blob/main/docs-lab/start/installation.md)):

   ```powershell
   npm install -g @fission-ai/openspec@latest
   ```

2. Desde la raíz del repo, genera los comandos `/opsx:*` y las skills `openspec-*` de Claude Code
   ([openspec init](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md#openspec-init)):

   ```powershell
   openspec init --tools claude
   ```

   Respeta el `openspec/config.yaml` que ya existe. Los archivos que genera no se versionan.
3. Reinicia Claude Code para que aparezcan los comandos `/opsx:*`.
4. Comprueba que el CLI responde: `openspec list`.

Después de actualizar el CLI, `openspec update` regenera esos comandos y skills
([openspec update](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md#openspec-update)).
Solo actúa sobre las herramientas ya configuradas: en un clon sin los comandos generados responde
"No configured tools found", y entonces hay que usar `openspec init --tools claude`.

---

## 1. Cómo empezar

### 1.A Proyecto nuevo (creado desde esta plantilla)

Sigue [Empezar un proyecto nuevo](../README.md#empezar-un-proyecto-nuevo) en el README: renombrado,
`backend/.env`, qué hacer con `openspec/specs/` y `openspec/changes/archive/`, y los comandos de OpenSpec.

El contexto del stack ya está en [openspec/config.yaml](../openspec/config.yaml), así que las propuestas
nacen sabiendo que es FastAPI por slices y React por slices.

### 1.B Proyecto con código ya existente

Dos casos:

- Nació de la plantilla y ya tiene features: usa el ciclo normal (sección 2) cambio a cambio.
  Opcionalmente, crea un *baseline* de specs de lo que ya existe (recomendado, ver más abajo).
- Proyecto distinto que adopta este SDD: copia `openspec/config.yaml` y `docs/*-standards.md`, instala
  el CLI y ejecuta `openspec init --tools claude`, que crea `openspec/specs/` y `openspec/changes/` y
  respeta el `config.yaml` copiado. Después edita [openspec/config.yaml](../openspec/config.yaml) y
  `docs/*-standards.md` para que describan el stack real de ese proyecto.

Baseline de specs (opcional pero recomendado en proyectos con código): captura el comportamiento
actual para tener contra qué comparar los deltas. Prompt de ejemplo:

> Genera el spec OpenSpec del comportamiento ACTUAL de la feature `users` a partir del código en
> `backend/app/features/users/`. Escríbelo en `openspec/specs/users/spec.md` con requisitos y
> escenarios Given/When/Then. No cambies código.

No es obligatorio: también puedes empezar a proponer cambios directamente; los specs se rellenan al archivar.

---

## 2. El ciclo de un cambio (con ejemplo: “CRUD de products solo para admin”)

### Paso 1: explorar (opcional)

Úsalo si la idea es difusa o viene de un ticket:

> /opsx:explore
>
> Quiero añadir gestión de productos (listar, crear, editar, borrar) accesible solo por admin.
> Ayúdame a aclarar alcance, dudas y casos límite antes de proponer el cambio.

### Paso 2: crear la propuesta

Genera el cambio con sus artefactos (`proposal.md`, `specs/`, `design.md`, `tasks.md`):

> /opsx:propose añadir CRUD de products (id, sku, nombre, precio, activo) bajo /api/products, solo admin

Resultado: `openspec/changes/add-products/` con los 4 artefactos. El `tasks.md` ya incluye los pasos
obligatorios (rama, pytest, curl, Playwright, lint/test/build, PR) porque las reglas de
[openspec/config.yaml](../openspec/config.yaml) remiten a [docs/verification-guide.md](verification-guide.md).

Revisa y ajusta los artefactos si hace falta antes de seguir:

> Revisa `openspec/changes/add-products/specs/` y añade un escenario para el caso de SKU duplicado (409).

### Paso 3: implementar

> /opsx:apply add-products

Esto:
- Lee los artefactos del cambio.
- Ejecuta las tareas de `tasks.md` en orden: crea la rama `feature/add-products`, escribe los tests y
  el agente ejecuta él mismo `uv run pytest -q`, las pruebas de endpoints con `curl`, el E2E con
  Playwright MCP y `npm run lint/test/build`, como pide [docs/verification-guide.md](verification-guide.md).
- Marca las tareas de `tasks.md` solo cuando las pruebas pasan.

Si a mitad descubres que el diseño estaba mal, edita el artefacto (`design.md` o `specs/`) y continúa.
Si surge un fix después de apply y antes de archive, primero actualiza los artefactos OpenSpec (regla 6
de [docs/base-standards.md](base-standards.md)); no parchees código a pelo.

### Paso 4: pull request

Abre el PR con [`gh pr create`](https://cli.github.com/manual/gh_pr_create). En la descripción, resume
el cambio y la verificación hecha (el informe de `openspec/changes/add-products/reports/`):

> Abre el PR del cambio `add-products` con `gh pr create`. Resume el cambio y la verificación del informe de `reports/`.

### Paso 5: archivar

> /opsx:archive add-products

Fusiona los deltas de `openspec/changes/add-products/specs/` en `openspec/specs/products/` y mueve el
cambio a `openspec/changes/archive/`. A partir de aquí, `openspec/specs/` refleja el nuevo comportamiento.

---

## 3. Comandos CLI útiles (terminal)

```powershell
openspec list                       # cambios activos
openspec show add-products          # ver un cambio
openspec status --change add-products   # progreso de artefactos
openspec validate --all             # validar specs/cambios
openspec new change <nombre>        # crear el andamiaje de un cambio desde la terminal
```

---

## 4. Checklist mental por feature

1. (Opcional) `/opsx:explore`.
2. `/opsx:propose` → artefactos creados y revisados.
3. `/opsx:apply` → implementación y verificación según `docs/verification-guide.md`, que ejecuta el agente.
4. `gh pr create` → PR.
5. `/opsx:archive` → specs fusionadas.

Ver también: [docs/development_guide.md](development_guide.md), [docs/verification-guide.md](verification-guide.md),
[docs/base-standards.md](base-standards.md).
