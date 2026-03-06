from __future__ import annotations

from typing import Optional

from openai import OpenAI

from app.core.config import get_settings


class LLMNotConfiguredError(RuntimeError):
    pass


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise LLMNotConfiguredError("OPENAI_API_KEY is not set.")

        self._model_name = settings.openai_model
        self._client = OpenAI(api_key=settings.openai_api_key)

    def generate_diary(self, keywords: str, tone: Optional[str] = None) -> str:
        tone_part = f"in a {tone} tone" if tone else "in a natural tone"
        prompt = (
            "You are helping a user write a short daily diary entry.\n\n"
            "RULES (follow strictly):\n"
            "- Use ONLY the ideas, events, and feelings mentioned in the keywords below. Do NOT add any events, activities, places, or details (e.g. walks, sunshine, coffee, friends) that are not in the keywords.\n"
            "- If the user gives only 1–2 keywords, write a very short entry (1–3 sentences). If they give more keywords, you may write a bit longer (up to 5–6 sentences), but still only from those keywords.\n"
            f"- Write in first person, {tone_part}. Be concise.\n\n"
            f"Keywords (use these only): {keywords}\n\n"
            "Diary:"
        )

        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        if response.choices and len(response.choices) > 0 and response.choices[0].message.content:
            return response.choices[0].message.content.strip()
        return ""


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

