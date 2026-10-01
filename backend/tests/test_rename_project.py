import importlib.util
import json
import re
import shutil
import subprocess
from pathlib import Path
from types import ModuleType

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "rename_project.py"


def load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("rename_project", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


rename_project = load_script()

# Los nombres antiguos salen del script: si este archivo los escribiera, el script lo
# renombraría al crear un proyecto nuevo.
OLD_DISPLAY_NAME = rename_project.TEMPLATE_DISPLAY_NAME
OLD_IDENTIFIER = rename_project.TEMPLATE_IDENTIFIER
OLD_PACKAGE_NAME = rename_project.TEMPLATE_PACKAGE_NAME
OLD_VARIANTS = tuple(
    name.encode() for name in (OLD_DISPLAY_NAME, OLD_IDENTIFIER, OLD_PACKAGE_NAME)
)
DISPLAY_NAME = "Gestor Bibliográfico"
IDENTIFIER = "gestor_bibliografico"
PACKAGE_NAME_LINE = re.compile(r'^name = "([^"]+)"', re.MULTILINE)

ARCHIVED_FILE = "openspec/changes/archive/2026-01-01-old/proposal.md"
LATIN1_FILE = "docs/latin1.txt"
VARIANTS_FILE = "docs/variants.md"
EXCLUDED_FILES = (ARCHIVED_FILE, LATIN1_FILE, "scripts/rename_project.py")

TEMPLATE_FILES: dict[str, bytes] = {
    "README.md": f"# {OLD_DISPLAY_NAME}\n\nPlantilla.\n".encode(),
    "backend/.example.env": (
        f"APP_NAME={OLD_DISPLAY_NAME}\n"
        f"DATABASE_URL=postgresql+asyncpg://localhost:5432/{OLD_IDENTIFIER}\n"
    ).encode(),
    "backend/app/core/settings.py": b"\xef\xbb\xbf"
    + (
        f'app_name: str = "{OLD_DISPLAY_NAME}"\r\n'
        f'database_name = "{OLD_IDENTIFIER}"\r\n'
    ).encode(),
    "backend/pyproject.toml": f'[project]\r\nname = "{OLD_PACKAGE_NAME}"\r\n'.encode(),
    "backend/uv.lock": (
        f'version = 1\n\n[[package]]\nname = "{OLD_PACKAGE_NAME}"\n'
        'version = "0.1.0"\nsource = { virtual = "." }\n'
    ).encode(),
    "frontend/package.json": json.dumps(
        {"name": f"{OLD_PACKAGE_NAME}-frontend"},
        indent=2,
    ).encode(),
    "frontend/package-lock.json": json.dumps(
        {
            "name": f"{OLD_PACKAGE_NAME}-frontend",
            "packages": {"": {"name": f"{OLD_PACKAGE_NAME}-frontend"}},
        },
        indent=2,
    ).encode(),
    "frontend/index.html": f"<title>{OLD_DISPLAY_NAME}</title>\r\n".encode(),
    ARCHIVED_FILE: f"{OLD_DISPLAY_NAME}, {OLD_IDENTIFIER}, {OLD_PACKAGE_NAME}\n".encode(),
    LATIN1_FILE: f"{OLD_DISPLAY_NAME}, añadido en Latin-1\n".encode("latin-1"),
    VARIANTS_FILE: f"Intro\n{OLD_DISPLAY_NAME.title()}\n{OLD_IDENTIFIER.upper()}\n".encode(),
}


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        encoding="utf-8",
        check=True,
    )
    return result.stdout


def write_files(repo: Path, files: dict[str, bytes]) -> None:
    for relative, content in files.items():
        path = repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)


def commit_all(repo: Path, message: str) -> None:
    git(repo, "add", "--all")
    git(repo, "commit", "--quiet", "--no-verify", "-m", message)


def snapshot(repo: Path) -> dict[str, bytes]:
    return {
        path.relative_to(repo).as_posix(): path.read_bytes()
        for path in repo.rglob("*")
        if path.is_file() and ".git" not in path.relative_to(repo).parts
    }


def read_text(repo: Path, relative: str) -> str:
    return (repo / relative).read_text(encoding="utf-8")


@pytest.fixture()
def template_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    # Que git no suba hasta un repositorio que contenga tmp_path.
    monkeypatch.setenv("GIT_CEILING_DIRECTORIES", str(tmp_path))
    git(repo, "init", "--quiet")
    git(repo, "config", "user.name", "Test")
    git(repo, "config", "user.email", "test@example.com")
    git(repo, "config", "commit.gpgsign", "false")
    # Sin conversión de finales de línea: en disco quedan los bytes de TEMPLATE_FILES.
    git(repo, "config", "core.autocrlf", "false")
    write_files(repo, TEMPLATE_FILES)
    (repo / "scripts").mkdir()
    shutil.copyfile(SCRIPT_PATH, repo / "scripts" / "rename_project.py")
    commit_all(repo, "Plantilla")
    monkeypatch.chdir(repo)
    return repo


def test_renames_variants_and_lists_changed_files(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    env = read_text(template_repo, "backend/.example.env")
    package = json.loads(read_text(template_repo, "frontend/package.json"))
    pyproject = read_text(template_repo, "backend/pyproject.toml")
    assert read_text(template_repo, "README.md").startswith("# Gestor Bibliográfico\n")
    assert "APP_NAME=Gestor Bibliográfico\n" in env
    assert env.endswith(":5432/gestor_bibliografico\n")
    assert PACKAGE_NAME_LINE.findall(pyproject) == ["gestor-bibliografico"]
    assert package["name"] == "gestor-bibliografico-frontend"

    output = capsys.readouterr().out
    changed = [
        "README.md",
        "backend/.example.env",
        "backend/app/core/settings.py",
        "backend/pyproject.toml",
        "backend/uv.lock",
        "frontend/index.html",
        "frontend/package-lock.json",
        "frontend/package.json",
    ]
    assert f"Archivos modificados ({len(changed)}):" in output
    for relative in changed:
        assert f"  {relative}\n" in output


def test_no_old_variant_left_outside_exclusions(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    for relative, content in snapshot(template_repo).items():
        if relative in EXCLUDED_FILES:
            continue
        for variant in OLD_VARIANTS:
            assert variant not in content, f"{relative} contiene {variant!r}"


def test_lock_files_match_their_manifests(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    pyproject = read_text(template_repo, "backend/pyproject.toml")
    uv_lock = read_text(template_repo, "backend/uv.lock")
    package = json.loads(read_text(template_repo, "frontend/package.json"))
    package_lock = json.loads(read_text(template_repo, "frontend/package-lock.json"))
    assert PACKAGE_NAME_LINE.findall(uv_lock) == PACKAGE_NAME_LINE.findall(pyproject)
    assert package_lock["name"] == package["name"]
    assert package_lock["packages"][""]["name"] == package["name"]


def test_warns_about_unrecognized_variants(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert (template_repo / VARIANTS_FILE).read_bytes() == TEMPLATE_FILES[VARIANTS_FILE]
    output = capsys.readouterr().out
    assert "Aviso:" in output
    assert f"  {VARIANTS_FILE}:2: {OLD_DISPLAY_NAME.title()}\n" in output
    assert f"  {VARIANTS_FILE}:3: {OLD_IDENTIFIER.upper()}\n" in output


def test_keeps_utf8_line_endings_and_bom(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    name = DISPLAY_NAME.encode()
    assert (template_repo / "backend/app/core/settings.py").read_bytes() == (
        b'\xef\xbb\xbfapp_name: str = "' + name + b'"\r\n'
        b'database_name = "gestor_bibliografico"\r\n'
    )
    assert (template_repo / "frontend/index.html").read_bytes() == (
        b"<title>" + name + b"</title>\r\n"
    )
    readme = (template_repo / "README.md").read_bytes()
    assert readme == b"# " + name + b"\n\nPlantilla.\n"


def test_archived_changes_are_untouched(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert (template_repo / ARCHIVED_FILE).read_bytes() == TEMPLATE_FILES[ARCHIVED_FILE]


def test_script_does_not_rename_itself(template_repo: Path) -> None:
    script = template_repo / "scripts" / "rename_project.py"
    before = script.read_bytes()

    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert script.read_bytes() == before
    for variant in OLD_VARIANTS:
        assert variant in before


def test_non_utf8_file_is_skipped(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert (template_repo / LATIN1_FILE).read_bytes() == TEMPLATE_FILES[LATIN1_FILE]


def test_untracked_files_are_ignored(template_repo: Path) -> None:
    untracked = template_repo / "notes.txt"
    content = f"{OLD_DISPLAY_NAME}\n".encode()
    untracked.write_bytes(content)

    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert untracked.read_bytes() == content


@pytest.mark.parametrize(
    "identifier",
    ["Gestor-Bibliografico", "1gestor", "gestor-bibliografico", "gestor__x", "x_", ""],
)
def test_rejects_invalid_identifier(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
    identifier: str,
) -> None:
    before = snapshot(template_repo)

    assert rename_project.main([DISPLAY_NAME, identifier]) == 2

    assert snapshot(template_repo) == before
    assert "^[a-z][a-z0-9]*(_[a-z0-9]+)*$" in capsys.readouterr().err


def test_rejects_identifier_longer_than_25_characters(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    before = snapshot(template_repo)

    assert rename_project.main([DISPLAY_NAME, "a" * 26]) == 2

    assert snapshot(template_repo) == before
    assert "25 caracteres" in capsys.readouterr().err


def test_accepts_identifier_of_25_characters(template_repo: Path) -> None:
    assert rename_project.main([DISPLAY_NAME, "a" * 25]) == 0


@pytest.mark.parametrize(
    "display_name",
    [
        "",
        "   ",
        'Gestor "B"',
        "Gestor\\B",
        "<Gestor>",
        "A > B",
        "A & B",
        "Gestor {B}",
        "Gestor }",
        "A\tB",
        "A\nB",
    ],
)
def test_rejects_invalid_display_name(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
    display_name: str,
) -> None:
    before = snapshot(template_repo)

    assert rename_project.main([display_name, IDENTIFIER]) == 2

    assert snapshot(template_repo) == before
    assert "nombre visible" in capsys.readouterr().err


def test_rejects_wrong_number_of_arguments(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    before = snapshot(template_repo)

    assert rename_project.main([DISPLAY_NAME]) == 2

    assert snapshot(template_repo) == before
    assert "Uso:" in capsys.readouterr().err


@pytest.mark.parametrize("staged", [False, True])
def test_rejects_uncommitted_changes(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
    staged: bool,
) -> None:
    (template_repo / "README.md").write_bytes(
        f"# {OLD_DISPLAY_NAME}\n\nCambio.\n".encode(),
    )
    if staged:
        git(template_repo, "add", "README.md")
    before = snapshot(template_repo)

    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 1

    assert snapshot(template_repo) == before
    assert "cambios sin confirmar" in capsys.readouterr().err


def test_fails_outside_git_repository(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    folder = tmp_path / "no-repo"
    folder.mkdir()
    content = f"# {OLD_DISPLAY_NAME}\n".encode()
    (folder / "README.md").write_bytes(content)
    monkeypatch.setenv("GIT_CEILING_DIRECTORIES", str(tmp_path))
    monkeypatch.chdir(folder)

    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 1

    assert (folder / "README.md").read_bytes() == content
    assert "repositorio git" in capsys.readouterr().err


def test_already_renamed_project_has_nothing_to_change(
    template_repo: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0
    commit_all(template_repo, "Renombrado")
    capsys.readouterr()
    before = snapshot(template_repo)

    assert rename_project.main([DISPLAY_NAME, IDENTIFIER]) == 0

    assert snapshot(template_repo) == before
    assert "No hay nada que cambiar" in capsys.readouterr().out
