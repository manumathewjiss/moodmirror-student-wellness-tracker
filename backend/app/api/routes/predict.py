from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings
from app.services.emotion_classifier import EmotionClassifier


router = APIRouter(prefix="/api/v1", tags=["prediction"])


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10_000)


class PredictBatchRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=128)


class PredictResponse(BaseModel):
    label: str
    confidence: float
    probabilities: dict[str, float]


@lru_cache(maxsize=1)
def _get_classifier_cached(model_source: str, mapping_path: str) -> EmotionClassifier:
    from pathlib import Path

    mapping_p = Path(mapping_path)
    if not mapping_p.exists():
        raise FileNotFoundError(f"Mapping file not found: {mapping_p}")

    # Detect local paths: must be absolute, or start with "./" or "../"
    # HuggingFace Hub IDs like "username/model-name" are NOT local paths.
    is_local = model_source.startswith("/") or model_source.startswith(".")
    if is_local:
        model_p = Path(model_source)
        if not model_p.exists():
            raise FileNotFoundError(f"Model directory not found: {model_p}")

    return EmotionClassifier(model_source=model_source, mapping_path=mapping_p)


def get_classifier(settings: Settings = Depends(get_settings)) -> EmotionClassifier:
    return _get_classifier_cached(
        model_source=settings.emotion_model_source(),
        mapping_path=str(settings.emotion_mapping_file()),
    )


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, clf: EmotionClassifier = Depends(get_classifier)) -> PredictResponse:
    try:
        pred = clf.predict(req.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return PredictResponse(label=pred.label, confidence=pred.confidence, probabilities=pred.probabilities)


@router.post("/predict_batch", response_model=list[PredictResponse])
def predict_batch(
    req: PredictBatchRequest, clf: EmotionClassifier = Depends(get_classifier)
) -> list[PredictResponse]:
    try:
        preds = clf.predict_batch(req.texts)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return [PredictResponse(label=p.label, confidence=p.confidence, probabilities=p.probabilities) for p in preds]

