# Estándares base

Reglas de desarrollo de este proyecto, aplicables a cualquier agente IA y a la persona desarrolladora.
Es la referencia versionada que viaja con la plantilla.

## 1. Principios

- Pasos pequeños, uno a uno. Cambios incrementales y enfocados; evita modificaciones grandes y mezcladas.
- TDD donde aporte. Empieza por tests que fallan para nueva funcionalidad, según el detalle de la tarea.
- Tipado. Backend con type hints y Pydantic; frontend con TypeScript estricto.
- Nombres claros y descriptivos para variables, funciones y archivos.
- Cuestiona supuestos y detecta patrones repetidos antes de abstraer (3 líneas parecidas mejor que una abstracción prematura).
- No metas funcionalidad de más ni manejo de errores para escenarios imposibles. Valida en los bordes (entrada de usuario, APIs externas).

## 2. Idioma

- Mensajes de usuario y `detail` de errores en español (coherente con el código actual del template).
- Identificadores de código en inglés (variables, funciones, clases, módulos).
- Documentación del proyecto: español.

## 3. Estándares específicos

- [Estándares de backend](./backend-standards.md): FastAPI async por slices, datos, auth, tests, seguridad.
- [Estándares de frontend](./frontend-standards.md): React 19 + Vite por slices, cliente HTTP, UI, estado.
- [Guía de desarrollo](./development_guide.md): cómo arrancar y trabajar en local / Docker.
- [Modelo de datos](./data-model.md): entidades base (usuarios, roles, auth).
- [Guía de verificación](./verification-guide.md): comandos para validar un cambio de punta a punta.
- [Estándares de documentación](./documentation-standards.md): cómo mantener estos docs.
- [Comportamiento](./behaviour/): contrato detallado del comportamiento actual, un documento por área.

## 4. Skills de SDD

- El plugin `sdd-kit` aporta las skills de SDD (`/sdd-kit:sdd-*`). Se instala aparte; ver la
  [guía de desarrollo](./development_guide.md#flujo-sdd-con-sdd-kit).
- Cuando una petición encaje con una de esas skills, cárgala y síguela antes de continuar.

## 5. Modelo de planificación (opcional pero recomendado)

Los flujos de planificación (`/sdd-kit:sdd-define`, `/sdd-kit:sdd-design`) rinden mejor con un
modelo de razonamiento alto. Si tu setup lo soporta, usa Opus para planificar y un modelo más rápido
para ejecutar tareas mecánicas.

## 6. Actualizar artefactos SDD antes que parchear código

Si aparece un nuevo ajuste/fix durante una feature, trátalo primero como actualización de especificación,
no como "arreglo rápido". La especificación aprobada es la fuente de verdad. Orden:

1. Actualiza los artefactos afectados de `specs/NNN-<slug>/` (`brief.md`, `requirements.md`, `design.md`,
   `plan.md`). No añadas "bugfixes" sueltos: los problemas bloqueantes de Verify vuelven a Build como
   tareas de corrección.
2. Si cambia la intención, el alcance o el enfoque aprobado, vuelve a pedir la aprobación humana.
3. Implementa el código solo cuando los artefactos reflejen la nueva petición.
4. Re-verifica contra los artefactos actualizados antes de abrir el PR.
