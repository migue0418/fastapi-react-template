"""Comprobaciones de aceptación de F001 (retirar OpenSpec).

No usan PostgreSQL. Comparan con el commit base de la feature.
"""

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = "de1d8a0"
AREAS = ["auth", "deployment", "health", "project-rename", "roles", "users"]
BEHAVIOUR = ROOT / "docs" / "behaviour"


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return result.stdout


def base_text(path: str) -> str:
    return git("show", f"{BASE}:{path}").replace("\r\n", "\n")


def disk_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n")


def test_f001_ac_01_1_six_areas_present():
    """F001:AC-01.1"""
    present = sorted(p.stem for p in BEHAVIOUR.glob("*.md"))
    assert present == sorted(AREAS)


def test_f001_ac_01_2_content_unchanged():
    """F001:AC-01.2"""
    for area in AREAS:
        if area == "project-rename":
            continue
        original = base_text(f"openspec/specs/{area}/spec.md")
        assert disk_text(BEHAVIOUR / f"{area}.md") == original, area


def test_f001_ac_05_1_catalogue_entry():
    """F001:AC-05.1"""
    text = disk_text(ROOT / ".sdd" / "documentation.yaml")
    entries = re.split(r"\n(?=  - path: )", text)
    entry = [e for e in entries if e.startswith("  - path: docs/behaviour/")]
    assert len(entry) == 1
    assert re.search(r"^    status: active$", entry[0], re.MULTILINE)
    assert "RM-08" not in entry[0]
    assert "openspec/specs" not in text


def test_f001_ac_05_2_product_and_architecture_references():
    """F001:AC-05.2"""
    for name in ("product.md", "architecture.md"):
        text = disk_text(ROOT / ".sdd" / name)
        assert "openspec/specs" not in text, name
        assert "docs/behaviour/" in text, name


def test_f001_nfr_02_history_traceable():
    """F001:NFR-02"""
    for area in AREAS:
        hashes = git(
            "log", "--follow", "--format=%H", "--", f"docs/behaviour/{area}.md"
        ).split()
        older = [
            h
            for h in hashes
            if subprocess.run(
                ["git", "merge-base", "--is-ancestor", h, BASE], cwd=ROOT
            ).returncode
            == 0
        ]
        assert older, area


def test_f001_ac_01_3_project_rename_only_planned_changes():
    """F001:AC-01.3"""
    expected = base_text("openspec/specs/project-rename/spec.md")
    for old, new in (
        (
            "MUST dejar sin modificar `openspec/changes/archive/`, el propio script",
            "MUST dejar sin modificar el propio script",
        ),
        (
            "#### Scenario: Historial de cambios intacto\n"
            "- **GIVEN** cambios archivados en `openspec/changes/archive/` que "
            "mencionan el nombre de la plantilla\n"
            "- **WHEN** se ejecuta el renombrado\n"
            "- **THEN** esos archivos no cambian\n\n",
            "",
        ),
    ):
        assert expected.count(old) == 1, old
        expected = expected.replace(old, new)
    assert disk_text(BEHAVIOUR / "project-rename.md") == expected


def test_f001_ac_03_3_script_does_not_name_openspec():
    """F001:AC-03.3"""
    script = disk_text(ROOT / "scripts" / "rename_project.py")
    assert "openspec" not in script.lower()


def test_f001_ac_02_1_no_tracked_files_under_openspec():
    """F001:AC-02.1"""
    assert git("ls-files", "openspec").strip() == ""


def test_f001_ac_02_2_removed_files_remain_in_history():
    """F001:AC-02.2"""
    assert git("cat-file", "-t", f"{BASE}:openspec/config.yaml").strip() == "blob"
    subprocess.run(["git", "merge-base", "--is-ancestor", BASE, "HEAD"], cwd=ROOT, check=True)


def test_f001_ac_04_1_readme_start_steps():
    """F001:AC-04.1"""
    text = disk_text(ROOT / "README.md")
    start = text.index("Empezar un proyecto nuevo")
    end = text.index("\n## ", start)
    section = text[start:end]
    assert "openspec" not in section.lower()
    assert "docs/behaviour/" in section


def test_f001_ac_04_2_no_links_into_openspec():
    """F001:AC-04.2"""
    files = [ROOT / "README.md", *sorted((ROOT / "docs").rglob("*.md"))]
    for path in files:
        assert "openspec/" not in disk_text(path).lower(), path


def test_f001_ac_05_3_documentation_structure():
    """F001:AC-05.3"""
    standards = disk_text(ROOT / "docs" / "documentation-standards.md")
    assert "`docs/behaviour/`" in standards
    guide = disk_text(ROOT / "docs" / "development_guide.md")
    assert "openspec" not in guide.lower()


def test_f001_ac_06_1_dockerignore_entry_removed():
    """F001:AC-06.1"""
    lines = [
        line.strip()
        for line in disk_text(ROOT / ".dockerignore").splitlines()
        if line.strip() and not line.startswith("#")
    ]
    assert "openspec" not in "\n".join(lines).lower()
    assert "docs" in lines


def test_f001_ac_07_1_closed_list_of_mentions():
    """F001:AC-07.1"""
    result = subprocess.run(
        ["git", "grep", "-niI", "-e", "openspec", "-e", "opsx"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    stray = []
    for line in result.stdout.splitlines():
        path, lineno, _ = line.split(":", 2)
        if path.startswith("specs/001-retirar-openspec/"):
            continue
        if path == ".sdd/constitution.md":
            continue
        if path == ".sdd/roadmap.md":
            lines = disk_text(ROOT / path).splitlines()
            heading = max(
                i for i in range(int(lineno)) if lines[i].startswith("### ")
            )
            if lines[heading].startswith("### RM-08"):
                continue
        stray.append(line)
    assert stray == []
