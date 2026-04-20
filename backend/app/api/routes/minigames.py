from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.minigame_stat import UserMinigameStat
from app.models.user import User


router = APIRouter(prefix="/api/v1", tags=["minigames"])

GAME_KEYS: tuple[str, ...] = ("tic_tac_toe", "reaction_tap", "odd_one_out", "coin_flip")


class MinigameStatRead(BaseModel):
    game_key: str
    plays: int
    wins: int
    best_reaction_ms: Optional[int] = None
    best_streak: int


class MinigameRecordRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    game_key: Literal["tic_tac_toe", "reaction_tap", "odd_one_out", "coin_flip"]
    plays: int = Field(default=1, ge=0, description="Increment total plays / rounds for this event.")
    wins: int = Field(default=0, ge=0, description="Increment wins or correct answers.")
    reaction_ms: Optional[int] = Field(default=None, ge=0, le=15_000)
    report_streak: Optional[int] = Field(
        default=None,
        ge=0,
        description="If set, best_streak becomes max(existing, this).",
    )


def _get_or_create_stat(db: Session, user_id: str, game_key: str) -> UserMinigameStat:
    row = (
        db.query(UserMinigameStat)
        .filter(UserMinigameStat.user_id == user_id, UserMinigameStat.game_key == game_key)
        .first()
    )
    if row:
        return row
    row = UserMinigameStat(
        user_id=user_id,
        game_key=game_key,
        plays=0,
        wins=0,
        best_streak=0,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()
    return row


@router.get("/minigames/stats", response_model=List[MinigameStatRead])
def list_minigame_stats(username: str, db: Session = Depends(get_db)) -> List[MinigameStatRead]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    rows = db.query(UserMinigameStat).filter(UserMinigameStat.user_id == user.id).all()
    by_key = {r.game_key: r for r in rows}
    out: List[MinigameStatRead] = []
    for key in GAME_KEYS:
        r = by_key.get(key)
        out.append(
            MinigameStatRead(
                game_key=key,
                plays=r.plays if r else 0,
                wins=r.wins if r else 0,
                best_reaction_ms=r.best_reaction_ms if r else None,
                best_streak=r.best_streak if r else 0,
            )
        )
    return out


@router.post("/minigames/record", response_model=MinigameStatRead)
def record_minigame_result(payload: MinigameRecordRequest, db: Session = Depends(get_db)) -> MinigameStatRead:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    row = _get_or_create_stat(db, user.id, payload.game_key)
    row.plays += payload.plays
    row.wins += payload.wins
    if payload.reaction_ms is not None:
        if row.best_reaction_ms is None or payload.reaction_ms < row.best_reaction_ms:
            row.best_reaction_ms = payload.reaction_ms
    if payload.report_streak is not None:
        row.best_streak = max(row.best_streak, payload.report_streak)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return MinigameStatRead(
        game_key=row.game_key,
        plays=row.plays,
        wins=row.wins,
        best_reaction_ms=row.best_reaction_ms,
        best_streak=row.best_streak,
    )
