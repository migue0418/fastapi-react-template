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
