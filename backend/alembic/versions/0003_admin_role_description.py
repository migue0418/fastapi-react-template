"""admin role description with accent

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-28 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

OLD_DESCRIPTION = "Administracion del sistema"
NEW_DESCRIPTION = "Administración del sistema"


def _replace_admin_description(current: str, new: str) -> None:
    # Solo se toca el valor sembrado: una descripción editada por un admin se respeta.
    op.execute(
        sa.text(
            "UPDATE roles SET description = :new "
            "WHERE name = 'admin' AND description = :current",
        ).bindparams(current=current, new=new),
    )


def upgrade() -> None:
    _replace_admin_description(OLD_DESCRIPTION, NEW_DESCRIPTION)


def downgrade() -> None:
    _replace_admin_description(NEW_DESCRIPTION, OLD_DESCRIPTION)
