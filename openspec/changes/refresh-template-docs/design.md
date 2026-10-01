## Context

Estado verificado en `main` (d99c94a):

- **Capa de Claude fuera del repo.** Desde el PR #5, `CLAUDE.md` y `.claude/` son configuración local del autor.
  - Los 8 archivos de OpenSpec que había en `.claude/` (`commands/opsx/*` y `skills/openspec-*`) son idénticos, salvo los finales de línea, a los que genera `openspec init --tools claude` con el CLI 1.3.1. Quien clona puede regenerarlos.
  - No se regeneran los 3 agentes, `.claude/rules/openspec-tasks-mandatory-steps.md`, `enrich-us`, `write-pr-report` ni `CLAUDE.md`.
- **Referencias a esa capa en archivos versionados**, por número de líneas que la citan:
  - `docs/SDD steps.md`: 31, porque describe el flujo con agentes de principio a fin;
  - `docs/development_guide.md`: 11;
  - `docs/base-standards.md`: 8;
  - `docs/verification-guide.md`: 6;
  - `README.md`: 6;
  - `openspec/config.yaml`: 5;
  - `docs/documentation-standards.md`: 3.
- **`openspec/config.yaml`:**
  - `rules.tasks` manda leer `.claude/rules/openspec-tasks-mandatory-steps.md`.
  - `rules.design` exige el plan técnico con agentes.
  - El contexto aún recomienda `selectinload` para relaciones, lo que contradice `docs/backend-standards.md` desde el cambio 3.
- **La regla local repite lo versionado.** Casi todo `.claude/rules/openspec-tasks-mandatory-steps.md` ya está en `docs/verification-guide.md` y en `rules.tasks`. Lo único propio son el plan técnico con agentes y la skill `write-pr-report`.
- **Estilo:** unas 34 rayas y 57 pares de negritas en `README.md` y `docs/*.md`, algunas en encabezados (`## 1. Backend — tests`).
- **`TEST_DATABASE_ADMIN_URL`:**
  - `backend/tests/test_api.py` la lee con `os.getenv` y tiene un valor por defecto.
  - `backend/.example.env` la incluye y el README dice que se configura en `.env`.
  - Puesta solo en `.env`, se ignora sin avisar.
- **Nombre de la plantilla.** Aparece en 18 líneas de 13 archivos con solo tres cadenas:
  - "FastAPI Template", el nombre visible;
  - "fastapi_template", la base de datos y el prefijo `fastapi_template_test_` de los tests;
  - "fastapi-template", los paquetes, incluidos `uv.lock`, `package-lock.json` y "fastapi-template-frontend".
  
  Fuera de esos archivos solo aparece en `openspec/changes/archive/`.

## Goals / Non-Goals

**Goals:**
- Que los archivos versionados no dependan de nada que no esté en el repo.
- Una sola fuente versionada para los pasos de verificación: `docs/verification-guide.md`.
- Docs sin rayas para incisos ni negritas decorativas.
- Renombrar un proyecto nuevo con un solo comando.

**Non-Goals:**
- Copiar las reglas de estilo a los docs. Viven en el `CLAUDE.md` local del autor.
- Que los tests lean `TEST_DATABASE_ADMIN_URL` de `.env`. Solo se corrige la documentación.
- Cambiar el comportamiento del backend o del frontend.
- Modificar `openspec/changes/archive/` o `openspec/specs/`.
- Versionar de nuevo cualquier parte de `.claude/`.

## Decisions

### Frontera: OpenSpec versionado, capa de Claude local

Los docs describen el ciclo explore, propose, apply y archive con el CLI de OpenSpec, y explican que `/opsx:*` y las skills `openspec-*` se generan con `openspec init --tools claude`. Desaparecen las menciones a `CLAUDE.md`, a los agentes, a `.claude/rules`, a `enrich-us`, a `write-pr-report` y al plan técnico con agentes.

Alternativas descartadas:
- Mencionar la capa local como opcional: documenta algo que el lector no puede conseguir.
- Sacar todo el flujo SDD de los docs: `openspec/` seguiría versionado sin nada que lo explique.

Qué cambia en cada documento:

| Documento | Cambio |
|---|---|
| `README.md` | Sección SDD con el ciclo de OpenSpec y cómo generar los comandos. Fuera la línea de skills y agentes. Enlace a `docs/sdd-guide.md`. |
| `docs/SDD steps.md` → `docs/sdd-guide.md` | `git mv`. El ciclo sin el paso del plan técnico con agentes. El PR se abre con `gh` sin skill. El arranque de un proyecto nuevo remite a la sección del README. |
| `docs/development_guide.md` | El ciclo sin agentes. Fuera la sección "Agentes y skills de apoyo" y las dos reglas que citan `.claude/`. |
| `docs/base-standards.md` | Fuera las referencias a `CLAUDE.md` y a `.claude/skills` y `.claude/agents`. |
| `docs/verification-guide.md` | Deja de citar `.claude/rules`. Recoge lo que solo estaba en la regla local y no depende de agentes: rama `feature/<cambio>` como paso 0, revisar los tests afectados, baseline y restauración de la BD, informe en `openspec/changes/<cambio>/reports/`, y marcar una tarea solo tras ejecutarla y verificarla. El PR se abre con `gh`. La referencia a `TEST_DATABASE_ADMIN_URL` en `.example.env` pasa a la variable de entorno. |
| `.gitignore` | El comentario de `tmp/` deja de citar la skill `enrich-us`. |
| `docs/documentation-standards.md` | Fuera la mención a `CLAUDE.md` y a los agentes como destinatarios. |

### `openspec/config.yaml` autocontenido

- `rules.tasks` remite a `docs/verification-guide.md` en lugar de a `.claude/rules`, y el paso final es abrir el PR con `gh`, sin skill.
- `rules.design` pierde la regla del plan técnico con agentes.
- En el contexto, la línea de `repository.py` pasa a decir lo mismo que `docs/backend-standards.md`: la carga de relaciones la define el modelo, y `selectinload` solo se usa para relaciones que el modelo no carga.

Consecuencia para el autor: esas reglas dejan de inyectarse en los artefactos. Siguen vigentes porque están en su `CLAUDE.md` y en su `.claude/rules` locales, que Claude Code carga en cada sesión.

### Estilo

- Las rayas de inciso pasan a paréntesis, a dos puntos o a frases separadas, según el caso. En los encabezados se usan dos puntos: `## 1. Backend: tests`.
- Se quitan las negritas decorativas, incluidas las etiquetas de las listas (`**Backend**:` pasa a `Backend:`).
- Las flechas (`→`) de los diagramas y las listas de pasos no son rayas y se mantienen.
- Afecta a `README.md`, a todos los `docs/*.md` y a los comentarios y textos de `openspec/config.yaml`. No se reescribe el contenido técnico más allá de lo que piden las decisiones anteriores.

### `TEST_DATABASE_ADMIN_URL`, solo documentación

- Sale de `backend/.example.env`.
- El README la añade a la tabla de variables y explica que es una variable de entorno de la shell que lanza `pytest`, con su valor por defecto (`postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres`, comprobado en `backend/tests/test_api.py`).

Alternativa descartada: leerla desde `Settings` o cargar `.env` en los tests. Es un cambio de código que el autor descartó.

### Script `scripts/rename_project.py`

Uso, desde la raíz:

```
uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico
```

Funcionamiento:

1. Valida los argumentos, según la spec `project-rename`:
   - El identificador debe cumplir `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`: sirve sin comillas como nombre de base de datos en PostgreSQL y, con guiones, como nombre de paquete de Python y de npm.
   - El identificador tiene como máximo 25 caracteres. Los tests crean bases `<identificador>_test_<32 hex>`, y PostgreSQL trunca los identificadores a 63 bytes ([identificadores](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)).
   - El nombre visible no puede estar vacío ni contener `"`, `\`, `<`, `>`, `&`, `{`, `}` ni caracteres de control. Va dentro de una cadena de Python en `settings.py`, sin comillas en `.example.env`, en el `<title>` de `index.html` y como texto JSX en `AppShell.tsx`, `Sidebar.tsx` y `LoginPage.tsx`, donde las llaves rompen la compilación (comprobado con `tsc`).
   - En `.example.env`, python-dotenv corta el valor en ` #` y expande `${...}`. No se prohíben: solo afectan a ese archivo de ejemplo.
   - Los argumentos se leen a mano y no con `argparse`, porque los textos fijos de `argparse` salen en inglés. Los caracteres de control se detectan con `unicodedata`.
2. Sitúa la raíz con `git rev-parse --show-toplevel` y exige que no haya cambios sin confirmar en archivos versionados (`git status --porcelain --untracked-files=no`). Así el resultado se revisa con `git diff` y se deshace con `git checkout .`.
3. Recorre `git ls-files -z`, excluyendo `openspec/changes/archive/` y el propio script.
4. Lee cada archivo en bytes y lo decodifica como UTF-8 estricto. Si falla, lo salta.
5. Hace los tres reemplazos sobre el texto y lo vuelve a codificar en UTF-8. Al trabajar en bytes se conservan los finales de línea y el BOM, si lo hay.
6. Calcula todos los contenidos nuevos antes de escribir ninguno, y luego los escribe. Así un error de validación o de lectura no deja el repo a medias.
7. Lista los archivos modificados. Después busca sin distinguir mayúsculas `fastapi[ _-]?template` y avisa con archivo y línea de las variantes que no ha cambiado.

Detalles:
- Solo librería estándar (`pathlib`, `re`, `subprocess`, `unicodedata`). Sin dependencias nuevas.
- Va en `scripts/` en la raíz, porque toca backend y frontend. `uv run python` funciona en la raíz aunque no haya `pyproject.toml`: usa el intérprete por defecto de uv.
- Los docs no escriben las tres cadenas de forma literal (salvo el título del README, que sí debe renombrarse). Si lo hicieran, el script reescribiría también la explicación de sí mismo.

Alternativas descartadas:
- Una lista de archivos en el README: hay que mantenerla al día.
- Centralizar el nombre en variables: los paquetes y los locks se siguen editando a mano.
- Un comando de PowerShell: en PowerShell 5.1, `Set-Content` escribe en ANSI y rompe las tildes.

### Test del script

`backend/tests/test_rename_project.py`, porque `backend/` es el único sitio con pytest:

- Carga el script con `importlib.util.spec_from_file_location` desde `../scripts/rename_project.py`.
- Cada test crea un repo git temporal en `tmp_path` con archivos que imitan los casos de la spec: LF y CRLF, tildes, un archivo no UTF-8, `openspec/changes/archive/` y una variante no reconocida.
- No usa PostgreSQL ni las fixtures de `test_api.py`.
- No escribe las variantes del nombre: las toma de las constantes del script. Si las escribiera, el script lo renombraría al crear un proyecto nuevo (comprobado en un clon: un archivo más y tres avisos).

### Sección "Empezar un proyecto nuevo" del README

Cinco pasos:

1. Crear el repo desde la plantilla y ejecutar el script.
2. Copiar la configuración local de Claude Code (`CLAUDE.md` y `.claude/`), si se tiene, porque no viaja con el repo.
3. Crear `backend/.env` desde `.example.env`, con un `SECRET_KEY` y un `ADMIN_PASSWORD` nuevos.
4. Decidir si se conservan `openspec/specs`, que describen lo que el proyecto nuevo hereda (auth, deployment, health, roles y users), y `openspec/changes/archive`, que es el historial de la plantilla.
5. Si no se copió `.claude/`, generar los comandos de OpenSpec con `openspec init --tools claude`.

El paso 2 solo dice que esa configuración es local y hay que copiarla. No describe su contenido (agentes, reglas, skills), que sigue fuera de los docs.

### Capas de backend y frontend

No hay cambios en routers, services, repositories, modelos ni en el frontend. No hay migraciones Alembic ni modelos que registrar en `import_model_modules`.

## Risks / Trade-offs

- [Una variante del nombre que el script no reconoce] → El aviso posterior a los reemplazos la lista con archivo y línea.
- [Cambiar el nombre a mano en `uv.lock` y `package-lock.json`] → Los dos lados cambian a la vez. La verificación lo comprueba en un clon temporal con `uv lock --check` y regenerando el lock de npm (`npm install --package-lock-only`) sin que cambie nada más.
- [Alguien más usa la plantilla y echa de menos los agentes] → El autor es el único usuario, y lo aceptó al dejar de versionar `.claude/`.
- [Enlaces externos a `docs/SDD steps.md`] → Solo los tiene el `CLAUDE.md` local del autor, que se actualiza en una tarea local.
- [Las reglas de agentes dejan de inyectarse desde `config.yaml`] → Las cubren el `CLAUDE.md` y la regla local del autor.

## Migration Plan

No hay migración. Rollback: revertir el commit. La tarea local (la ruta de la guía en `CLAUDE.md`) se deshace a mano.

## Open Questions

Ninguna.
