"""add per-class probabilities to mood_entries.

Revision ID: 003_add_probs
Revises: 002_add_username
Create Date: 2026-03-18
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_add_probs"
down_revision: Union[str, None] = "002_add_username"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mood_entries", sa.Column("prob_positive", sa.Float(), nullable=True))
    op.add_column("mood_entries", sa.Column("prob_neutral", sa.Float(), nullable=True))
    op.add_column("mood_entries", sa.Column("prob_negative", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("mood_entries", "prob_negative")
    op.drop_column("mood_entries", "prob_neutral")
    op.drop_column("mood_entries", "prob_positive")
