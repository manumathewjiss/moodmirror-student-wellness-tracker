"""
Reduce positive bias on Diary entries: the LLM often adds silver-lining endings that
pull RoBERTa toward "positive" even when keywords describe stress, fatigue, or discomfort.

This layer nudges blended probabilities using lexical cues (no model retraining).
"""

from __future__ import annotations

import re
from typing import Dict

# Stress / discomfort / overload — counted in keywords + generated diary
_NEGATIVE_PATTERNS = [
    r"headache",
    r"migraine",
    r"exhausted",
    r"exhaustion",
    r"\bstress(?:ed|ful)?\b",
    r"\banxious\b",
    r"\banxiety\b",
    r"\boverwhelmed\b",
    r"\bfatigue\b",
    r"\btired\b",
    r"back[- ]to[- ]back",
    r"\bmiserable\b",
    r"\bfrustrated\b",
    r"\bfrustration\b",
    r"\brough\b",
    r"\btough\b",
    r"\bdifficult\b",
    r"\bstruggling\b",
    r"\bpain\b",
    r"\bach(?:e|ing)?\b",
    r"\bsick\b",
    r"\bworried\b",
    r"\bburnout\b",
    r"burnt out",
    r"\bpanic\b",
    r"\bdepressed\b",
    r"\bhorrible\b",
    r"\bterrible\b",
    r"\bawful\b",
    r"\bworst\b",
    r"no energy",
    r"too much",
    r"\bbusy\b",  # weak alone; combined with other hits it helps
]

# Clear positive mood — dampens negative nudge when genuinely celebratory
_POSITIVE_PATTERNS = [
    r"\bgreat\b",
    r"\bwonderful\b",
    r"\bamazing\b",
    r"\bexcellent\b",
    r"best day",
    r"so happy",
    r"\bgrateful\b",
    r"\bblessed\b",
    r"\belated\b",
    r"\bthrilled\b",
]


def _match_count(text: str, patterns: list[str]) -> int:
    return sum(1 for p in patterns if re.search(p, text, re.IGNORECASE))


def _normalize_three(p: Dict[str, float]) -> Dict[str, float]:
    keys = ("negative", "neutral", "positive")
    for k in keys:
        p.setdefault(k, 0.0)
    s = sum(p[k] for k in keys)
    if s <= 0:
        return {k: 1.0 / 3 for k in keys}
    return {k: p[k] / s for k in keys}


def calibrate_diary_blended_probs(
    blended: Dict[str, float],
    keywords: str,
    diary_text: str,
) -> Dict[str, float]:
    """
    After keyword/diary RoBERTa blend, shift mass toward negative/neutral when
    stress language is present and the model is still leaning positive or it's a close call.
    """
    text = f"{keywords} {diary_text}"
    neg_hits = _match_count(text, _NEGATIVE_PATTERNS)
    pos_hits = _match_count(text, _POSITIVE_PATTERNS)
    # Net stress signal: negative wording matters more than generic "great" in the same entry
    net_stress = neg_hits - 0.45 * pos_hits
    # Skip nudge when there is essentially no stress language
    if net_stress < 0.35:
        return _normalize_three(dict(blended))

    p = _normalize_three(dict(blended))
    pos_p, neg_p, neu_p = p["positive"], p["negative"], p["neutral"]

    # How hard to correct: more stress phrases → stronger nudge (capped)
    strength = min(0.72, 0.11 * net_stress + 0.06 * max(0, neg_hits - 1))

    # Only correct when the blend is positive-leaning or nearly tied (typical diary false positive)
    margin_pos_vs_neg = pos_p - neg_p
    if margin_pos_vs_neg < -0.02:
        return p

    if margin_pos_vs_neg < strength * 1.1 or pos_p >= neg_p:
        transfer = min(pos_p * 0.82, strength * max(pos_p, 0.15))
        # Mostly toward negative, some toward neutral (ambiguous stress days)
        p["positive"] = pos_p - transfer
        p["negative"] = neg_p + transfer * 0.85
        p["neutral"] = neu_p + transfer * 0.15

    return _normalize_three(p)
