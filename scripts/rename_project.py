"""Renombra un proyecto creado desde la plantilla.

Uso, desde la raíz del repositorio:

    uv run python scripts/rename_project.py "Gestor Bibliográfico" gestor_bibliografico
"""

# Fuera de backend/ no hay pyproject.toml y uv run puede elegir cualquier Python instalado.
from __future__ import annotations

import re
import subprocess
import sys
import unicodedata
from pathlib import Path

TEMPLATE_DISPLAY_NAME = "FastAPI Template"
TEMPLATE_IDENTIFIER = "fastapi_template"
TEMPLATE_PACKAGE_NAME = "fastapi-template"

SCRIPT_PATH = "scripts/rename_project.py"
EXCLUDED_PREFIXES = ("openspec/changes/archive/",)

IDENTIFIER_PATTERN = re.compile(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)*")
# Los tests crean bases <identificador>_test_<32 hex> y PostgreSQL trunca a 63 bytes.
IDENTIFIER_MAX_LENGTH = 25
# El nombre visible va entre comillas dobles en settings.py, sin comillas en
# .example.env, en el <title> de index.html y como texto JSX en tres componentes.
FORBIDDEN_DISPLAY_CHARS = frozenset('"\\<>&{}')
LEFTOVER_PATTERN = re.compile(r"fastapi[ _-]?template", re.IGNORECASE)
LEFTOVER_PREVIEW_LENGTH = 120

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_USAGE = 2

USAGE = 'Uso: uv run python scripts/rename_project.py "Nombre visible" identificador'
HELP = f"""Renombra un proyecto creado desde la plantilla.

{USAGE}

  Nombre visible  el que muestran la app y el README (por ejemplo, "Gestor Bibliográfico").
  identificador   minúsculas, dígitos y guiones bajos (por ejemplo, gestor_bibliografico).
                  Es el nombre de la base de datos; con guiones, el de los paquetes.

Reemplaza las variantes del nombre de la plantilla en los archivos versionados, salvo en
openspec/changes/archive/ y en este script. El repositorio no puede tener cambios sin
confirmar en archivos versionados."""


class RenameError(Exception):
    pass


def validate_arguments(display_name: str, identifier: str) -> list[str]:
    errors = []
    if not display_name.strip():
        errors.append("el nombre visible no puede estar vacío.")
    elif any(
        char in FORBIDDEN_DISPLAY_CHARS or unicodedata.category(char) == "Cc"
        for char in display_name
    ):
        errors.append(
            "el nombre visible no puede contener comillas dobles, barra invertida, "
            "<, >, &, llaves ni caracteres de control.",
        )
    if not IDENTIFIER_PATTERN.fullmatch(identifier):
        errors.append(
            "el identificador debe cumplir ^[a-z][a-z0-9]*(_[a-z0-9]+)*$: empieza por "
            "una letra minúscula y solo lleva minúsculas, dígitos y guiones bajos "
            "sueltos entre palabras (por ejemplo, gestor_bibliografico).",
        )
    elif len(identifier) > IDENTIFIER_MAX_LENGTH:
        errors.append(
            f"el identificador no puede pasar de {IDENTIFIER_MAX_LENGTH} caracteres: "
            "los tests crean bases de datos <identificador>_test_<32 caracteres "
            "hexadecimales> y PostgreSQL no admite nombres de más de 63 bytes.",
        )
    return errors


def build_replacements(display_name: str, identifier: str) -> dict[str, str]:
    return {
        TEMPLATE_DISPLAY_NAME: display_name,
        TEMPLATE_IDENTIFIER: identifier,
        TEMPLATE_PACKAGE_NAME: identifier.replace("_", "-"),
    }


def run_git(args: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            encoding="utf-8",
            errors="surrogateescape",
            check=False,
        )
    except FileNotFoundError as exc:
        raise RenameError("no se encuentra git en el PATH.") from exc


def find_repo_root(cwd: Path) -> Path:
    result = run_git(["rev-parse", "--show-toplevel"], cwd)
    if result.returncode != 0:
        raise RenameError(
            "no estás dentro de un repositorio git. Ejecuta el script desde la raíz "
            "del proyecto.",
        )
    return Path(result.stdout.strip())


def ensure_clean_worktree(root: Path) -> None:
    result = run_git(["status", "--porcelain", "--untracked-files=no"], root)
    if result.returncode != 0:
        raise RenameError(f"git status ha fallado: {result.stderr.strip()}")
    if result.stdout.strip():
        raise RenameError(
            "hay cambios sin confirmar en archivos versionados. Confírmalos o "
            "descártalos antes de renombrar, para poder revisar el resultado con "
            "git diff.",
        )


def list_candidate_files(root: Path) -> list[str]:
    result = run_git(["ls-files", "-z"], root)
    if result.returncode != 0:
        raise RenameError(f"git ls-files ha fallado: {result.stderr.strip()}")
    return [
        relative
        for relative in result.stdout.split("\0")
        if relative
        and relative != SCRIPT_PATH
        and not relative.startswith(EXCLUDED_PREFIXES)
    ]


def prepare_changes(
    root: Path,
    files: list[str],
    replacements: dict[str, str],
) -> tuple[dict[str, bytes], dict[str, str]]:
    # Un solo patrón para que un reemplazo no vuelva a reemplazarse con otra variante.
    pattern = re.compile("|".join(re.escape(old) for old in replacements))
    changes: dict[str, bytes] = {}
    texts: dict[str, str] = {}
    for relative in files:
        path = root / relative
        if path.is_symlink() or not path.is_file():
            continue
        try:
            original = path.read_bytes()
        except OSError as exc:
            raise RenameError(f"no se puede leer {relative}: {exc}") from exc
        try:
            text = original.decode("utf-8")
        except UnicodeDecodeError:
            continue
        # Trabajar en bytes conserva los finales de línea y el BOM.
        new_text = pattern.sub(lambda match: replacements[match.group(0)], text)
        texts[relative] = new_text
        if new_text != text:
            changes[relative] = new_text.encode("utf-8")
    return changes, texts


def write_changes(root: Path, changes: dict[str, bytes]) -> None:
    for relative, content in changes.items():
        try:
            (root / relative).write_bytes(content)
        except OSError as exc:
            raise RenameError(
                f"no se puede escribir {relative}: {exc}. Deshaz lo que se haya "
                "escrito con git checkout .",
            ) from exc


def find_leftovers(texts: dict[str, str]) -> list[str]:
    leftovers = []
    for relative, text in texts.items():
        for number, line in enumerate(text.split("\n"), start=1):
            if LEFTOVER_PATTERN.search(line):
                preview = line.strip()[:LEFTOVER_PREVIEW_LENGTH]
                leftovers.append(f"{relative}:{number}: {preview}")
    return leftovers


def print_report(changed_files: list[str], leftovers: list[str]) -> None:
    if changed_files:
        print(f"Archivos modificados ({len(changed_files)}):")
        for relative in changed_files:
            print(f"  {relative}")
        print("Revisa el resultado con git diff. Para deshacerlo: git checkout .")
    else:
        print(
            "No hay nada que cambiar: ningún archivo versionado contiene el nombre "
            "de la plantilla.",
        )
    if leftovers:
        print()
        print(
            "Aviso: quedan variantes del nombre de la plantilla que el script no "
            "reconoce. Revísalas a mano:",
        )
        for leftover in leftovers:
            print(f"  {leftover}")


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args in (["-h"], ["--help"]):
        print(HELP)
        return EXIT_OK
    if len(args) != 2:
        print(USAGE, file=sys.stderr)
        print(
            "Error: hacen falta dos argumentos, el nombre visible y el identificador.",
            file=sys.stderr,
        )
        return EXIT_USAGE

    display_name, identifier = args
    errors = validate_arguments(display_name, identifier)
    if errors:
        print(USAGE, file=sys.stderr)
        for error in errors:
            print(f"Error: {error}", file=sys.stderr)
        return EXIT_USAGE

    try:
        root = find_repo_root(Path.cwd())
        ensure_clean_worktree(root)
        files = list_candidate_files(root)
        changes, texts = prepare_changes(
            root,
            files,
            build_replacements(display_name, identifier),
        )
        write_changes(root, changes)
    except RenameError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return EXIT_ERROR

    print_report(list(changes), find_leftovers(texts))
    return EXIT_OK


if __name__ == "__main__":
    # En Windows, con la salida redirigida a una tubería, Python usa la página de
    # códigos ANSI y falla con caracteres que no están en ella.
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
