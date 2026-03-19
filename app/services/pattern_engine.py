from __future__ import annotations

import re
from collections import defaultdict
from datetime import date
from typing import Any

import numpy as np

from app.models.mood_entry import MoodEntry

STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her",
    "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
    "themselves", "what", "which", "who", "whom", "this", "that", "these", "those",
    "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "having", "do", "does", "did", "doing", "will", "would", "shall", "should",
    "may", "might", "must", "can", "could", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
    "about", "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "both", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
    "just", "now", "also", "even", "much", "still", "well", "got", "get", "goes",
    "went", "come", "came", "like", "feel", "felt", "day", "today", "really",
    "quite", "bit", "little", "lot", "good", "bad", "nice", "great", "okay", "ok",
    "was", "been", "the", "had", "has", "its", "but", "not", "are", "for",
}

LABEL_SCORE: dict[str, float] = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

ALL_LABELS = ["positive", "neutral", "negative"]


class PatternEngine:
    MIN_ENTRIES_BASIC = 3
    MIN_ENTRIES_WEEKLY = 7
    MIN_ENTRIES_TRANSITIONS = 5

    def _positivity_score(self, entry: MoodEntry) -> float:
        """Richer score using stored probabilities when available, else label mapping."""
        if entry.prob_positive is not None and entry.prob_negative is not None:
            return entry.prob_positive - entry.prob_negative
        return LABEL_SCORE.get(entry.label, 0.0)

    def _extract_keywords(self, text: str) -> list[str]:
        words = re.findall(r"[a-z]+", text.lower())
        return [w for w in words if len(w) >= 3 and w not in STOPWORDS]

    # ------------------------------------------------------------------
    # Trend: linear regression on positivity score over time
    # ------------------------------------------------------------------
    def compute_trend(self, entries: list[MoodEntry]) -> dict[str, Any]:
        if len(entries) < self.MIN_ENTRIES_BASIC:
            return {
                "direction": "insufficient_data",
                "slope": None,
                "message": "Not enough entries to determine a trend yet.",
            }

        sorted_entries = sorted(entries, key=lambda e: e.timestamp)
        scores = [self._positivity_score(e) for e in sorted_entries]
        x = np.arange(len(scores), dtype=float)
        slope = float(np.polyfit(x, scores, 1)[0])

        if slope > 0.03:
            direction, message = "improving", "Your mood has been improving."
        elif slope < -0.03:
            direction, message = "declining", "Your mood has been declining recently."
        else:
            direction, message = "stable", "Your mood has been relatively stable."

        return {"direction": direction, "slope": round(slope, 4), "message": message}

    # ------------------------------------------------------------------
    # Weekly rhythm: average positivity score grouped by weekday
    # ------------------------------------------------------------------
    def compute_weekly_rhythm(self, entries: list[MoodEntry]) -> dict[str, Any]:
        if len(entries) < self.MIN_ENTRIES_WEEKLY:
            return {"scores": {}, "best_day": None, "worst_day": None}

        day_scores: dict[int, list[float]] = defaultdict(list)
        for entry in entries:
            day_scores[entry.timestamp.weekday()].append(self._positivity_score(entry))

        scores = {
            WEEKDAY_NAMES[day]: round(float(np.mean(vals)), 3)
            for day, vals in day_scores.items()
        }

        if not scores:
            return {"scores": {}, "best_day": None, "worst_day": None}

        best_day = max(scores, key=scores.__getitem__)
        worst_day = min(scores, key=scores.__getitem__)

        return {
            "scores": scores,
            "best_day": best_day if scores[best_day] > 0 else None,
            "worst_day": worst_day if scores[worst_day] < 0 else None,
        }

    # ------------------------------------------------------------------
    # Volatility: mood switch rate + std deviation of scores
    # ------------------------------------------------------------------
    def compute_volatility(self, entries: list[MoodEntry]) -> dict[str, Any]:
        if len(entries) < 2:
            return {
                "level": "insufficient_data",
                "score": None,
                "mood_switches": 0,
                "message": "Not enough entries to measure volatility.",
            }

        sorted_entries = sorted(entries, key=lambda e: e.timestamp)
        labels = [e.label for e in sorted_entries]
        scores = [self._positivity_score(e) for e in sorted_entries]

        mood_switches = sum(1 for i in range(1, len(labels)) if labels[i] != labels[i - 1])
        switch_rate = mood_switches / (len(labels) - 1)
        std_dev = float(np.std(scores))

        volatility_score = round((switch_rate + min(std_dev, 1.0)) / 2, 3)

        if volatility_score < 0.2:
            level, message = "low", "Your mood has been very consistent."
        elif volatility_score < 0.45:
            level, message = "medium", "Your mood has been moderately variable."
        else:
            level, message = "high", "Your mood has been quite variable lately."

        return {
            "level": level,
            "score": volatility_score,
            "mood_switches": mood_switches,
            "message": message,
        }

    # ------------------------------------------------------------------
    # Transitions: Markov chain + blended next-day prediction
    # ------------------------------------------------------------------
    def compute_transitions(self, entries: list[MoodEntry]) -> dict[str, Any]:
        if len(entries) < self.MIN_ENTRIES_TRANSITIONS:
            return {"matrix": {}, "next_day_prediction": None, "next_day_confidence": None}

        sorted_entries = sorted(entries, key=lambda e: e.timestamp)
        labels = [e.label for e in sorted_entries]

        counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for i in range(len(labels) - 1):
            counts[labels[i]][labels[i + 1]] += 1

        matrix: dict[str, dict[str, float]] = {}
        for from_label in ALL_LABELS:
            row = counts[from_label]
            total = sum(row.values())
            if total > 0:
                matrix[from_label] = {
                    to_label: round(row.get(to_label, 0) / total, 3)
                    for to_label in ALL_LABELS
                }
            else:
                matrix[from_label] = {l: round(1 / 3, 3) for l in ALL_LABELS}

        # Blend Markov (70%) with recent 3-day signal (30%)
        last_label = labels[-1]
        recent_scores = [self._positivity_score(e) for e in sorted_entries[-3:]]
        recent_avg = float(np.mean(recent_scores))

        def _score_to_probs(score: float) -> dict[str, float]:
            if score > 0.3:
                return {"positive": 0.6, "neutral": 0.3, "negative": 0.1}
            if score < -0.3:
                return {"positive": 0.1, "neutral": 0.3, "negative": 0.6}
            return {"positive": 0.25, "neutral": 0.5, "negative": 0.25}

        markov_probs = matrix.get(last_label, {l: round(1 / 3, 3) for l in ALL_LABELS})
        recent_probs = _score_to_probs(recent_avg)
        blended = {
            l: round(0.7 * markov_probs.get(l, 1 / 3) + 0.3 * recent_probs.get(l, 1 / 3), 3)
            for l in ALL_LABELS
        }

        next_prediction = max(blended, key=blended.__getitem__)
        next_confidence = blended[next_prediction]

        return {
            "matrix": matrix,
            "next_day_prediction": next_prediction,
            "next_day_confidence": next_confidence,
        }

    # ------------------------------------------------------------------
    # Keyword correlations: avg positivity score per keyword
    # ------------------------------------------------------------------
    def compute_keyword_correlations(self, entries: list[MoodEntry]) -> list[dict[str, Any]]:
        if len(entries) < self.MIN_ENTRIES_BASIC:
            return []

        keyword_scores: dict[str, list[float]] = defaultdict(list)
        for entry in entries:
            score = self._positivity_score(entry)
            for kw in set(self._extract_keywords(entry.raw_text)):
                keyword_scores[kw].append(score)

        results = []
        for kw, kw_scores in keyword_scores.items():
            if len(kw_scores) < 2:
                continue
            avg = float(np.mean(kw_scores))
            results.append({
                "keyword": kw,
                "avg_score": round(avg, 3),
                "count": len(kw_scores),
                "association": "positive" if avg > 0.2 else "negative" if avg < -0.2 else "neutral",
            })

        results.sort(key=lambda x: abs(x["avg_score"]), reverse=True)
        return results[:20]

    # ------------------------------------------------------------------
    # Streaks: logging streak, positive streak, longest positive streak
    # ------------------------------------------------------------------
    def compute_streaks(self, entries: list[MoodEntry]) -> dict[str, Any]:
        if not entries:
            return {"logging_streak": 0, "current_positive_streak": 0, "longest_positive_streak": 0}

        sorted_entries = sorted(entries, key=lambda e: e.timestamp)

        # Logging streak: consecutive unique calendar days ending today or yesterday
        entry_dates = sorted(set(e.timestamp.date() for e in sorted_entries), reverse=True)
        logging_streak = 0
        if entry_dates:
            today = date.today()
            prev = today
            for d in entry_dates:
                if (prev - d).days <= 1:
                    logging_streak += 1
                    prev = d
                else:
                    break

        # Current positive streak: most recent consecutive positive entries
        current_positive = 0
        for entry in reversed(sorted_entries):
            if entry.label == "positive":
                current_positive += 1
            else:
                break

        # Longest positive streak ever
        longest_positive, current_run = 0, 0
        for entry in sorted_entries:
            if entry.label == "positive":
                current_run += 1
                longest_positive = max(longest_positive, current_run)
            else:
                current_run = 0

        return {
            "logging_streak": logging_streak,
            "current_positive_streak": current_positive,
            "longest_positive_streak": longest_positive,
        }

    # ------------------------------------------------------------------
    # Human-readable insights from all computed metrics
    # ------------------------------------------------------------------
    def _generate_insights(
        self,
        trend: dict[str, Any],
        weekly: dict[str, Any],
        volatility: dict[str, Any],
        keyword_correlations: list[dict[str, Any]],
        streaks: dict[str, Any],
    ) -> list[str]:
        insights: list[str] = []

        direction = trend.get("direction")
        if direction == "improving":
            insights.append("Your mood has been improving — keep it up.")
        elif direction == "declining":
            insights.append("Your mood has been declining recently. It might help to take a moment for yourself.")

        if weekly.get("worst_day"):
            insights.append(f"You tend to feel lower on {weekly['worst_day']}s.")
        if weekly.get("best_day"):
            insights.append(f"{weekly['best_day']}s are usually your best days.")

        vol_level = volatility.get("level")
        if vol_level == "high":
            insights.append("Your mood has been quite variable lately — big swings day to day.")
        elif vol_level == "low":
            insights.append("You've been emotionally consistent recently.")

        top_negative = [k for k in keyword_correlations if k["association"] == "negative"][:2]
        top_positive = [k for k in keyword_correlations if k["association"] == "positive"][:2]
        for kw in top_negative:
            insights.append(f"'{kw['keyword']}' tends to show up on your lower mood days.")
        for kw in top_positive:
            insights.append(f"'{kw['keyword']}' often appears when you're feeling good.")

        positive_streak = streaks.get("current_positive_streak", 0)
        logging_streak = streaks.get("logging_streak", 0)
        if positive_streak >= 3:
            insights.append(f"You're on a {positive_streak}-day positive streak — great momentum!")
        if logging_streak >= 7:
            insights.append(f"You've logged for {logging_streak} days in a row. Consistency is key.")

        return insights

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------
    def analyze(self, entries: list[MoodEntry]) -> dict[str, Any]:
        trend = self.compute_trend(entries)
        weekly = self.compute_weekly_rhythm(entries)
        volatility = self.compute_volatility(entries)
        transitions = self.compute_transitions(entries)
        keyword_correlations = self.compute_keyword_correlations(entries)
        streaks = self.compute_streaks(entries)
        insights = self._generate_insights(trend, weekly, volatility, keyword_correlations, streaks)

        return {
            "has_sufficient_data": len(entries) >= self.MIN_ENTRIES_BASIC,
            "total_entries": len(entries),
            "trend": trend,
            "weekly_rhythm": weekly,
            "volatility": volatility,
            "transitions": transitions,
            "keyword_correlations": keyword_correlations,
            "streaks": streaks,
            "insights": insights,
        }
