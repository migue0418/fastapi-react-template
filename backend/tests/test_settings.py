import pytest
from app.core.settings import Settings, get_settings
from app.main import create_app
from pydantic import ValidationError

DEFAULT_PASSWORD = "ChangeMe123!"
VALID_KEY = "k" * 32


@pytest.fixture(autouse=True)
def isolated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("ENVIRONMENT", "SECRET_KEY", "ADMIN_PASSWORD", "DATABASE_URL"):
        monkeypatch.delenv(name, raising=False)


def build(
    monkeypatch: pytest.MonkeyPatch,
    environment: str,
    password: str | None,
    key: str = VALID_KEY,
) -> Settings:
    monkeypatch.setenv("ENVIRONMENT", environment)
    monkeypatch.setenv("SECRET_KEY", key)
    if password is not None:
        monkeypatch.setenv("ADMIN_PASSWORD", password)
    return Settings(_env_file=None)


def test_f002_ac_01_1_production_rejects_explicit_default(monkeypatch):
    """F002:AC-01.1"""
    with pytest.raises(ValidationError):
        build(monkeypatch, "production", DEFAULT_PASSWORD)


def test_f002_ac_01_2_production_rejects_implicit_default(monkeypatch):
    """F002:AC-01.2"""
    with pytest.raises(ValidationError):
        build(monkeypatch, "production", None)


def test_f002_ac_01_3_create_app_fails_without_database(monkeypatch):
    """F002:AC-01.3"""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", VALID_KEY)
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@127.0.0.1:1/none")
    get_settings.cache_clear()
    try:
        with pytest.raises(ValidationError):
            create_app()
    finally:
        get_settings.cache_clear()


def test_f002_ac_02_1_message_in_spanish_names_variable(monkeypatch):
    """F002:AC-02.1"""
    with pytest.raises(ValidationError) as exc:
        build(monkeypatch, "production", DEFAULT_PASSWORD)
    message = str(exc.value)
    assert "ADMIN_PASSWORD" in message
    assert "valor por defecto" in message
    assert "Define otra contraseña" in message


def test_f002_ac_02_2_message_does_not_print_password(monkeypatch):
    """F002:AC-02.2 and NFR-01"""
    with pytest.raises(ValidationError) as exc:
        build(monkeypatch, "production", DEFAULT_PASSWORD)
    assert DEFAULT_PASSWORD not in str(exc.value)


def test_f002_ac_03_1_production_accepts_other_password(monkeypatch):
    """F002:AC-03.1"""
    settings = build(monkeypatch, "production", "Another-Pass-456")
    assert settings.environment == "production"


@pytest.mark.parametrize("password", ["changeme123!", "ChangeMe123! "])
def test_f002_ac_03_2_variants_are_accepted(monkeypatch, password):
    """F002:AC-03.2"""
    assert build(monkeypatch, "production", password).admin_password == password


@pytest.mark.parametrize("environment", ["development", "test"])
@pytest.mark.parametrize("password", [DEFAULT_PASSWORD, None])
def test_f002_ac_04_default_allowed_outside_production(
    monkeypatch, environment, password
):
    """F002:AC-04.1 and F002:AC-04.2"""
    assert build(monkeypatch, environment, password).admin_password == DEFAULT_PASSWORD


def test_f002_asm_03_short_key_and_default_password_names_secret_key(monkeypatch):
    """F002:ASM-03"""
    with pytest.raises(ValidationError) as exc:
        build(monkeypatch, "production", DEFAULT_PASSWORD, key="short")
    assert "SECRET_KEY" in str(exc.value)


def test_f003_ac_04_1_example_env_shows_forwarded_allow_ips():
    """F003:AC-04.1"""
    from pathlib import Path

    example = Path(__file__).resolve().parents[1] / ".example.env"
    lines = example.read_text(encoding="utf-8").splitlines()
    declarations = [
        line for line in lines if line.lstrip("# ").startswith("FORWARDED_ALLOW_IPS=")
    ]
    assert len(declarations) == 1
    declaration = declarations[0]
    assert declaration.startswith("#"), "la variable debe ir comentada"
    value = declaration.lstrip("# ").split("=", 1)[1].strip()
    assert value and "*" not in value
    index = lines.index(declaration)
    assert lines[index - 1].startswith("#"), "falta la nota encima de la variable"
    note = []
    for line in reversed(lines[:index]):
        if not line.startswith("#"):
            break
        note.append(line)
    note_text = " ".join(note).lower()
    assert "proxy" in note_text and "cupo" in note_text, "la nota debe estar en español"

    from io import StringIO

    from dotenv import dotenv_values

    loaded = dotenv_values(stream=StringIO(declaration.lstrip("# ")))
    assert loaded["FORWARDED_ALLOW_IPS"] == value
