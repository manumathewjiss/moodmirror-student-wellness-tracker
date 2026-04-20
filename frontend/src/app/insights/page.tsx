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

import {
  moodLabelForCalendar,
  pickCalendarAdvice,
  type CalendarMood,
} from "./moodCalendarAdvice";

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

const CONTRACTION_FRAGMENTS = new Set([
  "couldn", "wouldn", "shouldn", "don", "doesn", "didn", "wasn", "weren", "isn",
  "haven", "hasn", "hadn", "mightn", "mustn", "needn", "ain",
]);

function normalizeKwToken(kw: string): string {
  return kw
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/'+$/g, "")
    .trim();
}

function isContractionFragmentKeyword(kw: string): boolean {
  const k = normalizeKwToken(kw);
  if (CONTRACTION_FRAGMENTS.has(k)) return true;
  if (k.endsWith("'") && CONTRACTION_FRAGMENTS.has(k.slice(0, -1))) return true;
  return false;
}

/** API may still return em dashes from an older backend; normalize for display. */
function stripEmDashUi(s: string): string {
  return s
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*,+/g, ", ")
    .trim();
}

function shouldHideKeywordInsightLine(line: string): boolean {
  const m = line.match(/^'([^']+)'/);
  if (!m?.[1]) return false;
  return isContractionFragmentKeyword(m[1]);
}

/** YYYY-MM-DD as local midnight (not UTC: date-only ISO strings parse as UTC and shift labels in many timezones). */
function parseYmdLocal(ymd: string): Date {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined || [y, m, d].some((n) => Number.isNaN(n))) {
    return new Date(ymd);
  }
  return new Date(y, m - 1, d);
}

function formatShortMonthDayYmd(ymd: string): string {
  return parseYmdLocal(ymd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Local calendar date key for a Date (avoid toISOString().slice(0,10) shifting the day across timezones). */
function formatDateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Bucket entries by the user's local calendar day (not the UTC prefix of ISO strings). */
function localDateKeyFromTimestamp(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp.slice(0, 10);
  return formatDateKeyLocal(d);
}

type DayCellMood = "positive" | "negative" | "neutral" | "none";

function earliestEntryDateKey(entries: MoodEntry[]): string | null {
  if (entries.length === 0) return null;
  let min = Infinity;
  for (const e of entries) {
    const t = new Date(e.timestamp).getTime();
    if (!Number.isNaN(t)) min = Math.min(min, t);
  }
  if (min === Infinity) return null;
  return formatDateKeyLocal(new Date(min));
}

/** Inclusive list of calendar months between two YYYY-MM-DD dates (local). */
function monthRangesBetween(firstYmd: string, lastYmd: string): Array<{ y: number; m: number }> {
  const a = parseYmdLocal(firstYmd);
  const b = parseYmdLocal(lastYmd);
  const out: Array<{ y: number; m: number }> = [];
  let y = a.getFullYear();
  let m = a.getMonth();
  const endY = b.getFullYear();
  const endM = b.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ y, m });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

const CALENDAR_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function InsightsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"7" | "14" | "30">("14");
  const [patterns, setPatterns] = useState<PatternInsights | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

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
    fetch(`${API_BASE}/api/v1/mood-entries?username=${encodeURIComponent(username)}&limit=2000`)
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
      const date = localDateKeyFromTimestamp(e.timestamp);
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(moodToScore(e.label));
    });
    const sorted = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([date, scores]) => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      return {
        date,
        score: Math.round(avg * 100) / 100,
      };
    });
  }, [filteredEntries]);

  const moodByDateAll = useMemo(() => {
    const byDay: Record<string, { positive: number; negative: number; neutral: number }> = {};
    entries.forEach((e) => {
      const date = localDateKeyFromTimestamp(e.timestamp);
      const label = e.label?.toLowerCase();
      const mood = label === "positive" || label === "negative" || label === "neutral" ? label : "neutral";
      if (!byDay[date]) byDay[date] = { positive: 0, negative: 0, neutral: 0 };
      byDay[date][mood]++;
    });
    return byDay;
  }, [entries]);

  const historyCalendarDays = useMemo(() => {
    const first = earliestEntryDateKey(entries);
    const today = formatDateKeyLocal(new Date());
    if (!first) return [];
    const dominant = (counts: { positive: number; negative: number; neutral: number }): "positive" | "negative" | "neutral" => {
      const max = Math.max(counts.positive, counts.negative, counts.neutral);
      if (counts.negative === max) return "negative";
      if (counts.positive === max) return "positive";
      return "neutral";
    };
    const out: { date: string; mood: DayCellMood; label: string }[] = [];
    const start = parseYmdLocal(first);
    const end = parseYmdLocal(today);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateKeyLocal(d);
      const counts = moodByDateAll[dateStr];
      out.push({
        date: dateStr,
        mood: counts ? dominant(counts) : "none",
        label: formatShortMonthDayYmd(dateStr),
      });
    }
    return out;
  }, [entries, moodByDateAll]);

  const historyDayMap = useMemo(() => {
    const m = new Map<string, (typeof historyCalendarDays)[number]>();
    historyCalendarDays.forEach((d) => m.set(d.date, d));
    return m;
  }, [historyCalendarDays]);

  const calendarMonths = useMemo(() => {
    if (historyCalendarDays.length === 0) return [];
    const first = historyCalendarDays[0]!.date;
    const last = historyCalendarDays[historyCalendarDays.length - 1]!.date;
    return monthRangesBetween(first, last);
  }, [historyCalendarDays]);

  useEffect(() => {
    if (historyCalendarDays.length === 0) return;
    setSelectedCalendarDate((prev) => {
      if (prev && historyCalendarDays.some((d) => d.date === prev)) return prev;
      for (let i = historyCalendarDays.length - 1; i >= 0; i--) {
        if (historyCalendarDays[i]!.mood !== "none") return historyCalendarDays[i]!.date;
      }
      return historyCalendarDays[historyCalendarDays.length - 1]!.date;
    });
  }, [historyCalendarDays]);

  const selectedCalendarDay = useMemo(() => {
    if (!selectedCalendarDate) return null;
    return historyDayMap.get(selectedCalendarDate) ?? null;
  }, [historyDayMap, selectedCalendarDate]);

  const entriesOnSelectedDay = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return entries
      .filter((e) => localDateKeyFromTimestamp(e.timestamp) === selectedCalendarDate)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, selectedCalendarDate]);

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

  const positiveKeywords =
    patterns?.keyword_correlations
      .filter((k) => k.association === "positive" && !isContractionFragmentKeyword(k.keyword))
      .slice(0, 8) ?? [];
  const negativeKeywords =
    patterns?.keyword_correlations
      .filter((k) => k.association === "negative" && !isContractionFragmentKeyword(k.keyword))
      .slice(0, 8) ?? [];

  const displayInsightLines =
    patterns?.insights
      .filter((line) => !shouldHideKeywordInsightLine(line))
      .map(stripEmDashUi) ?? [];

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

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-6 text-center">
          <p className="text-foreground-muted mb-2">No entries yet.</p>
          <p className="text-sm text-foreground-muted">
            Use <Link href="/quick-check" className="text-sunburst hover:underline">Quick Check</Link> or{" "}
            <Link href="/diary" className="text-sunburst hover:underline">Diary</Link> to add entries, then come back here.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
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
                  Keep logging. Pattern analysis unlocks after a few more entries.
                </p>
              </div>
            </div>
          ) : patterns ? (
            <div className="space-y-6">

              {/* AI insight cards */}
              {displayInsightLines.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-3">What your data says</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {displayInsightLines.map((insight, i) => (
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
                  <p className="text-foreground-muted text-xs leading-relaxed">
                    {stripEmDashUi(patterns.trend.message)}
                  </p>
                </div>

                <div className="rounded-xl border border-midnight-lighter bg-midnight-light p-5">
                  <p className="text-foreground-muted text-xs uppercase tracking-wide mb-2">Mood stability</p>
                  <p className={`text-lg font-bold capitalize mb-1 ${volatilityColor(patterns.volatility.level)}`}>
                    {patterns.volatility.level === "insufficient_data" ? "Not enough data" : patterns.volatility.level}
                  </p>
                  <p className="text-foreground-muted text-xs leading-relaxed">
                    {stripEmDashUi(patterns.volatility.message)}
                  </p>
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
              Daily average: +1 = positive, 0 = neutral, -1 = negative. A higher line means a better mood.
            </p>
            {trendData.length === 0 ? (
              <p className="text-foreground-muted text-sm">
                No mood entries in the last {days} days. Open a longer window above, or use the full calendar below for
                your complete history.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#383f4b" />
                    <XAxis
                      dataKey="date"
                      type="category"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => formatShortMonthDayYmd(String(v))}
                    />
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
                      labelFormatter={(_, payload) => {
                        const ymd = payload[0]?.payload?.date as string | undefined;
                        if (!ymd) return "";
                        return formatShortMonthDayYmd(ymd);
                      }}
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
            <h2 className="text-lg font-semibold text-foreground mb-1">Calendar</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Full history from your first logged day through today. Color shows the dominant mood when you had entries;
              outlined days had no log. Tap a day to read your diary and a short note.
            </p>
            {historyCalendarDays.length === 0 ? (
              <p className="text-foreground-muted text-sm">No dates to show yet.</p>
            ) : (
              <>
                <div className="space-y-8">
                  {calendarMonths.map(({ y, m }) => {
                    const firstHist = historyCalendarDays[0]!.date;
                    const lastHist = historyCalendarDays[historyCalendarDays.length - 1]!.date;
                    const firstDow = new Date(y, m, 1).getDay();
                    const daysInMonth = new Date(y, m + 1, 0).getDate();
                    const monthTitle = new Date(y, m, 1).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <div key={`${y}-${m}`}>
                        <h3 className="text-sm font-semibold text-foreground mb-2">{monthTitle}</h3>
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-foreground-muted mb-1 text-center">
                          {CALENDAR_DOW.map((d) => (
                            <div key={d} className="py-0.5 font-medium">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                          {Array.from({ length: firstDow }, (_, i) => (
                            <div key={`pad-${y}-${m}-${i}`} className="aspect-square min-h-[1.75rem] sm:min-h-8" />
                          ))}
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const dayNum = i + 1;
                            const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                            const beforeRange = dateStr < firstHist;
                            const afterRange = dateStr > lastHist;
                            if (beforeRange || afterRange) {
                              return (
                                <div
                                  key={dateStr}
                                  className="aspect-square min-h-[1.75rem] sm:min-h-8 rounded flex items-center justify-center text-[10px] sm:text-xs text-foreground-muted/25 bg-midnight/40"
                                  aria-hidden
                                >
                                  {dayNum}
                                </div>
                              );
                            }
                            const day = historyDayMap.get(dateStr);
                            const mood = day?.mood ?? "none";
                            const isSelected = selectedCalendarDate === dateStr;
                            const cellClass =
                              mood === "positive"
                                ? "bg-emerald-600 text-white"
                                : mood === "negative"
                                  ? "bg-red-600 text-white"
                                  : mood === "neutral"
                                    ? "bg-slate-500 text-white"
                                    : "bg-midnight border border-midnight-lighter text-foreground-muted";
                            return (
                              <button
                                key={dateStr}
                                type="button"
                                title={`${day?.label ?? dateStr}: ${mood === "none" ? "No entry" : mood}`}
                                onClick={() => setSelectedCalendarDate(dateStr)}
                                className={`aspect-square min-h-[1.75rem] sm:min-h-8 rounded flex items-center justify-center text-[10px] sm:text-xs font-medium transition-[box-shadow,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-sunburst focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-light ${cellClass} ${
                                  isSelected
                                    ? "ring-2 ring-sunburst ring-offset-2 ring-offset-midnight-light scale-[1.03] z-[1]"
                                    : ""
                                }`}
                              >
                                {dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-foreground-muted">
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
                {selectedCalendarDay && (
                  <div className="mt-5 space-y-4">
                    <div
                      className={`rounded-lg border px-4 py-3 ${
                        selectedCalendarDay.mood === "positive"
                          ? "border-emerald-800/50 bg-emerald-950/30"
                          : selectedCalendarDay.mood === "negative"
                            ? "border-red-800/50 bg-red-950/30"
                            : selectedCalendarDay.mood === "neutral"
                              ? "border-slate-600/50 bg-slate-900/40"
                              : "border-midnight-lighter bg-midnight/80"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-1">
                        {parseYmdLocal(selectedCalendarDay.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                        {" · "}
                        {moodLabelForCalendar(selectedCalendarDay.mood as CalendarMood)}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {pickCalendarAdvice(selectedCalendarDay.mood as CalendarMood, selectedCalendarDay.date)}
                      </p>
                    </div>

                    {entriesOnSelectedDay.length > 0 && (
                      <div className="rounded-lg border border-midnight-lighter bg-midnight/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sunburst/90 mb-3">
                          Your entries that day
                        </p>
                        <ul className="space-y-4 list-none p-0 m-0">
                          {entriesOnSelectedDay.map((e) => {
                            const timeLabel = new Date(e.timestamp).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            });
                            const isDiary = e.source?.toLowerCase() === "diary";
                            return (
                              <li key={e.id} className="border-t border-midnight-lighter first:border-t-0 first:pt-0 pt-4">
                                <p className="text-[11px] text-foreground-muted mb-1">
                                  {isDiary ? "Diary" : "Quick check"} · {timeLabel} ·{" "}
                                  <span className="capitalize">{e.label}</span>
                                </p>
                                {isDiary && e.diary_text ? (
                                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {stripEmDashUi(e.diary_text)}
                                  </p>
                                ) : (
                                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                    {stripEmDashUi(e.raw_text)}
                                  </p>
                                )}
                                {isDiary && e.diary_text && e.raw_text && e.raw_text.trim() !== e.diary_text.trim() && (
                                  <p className="text-xs text-foreground-muted mt-2">
                                    <span className="font-medium text-foreground-muted">Keywords: </span>
                                    {stripEmDashUi(e.raw_text)}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {entriesOnSelectedDay.length === 0 && selectedCalendarDay.mood === "none" && (
                      <p className="text-sm text-foreground-muted">No entries logged on this day.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-xl border border-midnight-lighter bg-midnight-light p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Day of week</h2>
            <p className="text-foreground-muted text-sm mb-4">
              Number of entries by weekday, showing how your mood spreads across the week.
            </p>
            {filteredEntries.length === 0 ? (
              <p className="text-foreground-muted text-sm">
                No entries in the last {days} days to chart by weekday. The calendar above still shows your full history.
              </p>
            ) : (
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
            )}
          </section>

          <p className="text-foreground-muted text-xs">
            Charts use {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"} from the last {days}{" "}
            days. The calendar loads up to {entries.length} recent entries from your account for the full-date view (API
            limit 2000).
          </p>
        </div>
      )}
    </main>
  );
}
