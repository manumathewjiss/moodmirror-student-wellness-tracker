"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

type MoodEntry = {
  id: string;
  timestamp: string;
  source: string;
  raw_text: string;
  diary_text: string | null;
  label: string;
  confidence: number;
};

export default function HistoryPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null);
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/v1/mood-entries?username=${encodeURIComponent(username)}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
        else setEntries([]);
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, [username]);

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
        <p className="text-foreground-muted">Please <Link href="/" className="text-sunburst hover:underline font-medium">log in</Link> first to see your history.</p>
      </main>
    );
  }

  const labelColor = (label: string) =>
    label === "positive" ? "text-emerald-400" :
    label === "negative" ? "text-red-400" : "text-foreground-muted";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">History</h1>
        <p className="text-foreground-muted text-sm">Your recent mood entries (Quick Check and Diary).</p>
      </header>

      {loading && <p className="text-foreground-muted">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-foreground-muted">No entries yet. Try <Link href="/quick-check" className="text-sunburst hover:underline font-medium">Quick Check</Link> or <Link href="/diary" className="text-sunburst hover:underline font-medium">Diary</Link>.</p>
      )}

      {!loading && entries.length > 0 && (
        <ul className="space-y-4">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-midnight-lighter bg-midnight-light p-4">
              <div className="flex items-center justify-between text-xs text-foreground-muted mb-2">
                <span>{new Date(e.timestamp).toLocaleString()}</span>
                <span className="capitalize font-medium text-sunburst">{e.source}</span>
              </div>
              <p className="text-foreground text-sm mb-2 whitespace-pre-wrap break-words">
                {e.diary_text || e.raw_text}
              </p>
              <p className={`text-sm font-medium ${labelColor(e.label)}`}>{e.label} ({(e.confidence * 100).toFixed(0)}%)</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
