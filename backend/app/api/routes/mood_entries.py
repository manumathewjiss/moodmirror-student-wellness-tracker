from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes.predict import get_classifier
from app.db.session import get_db
from app.models.mood_entry import MoodEntry
from app.services.emotion_classifier import EmotionClassifier
from app.services.diary_sentiment_calibration import calibrate_diary_blended_probs
from app.services.llm_service import LLMNotConfiguredError, get_llm_service


router = APIRouter(prefix="/api/v1", tags=["mood-entries"])


class MoodEntryCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    text: str = Field(..., min_length=1, max_length=10_000)
    source: str = Field(default="manual", max_length=50)
    diary_text: Optional[str] = Field(default=None, max_length=20_000)


class DiaryEntryCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    keywords: str = Field(..., min_length=1, max_length=2000)
    tone: Optional[str] = Field(default=None, max_length=50)


class MoodEntryRead(BaseModel):
    id: str
    user_id: Optional[str]
    timestamp: datetime
    source: str
    raw_text: str
    diary_text: Optional[str]
    label: str
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


class DiaryEntryRead(MoodEntryRead):
    """Same as MoodEntryRead but includes per-class probabilities from the classifier."""

    probabilities: Optional[dict[str, float]] = None


@router.post("/mood-entries", response_model=MoodEntryRead)
def create_mood_entry(
    payload: MoodEntryCreate,
    db: Session = Depends(get_db),
    clf: EmotionClassifier = Depends(get_classifier),
) -> MoodEntryRead:
    from app.models.user import User

    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    try:
        prediction = clf.predict(payload.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    entry = MoodEntry(
        user_id=user.id,
        raw_text=payload.text,
        diary_text=payload.diary_text,
        source=payload.source,
        label=prediction.label,
        confidence=prediction.confidence,
        prob_positive=prediction.probabilities.get("positive"),
        prob_neutral=prediction.probabilities.get("neutral"),
        prob_negative=prediction.probabilities.get("negative"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return MoodEntryRead.model_validate(entry)


@router.get("/mood-entries", response_model=List[MoodEntryRead])
def list_mood_entries(
    username: str,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> List[MoodEntryRead]:
    from app.models.user import User

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    limit = max(1, min(limit, 2000))
    entries = (
        db.query(MoodEntry)
        .filter(MoodEntry.user_id == user.id)
        .order_by(MoodEntry.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [MoodEntryRead.model_validate(e) for e in entries]


@router.post("/mood-entries/diary", response_model=DiaryEntryRead)
def create_diary_mood_entry(
    payload: DiaryEntryCreate,
    db: Session = Depends(get_db),
    clf: EmotionClassifier = Depends(get_classifier),
) -> DiaryEntryRead:
    from app.models.user import User

    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    llm = get_llm_service()
    try:
        diary_text = llm.generate_diary(payload.keywords, payload.tone)
    except LLMNotConfiguredError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail="Failed to generate diary text.") from e

    if not diary_text.strip():
        raise HTTPException(status_code=500, detail="LLM returned empty diary text.")

    # Weight keywords more than generated diary so user intent (e.g. "really bad") is reflected.
    # Diary text often ends on a silver-lining line → slightly higher keyword weight.
    KEYWORD_WEIGHT = 0.72
    DIARY_WEIGHT = 0.28

    try:
        pred_keywords = clf.predict(payload.keywords.strip())
        pred_diary = clf.predict(diary_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Blend probabilities: same keys (negative, neutral, positive)
    keys = set(pred_keywords.probabilities) | set(pred_diary.probabilities)
    blended = {
        k: KEYWORD_WEIGHT * pred_keywords.probabilities.get(k, 0.0)
        + DIARY_WEIGHT * pred_diary.probabilities.get(k, 0.0)
        for k in keys
    }
    blended = calibrate_diary_blended_probs(blended, payload.keywords.strip(), diary_text)
    best_label = max(blended, key=blended.get)
    best_confidence = blended[best_label]

    entry = MoodEntry(
        user_id=user.id,
        raw_text=payload.keywords,
        diary_text=diary_text,
        source="diary",
        label=best_label,
        confidence=best_confidence,
        prob_positive=blended.get("positive"),
        prob_neutral=blended.get("neutral"),
        prob_negative=blended.get("negative"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    base = MoodEntryRead.model_validate(entry)
    return DiaryEntryRead(**base.model_dump(), probabilities=blended)

