R1-01: fixed (design.md@2): C-01 indica que todo `$` del shell va como `$$` en el YAML; T-01 lo prueba con el guion final (rechazo de 15 y aceptación de 16).
R1-02: fixed (design.md@2): C-01 mide con `printf %s "$VAR" | wc -m`, que cuenta caracteres; comprobado con la imagen `postgres:15` (15 `ñ` dan 15 con `wc -m` y 30 con `${#VAR}`). REQ-02 se cumple tal como está escrito; ASM-06 pasa a Confirmed y T-01 lo repite.
R1-03: fixed (design.md@2): el caso `-d` se prueba en T-01 con constancia en la evidencia, y la nota va en el inicio rápido del README (C-05).
R1-04: fixed (design.md@2): C-04 describe la verificación de AC-06.1 a AC-06.4 y el test primero sin PostgreSQL (`monkeypatch.delenv`, `asyncpg.connect` no se llama).
R1-05: fixed (design.md@2): C-05 usa `\password` interactivo de `psql`, avisa de que `down -v` destruye los datos y deja la comprobación del reinicio del backend en AC-07.2.
R1-06: fixed (design.md@2): C-05 incluye «Desarrollo local» con la nota de añadir la contraseña a `DATABASE_URL`.
