from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.llm_service import LLMNotConfiguredError, get_llm_service

router = APIRouter(prefix="/api/v1", tags=["speech"])

# OpenAI Whisper limit (MB)
_MAX_AUDIO_BYTES = 25 * 1024 * 1024


@router.post("/speech/transcribe")
async def transcribe_audio(file: UploadFile = File(..., description="Recorded audio (e.g. webm, wav, mp3).")):
    """
    Speech-to-text only: sends audio to OpenAI Whisper and returns plain text.
    Does not create diary entries; the client fills keywords from `text`.
    """
    try:
        llm = get_llm_service()
    except LLMNotConfiguredError:
        raise HTTPException(
            status_code=503,
            detail="Speech transcription is not configured (OPENAI_API_KEY missing).",
        ) from None

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio file.")
    if len(raw) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25 MB).")

    name = file.filename or "recording.webm"
    if not any(name.lower().endswith(ext) for ext in (".webm", ".wav", ".mp3", ".m4a", ".mp4", ".mpeg", ".mpga", ".ogg", ".flac")):
        name = f"{name}.webm"

    try:
        text = llm.transcribe_speech(raw, name)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {e}") from e

    return {"text": text}
