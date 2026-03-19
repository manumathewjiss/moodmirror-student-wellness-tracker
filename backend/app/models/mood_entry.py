from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MoodEntry(Base):
    __tablename__ = "mood_entries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, index=True
    )

    source: Mapped[str] = mapped_column(
        String(50), default="manual"
    )  # e.g. manual / diary

    raw_text: Mapped[str] = mapped_column(Text())
    diary_text: Mapped[str | None] = mapped_column(Text(), nullable=True)

    label: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[float] = mapped_column(Float)

    prob_positive: Mapped[float | None] = mapped_column(Float, nullable=True)
    prob_neutral: Mapped[float | None] = mapped_column(Float, nullable=True)
    prob_negative: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    user = relationship("User", backref="mood_entries")

