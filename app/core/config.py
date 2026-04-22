from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    env: str = "dev"
    log_level: str = "INFO"

    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/aimooddiary"

    # Set EMOTION_MODEL_HUB_ID to a HuggingFace Hub repo (e.g. "yourname/aimooddiary-roberta")
    # to load the model from the Hub instead of a local directory.
    emotion_model_hub_id: str | None = None

    # Paths are resolved relative to the backend folder (CWD when running uvicorn).
    emotion_model_dir: str = "models/roberta_emotion_model_3class"
    emotion_mapping_path: str = "app/assets/emotion_mapping_3class.json"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def emotion_model_source(self) -> str:
        """Returns HF Hub model ID if set, otherwise the resolved local path string."""
        if self.emotion_model_hub_id:
            return self.emotion_model_hub_id
        p = Path(self.emotion_model_dir)
        return str(p if p.is_absolute() else (Path.cwd() / p).resolve())

    def emotion_model_path(self) -> Path:
        p = Path(self.emotion_model_dir)
        return p if p.is_absolute() else (Path.cwd() / p).resolve()

    def emotion_mapping_file(self) -> Path:
        p = Path(self.emotion_mapping_path)
        return p if p.is_absolute() else (Path.cwd() / p).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

