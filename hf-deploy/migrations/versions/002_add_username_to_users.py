"""add username field to users.

Revision ID: 002_add_username
Revises: 001_create_mood
Create Date: 2026-03-04
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002_add_username"
down_revision: Union[str, None] = "001_create_mood"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("username", sa.String(length=50), nullable=True),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=False)
    op.create_unique_constraint("uq_users_username", "users", ["username"])

    # make email non-null going forward (existing rows assumed to have email set or this will fail)
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=False)


def downgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=True)
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")

