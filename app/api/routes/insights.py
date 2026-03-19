from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.mood_entry import MoodEntry
from app.services.pattern_engine import PatternEngine

router = APIRouter(prefix="/api/v1", tags=["insights"])

_engine = PatternEngine()


@router.get("/insights")
def get_insights(
    username: str,
    limit: int = 60,
    db: Session = Depends(get_db),
) -> dict:
    from app.models.user import User

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    limit = max(1, min(limit, 500))
    entries = (
        db.query(MoodEntry)
        .filter(MoodEntry.user_id == user.id)
        .order_by(MoodEntry.timestamp.asc())
        .limit(limit)
        .all()
    )

    return _engine.analyze(entries)
