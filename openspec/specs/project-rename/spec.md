# project-rename Specification

## Purpose

Renombrado de un proyecto creado desde la plantilla con `scripts/rename_project.py`: sustituye el nombre de la plantilla por el del proyecto nuevo en los archivos versionados con un solo comando.

Esta spec no escribe las variantes del nombre de la plantilla de forma literal: si lo hiciera, el script la reescribiría al renombrar un proyecto. Las variantes son las constantes `TEMPLATE_DISPLAY_NAME`, `TEMPLATE_IDENTIFIER` y `TEMPLATE_PACKAGE_NAME` del script.

## Requirements
### Requirement: Renombrado del proyecto desde la plantilla
El script `scripts/rename_project.py` MUST recibir un nombre visible y un identificador en minúsculas con guiones bajos, y MUST reemplazar en los archivos versionados (`git ls-files`) las tres variantes del nombre de la plantilla:

- el nombre visible de la plantilla (`TEMPLATE_DISPLAY_NAME`) por el nombre visible;
- su identificador con guiones bajos (`TEMPLATE_IDENTIFIER`) por el identificador;
- su nombre de paquete con guiones (`TEMPLATE_PACKAGE_NAME`) por el identificador con guiones en lugar de guiones bajos.

#### Scenario: Renombrado de un proyecto recién creado
- **GIVEN** un repositorio recién creado desde la plantilla, sin cambios pendientes
- **WHEN** se ejecuta `uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico` desde la raíz
- **THEN** el nombre visible pasa a "Gestor Bibliográfico", el de la base de datos a "gestor_bibliografico" y los nombres de paquete a "gestor-bibliografico" (y "gestor-bibliografico-frontend")
- **AND** ningún archivo versionado fuera de las exclusiones contiene ya ninguna de las tres variantes antiguas
- **AND** el script lista los archivos modificados y termina con código 0

#### Scenario: Archivos del lock coherentes
- **GIVEN** un repositorio recién creado desde la plantilla
- **WHEN** se ejecuta el renombrado
- **THEN** `backend/pyproject.toml` y `backend/uv.lock` tienen el mismo nombre de paquete
- **AND** `frontend/package.json` y `frontend/package-lock.json` tienen el mismo nombre de paquete

#### Scenario: Variantes que el script no reconoce
- **GIVEN** un archivo versionado con una variante del nombre de la plantilla distinta de las tres, por ejemplo con otras mayúsculas o en mayúsculas con guion bajo
- **WHEN** se ejecuta el renombrado
- **THEN** el script no la cambia, pero la lista como aviso con archivo y línea para revisarla a mano

#### Scenario: Codificación y finales de línea
- **GIVEN** archivos versionados en UTF-8, con finales de línea LF o CRLF
- **WHEN** el nombre visible lleva tildes
- **THEN** los archivos modificados siguen en UTF-8, con las tildes intactas y los mismos finales de línea que tenían

### Requirement: Exclusiones del renombrado
El script MUST dejar sin modificar `openspec/changes/archive/`, el propio script y los archivos versionados que no sean texto UTF-8.

#### Scenario: Historial de cambios intacto
- **GIVEN** cambios archivados en `openspec/changes/archive/` que mencionan el nombre de la plantilla
- **WHEN** se ejecuta el renombrado
- **THEN** esos archivos no cambian

#### Scenario: El script no se modifica a sí mismo
- **WHEN** se ejecuta el renombrado
- **THEN** `scripts/rename_project.py` sigue conteniendo las tres variantes antiguas

#### Scenario: Archivos que no son texto
- **GIVEN** un archivo versionado que no se puede decodificar como UTF-8
- **WHEN** se ejecuta el renombrado
- **THEN** el archivo no cambia y el script no falla

### Requirement: Validación de la entrada
El script MUST validar los argumentos y el estado del repositorio antes de modificar ningún archivo, y ante un error MUST terminar con un código distinto de 0 sin tocar nada.

#### Scenario: Identificador no válido
- **WHEN** el identificador no cumple `^[a-z][a-z0-9]*(_[a-z0-9]+)*$` (por ejemplo "Gestor-Bibliografico" o "1gestor")
- **THEN** el script explica el formato esperado, termina con código distinto de 0 y no modifica ningún archivo

#### Scenario: Identificador demasiado largo
- **WHEN** el identificador tiene más de 25 caracteres
- **THEN** el script explica que las bases de datos de test (`<identificador>_test_<32 caracteres hexadecimales>`) superarían los 63 bytes que admite PostgreSQL, termina con código distinto de 0 y no modifica ningún archivo

#### Scenario: Nombre visible no válido
- **WHEN** el nombre visible está vacío o contiene comillas dobles, barra invertida, `<`, `>`, `&`, llaves o caracteres de control
- **THEN** el script lo rechaza, termina con código distinto de 0 y no modifica ningún archivo

#### Scenario: Cambios sin confirmar
- **GIVEN** un repositorio con cambios sin confirmar en archivos versionados
- **WHEN** se ejecuta el renombrado
- **THEN** el script pide confirmarlos o descartarlos antes, termina con código distinto de 0 y no modifica ningún archivo

#### Scenario: Fuera de un repositorio git
- **WHEN** se ejecuta el script fuera de un repositorio git
- **THEN** termina con código distinto de 0 y un mensaje que lo indica

#### Scenario: Proyecto ya renombrado
- **GIVEN** un repositorio donde no queda ninguna de las tres variantes fuera de las exclusiones
- **WHEN** se ejecuta el renombrado
- **THEN** el script indica que no hay nada que cambiar y termina con código 0

