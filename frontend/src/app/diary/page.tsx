"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function DiaryPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [keywordBoxes, setKeywordBoxes] = useState<string[]>([""]);
  const [tone, setTone] = useState("casual");
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username?.trim()) {
      setError("Please log in first.");
      return;
    }
    const combined = keywordBoxes.map((k) => k.trim()).filter(Boolean).join(", ");
    if (!combined) {
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
        body: JSON.stringify({ username, keywords: combined, tone: tone || undefined }),
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
        <p className="text-foreground-muted text-sm">Add keywords or moods one by one; use "Add another" for more (max 10). Enter keywords and we’ll generate a short diary entry, analyze its emotion, and save it.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <span className="block text-sm font-medium text-foreground">Keywords / mood</span>
          {keywordBoxes.map((value, index) => (
            <div key={index}>
              <label className="sr-only">Keyword {index + 1}</label>
              <input
                type="text"
                className="w-full rounded-lg border border-midnight-lighter bg-midnight-light px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst"
                value={value}
                onChange={(e) => updateBox(index, e.target.value)}
                placeholder={index === 0 ? "e.g. exams, tired, friends" : "Another keyword or mood…"}
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
          disabled={loading}
          className="rounded-lg bg-sunburst px-5 py-2.5 text-sm font-semibold text-midnight hover:bg-sunburst-dark disabled:opacity-60 transition-colors"
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
