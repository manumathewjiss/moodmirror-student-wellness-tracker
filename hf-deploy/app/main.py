from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.predict import router as predict_router
from app.api.routes.mood_entries import router as mood_entries_router
from app.api.routes.auth import router as auth_router
from app.api.routes.insights import router as insights_router
from app.core.config import get_settings
from app.core.logging import configure_logging


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="AIMoodDiary Backend",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(predict_router)
    app.include_router(mood_entries_router)
    app.include_router(auth_router)
    app.include_router(insights_router)

    return app


app = create_app()

