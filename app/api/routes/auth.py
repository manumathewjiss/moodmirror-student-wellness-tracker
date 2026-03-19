from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserRead(BaseModel):
    id: str
    email: EmailStr
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/register", response_model=UserRead)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserRead:
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered.")

    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken.")

    user = User(email=payload.email, username=payload.username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


@router.post("/login", response_model=UserRead)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> UserRead:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserRead.model_validate(user)

