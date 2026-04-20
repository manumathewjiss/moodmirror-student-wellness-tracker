"""user minigame stats for Unwind tab.

Revision ID: 004_minigame
Revises: 003_add_probs
Create Date: 2026-04-20
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004_minigame"
down_revision: Union[str, None] = "003_add_probs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_minigame_stats",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("game_key", sa.String(length=32), nullable=False),
        sa.Column("plays", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("best_reaction_ms", sa.Integer(), nullable=True),
        sa.Column("best_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_minigame_stats_user_id_users",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("user_id", "game_key", name="uq_user_minigame_game_key"),
    )
    op.create_index("ix_user_minigame_stats_user_id", "user_minigame_stats", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_minigame_stats_user_id", table_name="user_minigame_stats")
    op.drop_table("user_minigame_stats")
