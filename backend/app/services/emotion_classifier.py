from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


@dataclass(frozen=True)
class EmotionPrediction:
    label: str
    confidence: float
    probabilities: Dict[str, float]


class EmotionClassifier:
    def __init__(self, model_source: str, mapping_path: Path, max_length: int = 128) -> None:
        """
        model_source: either a local directory path or a HuggingFace Hub repo ID
                      (e.g. "yourname/moodmirror-roberta").
        """
        self.model_source = model_source
        self.mapping_path = mapping_path
        self.max_length = max_length

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._tokenizer = None
        self._model = None
        self._id_to_label: Dict[int, str] = {}

        self._load_mapping()
        self._load_model()

    def _load_mapping(self) -> None:
        mapping = json.loads(self.mapping_path.read_text(encoding="utf-8"))
        self._id_to_label = {int(k): v for k, v in mapping["id_to_emotion"].items()}

    def _load_model(self) -> None:
        self._tokenizer = AutoTokenizer.from_pretrained(self.model_source)
        self._model = AutoModelForSequenceClassification.from_pretrained(self.model_source)
        self._model.to(self._device)
        self._model.eval()

    def predict(self, text: str) -> EmotionPrediction:
        text = (text or "").strip()
        if not text:
            raise ValueError("Text must be non-empty.")

        assert self._tokenizer is not None
        assert self._model is not None

        enc = self._tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        enc = {k: v.to(self._device) for k, v in enc.items()}

        with torch.no_grad():
            logits = self._model(**enc).logits
            probs_t = torch.softmax(logits, dim=-1)[0].detach().cpu()

        probs: Dict[str, float] = {}
        for i, p in enumerate(probs_t.tolist()):
            label = self._id_to_label.get(i, f"label_{i}")
            probs[label] = float(p)

        best_id = int(torch.argmax(probs_t).item())
        best_label = self._id_to_label.get(best_id, f"label_{best_id}")
        confidence = float(probs[best_label])

        return EmotionPrediction(label=best_label, confidence=confidence, probabilities=probs)

    def predict_batch(self, texts: List[str]) -> List[EmotionPrediction]:
        return [self.predict(t) for t in texts]

