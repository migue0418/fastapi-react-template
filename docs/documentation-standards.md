# Estándares de documentación

Cómo mantener la documentación técnica de la plantilla. Estos `docs/` son la referencia versionada que
viaja con el template y que alimenta el flujo SDD.

## Estructura

- `docs/base-standards.md`: principios y puntero al resto.
- `docs/backend-standards.md`, `docs/frontend-standards.md`: estándares por área.
- `docs/development_guide.md`: arrancar/trabajar + flujo SDD.
- `docs/data-model.md`: entidades base.
- `docs/verification-guide.md`: cómo validar un cambio.
- `docs/behaviour/`: contrato detallado del comportamiento actual, un documento por área.
- `docs/documentation-standards.md`: este documento.

(`docs/superpowers/` queda fuera de control de versiones; es material local.)

## Cuándo actualizar (obligatorio)

Actualiza la doc afectada dentro del mismo cambio cuando:
- Cambie un contrato de API (endpoints, request/response).
- Cambie el modelo de datos (nueva entidad/campo/relación) → actualiza `data-model.md`.
- Cambie la arquitectura o una convención → actualiza `*-standards.md`.
- Cambien comandos o el flujo de trabajo → actualiza `development_guide.md` / `verification-guide.md`.

En una feature SDD, esto forma parte de la fase Document (`/sdd-kit:sdd-document`).

## Estilo

- Español, claro y conciso. Prioriza ejemplos reales del codebase sobre teoría.
- No dupliques: si algo vive en un estándar, enlázalo en vez de copiarlo.
- Si estos `docs/` y el código no coinciden, manda el código real.
- Evita documentar lo obvio; documenta el *porqué* y las invariantes no evidentes.

## Relación con SDD

- `.sdd/` guarda el contexto de todo el proyecto, y `specs/NNN-<slug>/` la especificación de cada feature
  (fuente de verdad del *qué*).
- Estos `docs/` describen cómo construimos (stack, patrones, convenciones).
- Si una feature altera convenciones o arquitectura, refleja también el *cómo* aquí durante la fase Document.
