"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

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

type PatternInsights = {
  has_sufficient_data: boolean;
  total_entries: number;
  trend: {
    direction: string;
    slope: number | null;
    message: string;
  };
  weekly_rhythm: {
    scores: Record<string, number>;
    best_day: string | null;
    worst_day: string | null;
  };
  volatility: {
    level: string;
    score: number | null;
    mood_switches: number;
    message: string;
  };
  transitions: {
    matrix: Record<string, Record<string, number>>;
    next_day_prediction: string | null;
    next_day_confidence: number | null;
  };
  keyword_correlations: Array<{
    keyword: string;
    avg_score: number;
    count: number;
    association: string;
  }>;
  streaks: {
    logging_streak: number;
    current_positive_streak: number;
    longest_positive_streak: number;
  };
  insights: string[];
};

function moodToScore(label: string): number {
  const l = label?.toLowerCase();
  if (l === "positive") return 1;
  if (l === "negative") return -1;
  return 0;
}

function TrendIcon({ direction }: { direction: string }) {
  if (direction === "improving") return <span className="text-emerald-400 text-xl">↑</span>;
  if (direction === "declining") return <span className="text-red-400 text-xl">↓</span>;
  return <span className="text-slate-400 text-xl">→</span>;
}

function trendColor(direction: string) {
  if (direction === "improving") return "text-emerald-400";
  if (direction === "declining") return "text-red-400";
  return "text-slate-400";
}

function volatilityColor(level: string) {
  if (level === "low") return "text-emerald-400";
  if (level === "high") return "text-red-400";
  return "text-amber-400";
}

function predictionColor(label: string | null) {
  if (label === "positive") return "text-emerald-400";
  if (label === "negative") return "text-red-400";
  return "text-slate-400";
}

export default function InsightsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const [patterns, setPatterns] = useState<PatternInsights | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null;
    setUsername(stored);
    if (typeof window !== "undefined" && !stored) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/v1/mood-entries?username=${encodeURIComponent(username)}&limit=200`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
        else setEntries([]);
      })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!username) return;
    setPatternsLoading(true);
    fetch(`${API_BASE}/api/v1/insights?username=${encodeURIComponent(username)}&limit=60`)
      .then((res) => res.json())
      .then((data) => setPatterns(data))
      .catch(() => setPatterns(null))
      .finally(() => setPatternsLoading(false));
  }, [username]);

  const days = parseInt(range, 10);
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }, [days]);

  const filteredEntries = useMemo(
    () => entries.filter((e) => e.timestamp >= cutoff),
    [entries, cutoff]
  );

  const trendData = useMemo(() => {
    const byDay: Record<string, number[]> = {};
    filteredEntries.forEach((e) => {
      const date = e.timestamp.slice(0, 10);
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(moodToScore(e.label));
    });
    const sorted = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([date, scores]) => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      return {
        date,
        label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Math.round(avg * 100) / 100,
      };
    });
  }, [filteredEntries]);

  const calendarDays = useMemo(() => {
    const byDay: Record<string, { positive: number; negative: number; neutral: number }> = {};
    filteredEntries.forEach((e) => {
      const date = e.timestamp.slice(0, 10);
      const label = e.label?.toLowerCase();
      const mood = label === "positive" || label === "negative" || label === "neutral" ? label : "neutral";
      if (!byDay[date]) byDay[date] = { positive: 0, negative: 0, neutral: 0 };
      byDay[date][mood]++;
    });
    const dominant = (counts: { positive: number; negative: number; neutral: number }): "positive" | "negative" | "neutral" => {
      const max = Math.max(counts.positive, counts.negative, counts.neutral);
      if (counts.negative === max) return "negative";
      if (counts.positive === max) return "positive";
      return "neutral";
    };
    const out: { date: string; mood: "positive" | "negative" | "neutral" | "none"; label: string }[] = [];
    const start = new Date(cutoff);
    const end = new Date();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const counts = byDay[dateStr];
      out.push({
        date: dateStr,
        mood: counts ? dominant(counts) : "none",
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return out;
  }, [filteredEntries, cutoff]);

  const dayOfWeekData = useMemo(() => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<number, { positive: number; negative: number; neutral: number }> = {};
    for (let i = 0; i < 7; i++) counts[i] = { positive: 0, negative: 0, neutral: 0 };
    filteredEntries.forEach((e) => {
      const day = new Date(e.timestamp).getDay();
      const label = e.label?.toLowerCase();
      if (label === "positive") counts[day].positive++;
      else if (label === "negative") counts[day].negative++;
      else counts[day].neutral++;
    });
    return weekdays.map((name, i) => ({
      day: name,
      positive: counts[i].positive,
      negative: counts[i].negative,
      neutral: counts[i].neutral,
    }));
  }, [filteredEntries]);

  if (username === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-foreground-muted">Loading...</p>
      </main>
    );
  }

  if (!username) return null;

  const positiveKeywords = patterns?.keyword_correlations.filter((k) => k.association === "positive").slice(0, 8) ?? [];
  const negativeKeywords = patterns?.keyword_correlations.filter((k) => k.association === "negative").slice(0, 8) ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Insights</h1>
          <p className="text-foreground-muted text-sm">Mood patterns and analysis from your entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-foreground-muted text-sm">Last</span>
          <select
            value={range}
            onChange={(e) => setRange((e.target.value as "7" | "14" | "30") || "14")}
            className="rounded-lg border border-midnight-lighter bg-midnight-light px-3 py-1.5 text-sm text-foreground outline-none focus:border-sunburst"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
      </header>

      {loading && <p className="text-foreground-muted">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && filteredEntries.length === 0 && (
        <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-6 text-center">
          <p className="text-foreground-muted mb-2">No entries in the last {days} days.</p>
          <p className="text-sm text-foreground-muted">
            Use <Link href="/quick-check" className="text-sunburst hover:underline">Quick Check</Link> or{" "}
            <Link href="/diary" className="text-sunburst hover:underline">Diary</Link> to add entries, then come back here.
          </p>
        </div>
      )}

      {!loading && !error && filteredEntries.length > 0 && (
        <div className="space-y-8">

          {/* ── Pattern Engine Section ── */}
          {patternsLoading ? (
            <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
              <p className="text-foreground-muted text-sm">Analysing your patterns...</p>
            </div>
          ) : patterns && !patterns.has_sufficient_data ? (
            <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-5 flex items-start gap-3">
              <span className="text-2xl mt-0.5">🔒</span>
              <div>
                <p className="text-foreground font-medium text-sm">Deeper insights unlock soon</p>
                <p className="text-foreground-muted text-sm mt-0.5">
                  Keep logging — pattern analysis becomes available after a few more entries.
                </p>
              </div>
            </div>
          ) : patterns ? (
            <div className="space-y-6">

              {/* AI insight cards */}
              {patterns.insights.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-3">What your data says</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {patterns.insights.map((insight, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-midnight-lighter bg-midnight-light px-4 py-3 flex items-start gap-3"
                      >
                        <span className="text-sunburst text-lg mt-0.5">✦</span>
                        <p className="text-foreground text-sm leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Stats row: streaks + trend */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">At a glance</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-4 text-center">
                    <p className="text-3xl font-bold text-sunburst">{patterns.streaks.logging_streak}</p>
                    <p className="text-foreground-muted text-xs mt-1">Day logging streak</p>
                  </div>
                  <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{patterns.streaks.current_positive_streak}</p>
                    <p className="text-foreground-muted text-xs mt-1">Positive streak</p>
                  </div>
                  <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{patterns.streaks.longest_positive_streak}</p>
                    <p className="text-foreground-muted text-xs mt-1">Longest positive ever</p>
                  </div>
                  <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-4 text-center">
                    <p className="text-3xl font-bold text-foreground">{patterns.total_entries}</p>
                    <p className="text-foreground-muted text-xs mt-1">Total entries</p>
                  </div>
                </div>
              </section>

              {/* Trend + Volatility + Prediction */}
              <section className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-5">
                  <p className="text-foreground-muted text-xs uppercase tracking-wide mb-2">Overall trend</p>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendIcon direction={patterns.trend.direction} />
                    <p className={`text-lg font-bold capitalize ${trendColor(patterns.trend.direction)}`}>
                      {patterns.trend.direction === "insufficient_data" ? "Not enough data" : patterns.trend.direction}
                    </p>
                  </div>
                  <p className="text-foreground-muted text-xs leading-relaxed">{patterns.trend.message}</p>
                </div>

                <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-5">
                  <p className="text-foreground-muted text-xs uppercase tracking-wide mb-2">Mood stability</p>
                  <p className={`text-lg font-bold capitalize mb-1 ${volatilityColor(patterns.volatility.level)}`}>
                    {patterns.volatility.level === "insufficient_data" ? "Not enough data" : patterns.volatility.level}
                  </p>
                  <p className="text-foreground-muted text-xs leading-relaxed">{patterns.volatility.message}</p>
                  {patterns.volatility.mood_switches > 0 && (
                    <p className="text-foreground-muted text-xs mt-1">{patterns.volatility.mood_switches} mood switches</p>
                  )}
                </div>

                <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-5">
                  <p className="text-foreground-muted text-xs uppercase tracking-wide mb-2">Tomorrow&apos;s prediction</p>
                  {patterns.transitions.next_day_prediction ? (
                    <>
                      <p className={`text-lg font-bold capitalize mb-1 ${predictionColor(patterns.transitions.next_day_prediction)}`}>
                        {patterns.transitions.next_day_prediction}
                      </p>
                      <p className="text-foreground-muted text-xs">
                        {Math.round((patterns.transitions.next_day_confidence ?? 0) * 100)}% confidence based on your patterns
                      </p>
                    </>
                  ) : (
                    <p className="text-foreground-muted text-xs">Not enough data yet for prediction.</p>
                  )}
                </div>
              </section>

              {/* Weekly rhythm best/worst day */}
              {(patterns.weekly_rhythm.best_day || patterns.weekly_rhythm.worst_day) && (
                <section className="grid gap-3 sm:grid-cols-2">
                  {patterns.weekly_rhythm.best_day && (
                    <div className="rounded-xl border border-emerald-800/40 bg-emerald-900/20 p-5">
                      <p className="text-emerald-400 text-xs uppercase tracking-wide mb-1">Your best day</p>
                      <p className="text-2xl font-bold text-foreground">{patterns.weekly_rhythm.best_day}</p>
                      <p className="text-foreground-muted text-xs mt-1">You tend to feel most positive on this day.</p>
                    </div>
                  )}
                  {patterns.weekly_rhythm.worst_day && (
                    <div className="rounded-xl border border-red-800/40 bg-red-900/20 p-5">
                      <p className="text-red-400 text-xs uppercase tracking-wide mb-1">Your toughest day</p>
                      <p className="text-2xl font-bold text-foreground">{patterns.weekly_rhythm.worst_day}</p>
                      <p className="text-foreground-muted text-xs mt-1">You tend to feel lower on this day.</p>
                    </div>
                  )}
                </section>
              )}

              {/* Keyword triggers */}
              {(positiveKeywords.length > 0 || negativeKeywords.length > 0) && (
                <section className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-1">Your personal triggers</h2>
                  <p className="text-foreground-muted text-sm mb-5">
                    Words that consistently appear on your good or bad days.
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {positiveKeywords.length > 0 && (
                      <div>
                        <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-3">Lifts your mood</p>
                        <div className="flex flex-wrap gap-2">
                          {positiveKeywords.map((kw) => (
                            <span
                              key={kw.keyword}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 px-3 py-1 text-sm text-emerald-300"
                            >
                              {kw.keyword}
                              <span className="text-emerald-500 text-xs">{kw.count}×</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {negativeKeywords.length > 0 && (
                      <div>
                        <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-3">Brings you down</p>
                        <div className="flex flex-wrap gap-2">
                          {negativeKeywords.map((kw) => (
                            <span
                              key={kw.keyword}
                              className="inline-flex items-center gap-1.5 rounded-full bg-red-900/40 border border-red-700/40 px-3 py-1 text-sm text-red-300"
                            >
                              {kw.keyword}
                              <span className="text-red-500 text-xs">{kw.count}×</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

            </div>
          ) : null}

          {/* ── Existing Charts ── */}
          <section className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Mood trend line</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Daily average: +1 = positive, 0 = neutral, −1 = negative. Higher line = better mood.
            </p>
            {trendData.length === 0 ? (
              <p className="text-foreground-muted text-sm">No data to show.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#383f4b" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <YAxis
                      domain={[-1.2, 1.2]}
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      ticks={[-1, 0, 1]}
                      tickFormatter={(v) => (v === 1 ? "Positive" : v === -1 ? "Negative" : "Neutral")}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#2e3642",
                        border: "1px solid #383f4b",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                      }}
                      formatter={(value: number | undefined) => [
                        value === 1 ? "Positive" : value === -1 ? "Negative" : "Neutral",
                        value ?? 0,
                      ]}
                      labelFormatter={(_, payload) => payload[0]?.payload?.date}
                    />
                    <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#F8C61E"
                      strokeWidth={2}
                      dot={{ fill: "#F8C61E", r: 3 }}
                      name="Mood score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Calendar heatmap</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Each cell is a day. Color = dominant mood that day; empty = no entry.
            </p>
            <div className="flex flex-wrap gap-1">
              {calendarDays.map((day) => (
                <div
                  key={day.date}
                  title={`${day.label}: ${day.mood === "none" ? "No entry" : day.mood}`}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium ${
                    day.mood === "positive"
                      ? "bg-emerald-600 text-white"
                      : day.mood === "negative"
                        ? "bg-red-600 text-white"
                        : day.mood === "neutral"
                          ? "bg-slate-500 text-white"
                          : "bg-midnight border border-midnight-lighter text-foreground-muted"
                  }`}
                >
                  {new Date(day.date).getDate()}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600" /> Positive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-500" /> Neutral
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-600" /> Negative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-midnight-lighter bg-midnight" /> No entry
              </span>
            </div>
          </section>

          <section className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Day of week</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Number of entries by weekday — showing how your mood distributes across the week.
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#383f4b" />
                  <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#2e3642",
                      border: "1px solid #383f4b",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="positive" stackId="dow" fill="#22c55e" name="Positive" />
                  <Bar dataKey="neutral" stackId="dow" fill="#94a3b8" name="Neutral" />
                  <Bar dataKey="negative" stackId="dow" fill="#ef4444" name="Negative" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <p className="text-foreground-muted text-xs">
            Based on {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"} in the last {days} days.
          </p>
        </div>
      )}
    </main>
  );
}
