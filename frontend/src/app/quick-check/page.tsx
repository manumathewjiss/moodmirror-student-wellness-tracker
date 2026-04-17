"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

type MoodResult = {
  label: string;
  confidence: number;
  probabilities?: Record<string, number>;
};

export default function QuickCheckPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MoodResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username?.trim()) {
      setError("Please log in first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/mood-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, text: text.trim(), source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Request failed");
      setResult({ label: data.label, confidence: data.confidence, probabilities: data.probabilities ?? undefined });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (username === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-foreground-muted">Loading...</p>
      </main>
    );
  }

  if (!username) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-foreground-muted">Please <Link href="/" className="text-sunburst hover:underline font-medium">log in</Link> first to use Quick Check.</p>
      </main>
    );
  }

  const labelColor =
    result?.label === "positive" ? "text-emerald-400" :
    result?.label === "negative" ? "text-red-400" : "text-foreground-muted";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Quick Check</h1>
        <p className="text-foreground-muted text-sm">Enter some text and we&apos;ll analyze the emotional tone and save it to your history.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Your text</label>
          <textarea
            required
            rows={4}
            className="w-full rounded-lg border border-midnight-lighter bg-midnight-light px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-sunburst focus:ring-1 focus:ring-sunburst resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Today I felt stressed about work but had a nice walk in the evening."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sunburst px-5 py-2.5 text-sm font-semibold text-ink hover:bg-sunburst-dark disabled:opacity-60 transition-colors"
        >
          {loading ? "Analyzing..." : "Analyze & save"}
        </button>
      </form>

      {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-8 rounded-xl border border-midnight-lighter bg-midnight-light p-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Result</h2>
          <p className={`text-xl font-semibold ${labelColor}`}>{result.label}</p>
          <p className="text-foreground-muted text-sm mt-1">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          {result.probabilities && Object.keys(result.probabilities).length > 0 && (
            <div className="mt-4 flex gap-4 flex-wrap text-sm text-foreground-muted">
              {Object.entries(result.probabilities).map(([k, v]) => (
                <span key={k}>{k}: {(v * 100).toFixed(0)}%</span>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
