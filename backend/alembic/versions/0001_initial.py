"""initial

Revision ID: 0001
Revises:
Create Date: 2026-01-01 00:00:00.000000

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _existing_tables(connection) -> set[str]:
    return set(inspect(connection).get_table_names())


def _existing_columns(connection, table: str) -> set[str]:
    return {col["name"] for col in inspect(connection).get_columns(table)}


def _existing_indexes(connection, table: str) -> set[str]:
    return {idx["name"] for idx in inspect(connection).get_indexes(table)}


def upgrade() -> None:
    connection = op.get_bind()
    tables = _existing_tables(connection)

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("username", sa.String(length=50), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_username", "users", ["username"], unique=True)
    else:
        # Legacy table: add columns that may be missing from the pre-Alembic schema
        cols = _existing_columns(connection, "users")
        if "full_name" not in cols:
            op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))
        if "email" not in cols:
            op.add_column("users", sa.Column("email", sa.String(255), nullable=True))
        indexes = _existing_indexes(connection, "users")
        if "ix_users_username" not in indexes:
            op.create_index("ix_users_username", "users", ["username"], unique=True)

    if "roles" not in tables:
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    if "user_roles" not in tables:
        op.create_table(
            "user_roles",
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id", "role_id"),
            sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_id_role_id"),
        )

    if "auth_refresh_tokens" not in tables:
        op.create_table(
            "auth_refresh_tokens",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("user_agent", sa.String(length=255), nullable=True),
            sa.Column("remember_me", sa.Boolean(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_auth_refresh_tokens_token_hash",
            "auth_refresh_tokens",
            ["token_hash"],
            unique=True,
        )
    else:
        # Legacy table: add columns that may be missing
        cols = _existing_columns(connection, "auth_refresh_tokens")
        if "user_agent" not in cols:
            op.add_column(
                "auth_refresh_tokens",
                sa.Column("user_agent", sa.String(255), nullable=True),
            )
        if "remember_me" not in cols:
            op.add_column(
                "auth_refresh_tokens",
                sa.Column(
                    "remember_me",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.text("false"),
                ),
            )
        indexes = _existing_indexes(connection, "auth_refresh_tokens")
        if "ix_auth_refresh_tokens_token_hash" not in indexes:
            op.create_index(
                "ix_auth_refresh_tokens_token_hash",
                "auth_refresh_tokens",
                ["token_hash"],
                unique=True,
            )


def downgrade() -> None:
    op.drop_index("ix_auth_refresh_tokens_token_hash", table_name="auth_refresh_tokens")
    op.drop_table("auth_refresh_tokens")
    op.drop_table("user_roles")
    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_table("roles")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
