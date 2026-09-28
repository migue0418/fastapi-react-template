from alembic import command
from alembic.config import Config

from app.core.settings import BACKEND_DIR


def build_alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    # Ruta absoluta para que las migraciones al arrancar no dependan del directorio de trabajo.
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return config


def run_migrations() -> None:
    command.upgrade(build_alembic_config(), "head")
