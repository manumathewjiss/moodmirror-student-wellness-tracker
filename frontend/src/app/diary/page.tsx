"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DiaryVoiceButton from "@/components/DiaryVoiceButton";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

type DiaryResult = {
  id: string;
  raw_text: string;
  diary_text: string | null;
  label: string;
  confidence: number;
  source: string;
  probabilities?: Record<string, number>;
};

const MAX_KEYWORD_BOXES = 10;

const QUICK_MOODS = [
  { label: "Positive", emoji: "😊", keywords: "positive mood, feeling good" },
  { label: "Neutral", emoji: "😐", keywords: "neutral mood, okay" },
  { label: "Negative", emoji: "😔", keywords: "negative mood, feeling low" },
] as const;

export default function DiaryPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [keywordBoxes, setKeywordBoxes] = useState<string[]>([""]);
  const [tone, setTone] = useState("casual");
  const [loading, setLoading] = useState(false);
  const [voiceSessionOwner, setVoiceSessionOwner] = useState<number | null>(null);
  const voiceBusy = voiceSessionOwner !== null;
  const [result, setResult] = useState<DiaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null);
  }, []);

  function updateBox(index: number, value: string) {
    setKeywordBoxes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addBox() {
    if (keywordBoxes.length < MAX_KEYWORD_BOXES) {
      setKeywordBoxes((prev) => [...prev, ""]);
    }
  }

  async function submitDiary(keywords: string) {
    if (!username?.trim()) {
      setError("Please log in first.");
      return;
    }
    const trimmed = keywords.trim();
    if (!trimmed) {
      setError("Enter at least one keyword or mood.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/mood-entries/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, keywords: trimmed, tone: tone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Request failed");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const combined = keywordBoxes.map((k) => k.trim()).filter(Boolean).join(", ");
    void submitDiary(combined);
  }

  function handleQuickMood(keywords: string) {
    setKeywordBoxes((prev) => {
      const next = [...prev];
      next[0] = keywords;
      for (let i = 1; i < next.length; i += 1) next[i] = "";
      return next.length ? next : [keywords];
    });
    void submitDiary(keywords);
  }

  if (username === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-foreground-muted">Loading...</p>
      </main>
    );
  }

  if (!username) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-amber-400">Please <Link href="/" className="underline">log in</Link> first to use Diary.</p>
      </main>
    );
  }

  const labelColor =
    result?.label === "positive" ? "text-emerald-400" :
    result?.label === "negative" ? "text-red-400" : "text-foreground-muted";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Diary</h1>
        <p className="text-foreground-muted text-sm">
          Tap a mood for a one-click entry, or add keywords below (use the + Add another link for more, max 10). We’ll generate a short diary entry, analyze its emotion, and save it.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className="block text-sm font-medium text-foreground mb-2">Quick mood</span>
          <div className="flex flex-wrap gap-3">
            {QUICK_MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                disabled={loading || voiceBusy}
                onClick={() => handleQuickMood(m.keywords)}
                title={`Save as ${m.label.toLowerCase()}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-sunburst/80 bg-midnight-light text-2xl transition hover:border-sunburst hover:bg-midnight-lighter hover:ring-2 hover:ring-sunburst/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunburst disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Record ${m.label} mood and save`}
              >
                <span aria-hidden="true">{m.emoji}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-foreground-muted">😊 positive · 😐 neutral · 😔 negative — saves immediately, same as Generate diary and save.</p>
        </div>
        <div className="space-y-3">
          <span className="block text-sm font-medium text-foreground">Keywords / mood</span>
          <p className="text-xs text-foreground-muted -mt-1 mb-2">
            Tap the mic to dictate; speech is converted to text with OpenAI Whisper and filled in here. You can still edit before generating.
          </p>
          {keywordBoxes.map((value, index) => (
            <div key={index} className="flex gap-2 items-start">
              <label className="sr-only">Keyword {index + 1}</label>
              <input
                type="text"
                className="min-w-0 flex-1 rounded-lg border border-midnight-lighter bg-midnight-light px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
                value={value}
                onChange={(e) => updateBox(index, e.target.value)}
                placeholder={index === 0 ? "e.g. exams, tired, friends" : "Another keyword or mood…"}
              />
              <DiaryVoiceButton
                apiBase={API_BASE}
                fieldIndex={index}
                sessionOwnerIndex={voiceSessionOwner}
                onSessionOwnerChange={setVoiceSessionOwner}
                disabled={loading}
                onTranscript={(t) => {
                  setKeywordBoxes((prev) => {
                    const next = [...prev];
                    const cur = (next[index] ?? "").trim();
                    next[index] = cur ? `${cur} ${t}` : t;
                    return next;
                  });
                }}
                ariaLabel={index === 0 ? "Speak into keyword field" : `Speak for keyword ${index + 1}`}
              />
            </div>
          ))}
          {keywordBoxes.length < MAX_KEYWORD_BOXES && (
            <button
              type="button"
              onClick={addBox}
              className="text-sm font-medium text-sunburst hover:underline"
            >
              + Add another
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Tone (optional)</label>
          <select
            className="w-full rounded-lg border border-midnight-lighter bg-midnight-light px-3 py-2.5 text-sm text-foreground outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option value="casual">Casual</option>
            <option value="reflective">Reflective</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || voiceBusy}
          className="rounded-lg bg-sunburst px-5 py-2.5 text-sm font-semibold text-ink hover:bg-sunburst-dark disabled:opacity-60 transition-colors"
        >
          {loading ? "Generating..." : "Generate diary & save"}
        </button>
      </form>

      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-8 space-y-4 rounded-xl border border-midnight-lighter bg-midnight-light p-6">
          <h2 className="text-lg font-semibold text-foreground">Generated entry</h2>
          {result.diary_text && (
            <p className="text-foreground-muted text-sm whitespace-pre-wrap">{result.diary_text}</p>
          )}
          <p className={`font-semibold ${labelColor}`}>Emotion: {result.label}</p>
          <p className="text-foreground-muted text-sm">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          {result.probabilities && Object.keys(result.probabilities).length > 0 && (
            <div className="pt-4 border-t border-midnight-lighter">
              <p className="text-foreground-muted text-xs mb-2">All scores (why this label was chosen):</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(result.probabilities).map(([emotion, pct]) => (
                  <span
                    key={emotion}
                    className={
                      emotion === result.label
                        ? "font-medium text-foreground"
                        : "text-foreground-muted"
                    }
                  >
                    {emotion}: {(pct * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
