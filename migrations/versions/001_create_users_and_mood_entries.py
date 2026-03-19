"""create users and mood_entries tables.

Revision ID: 001_create_mood
Revises:
Create Date: 2026-03-04
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001_create_mood"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "mood_entries",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="manual"),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("diary_text", sa.Text(), nullable=True),
        sa.Column("label", sa.String(length=32), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_mood_entries_user_id_users",
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_mood_entries_user_id", "mood_entries", ["user_id"], unique=False)
    op.create_index("ix_mood_entries_timestamp", "mood_entries", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_mood_entries_timestamp", table_name="mood_entries")
    op.drop_index("ix_mood_entries_user_id", table_name="mood_entries")
    op.drop_table("mood_entries")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

