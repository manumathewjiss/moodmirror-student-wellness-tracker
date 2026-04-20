"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CoinFlipGame from "@/components/unwind/CoinFlipGame";
import OddOneOutGame from "@/components/unwind/OddOneOutGame";
import ReactionTapGame from "@/components/unwind/ReactionTapGame";
import TicTacToeGame from "@/components/unwind/TicTacToeGame";
import { fetchMinigameStats, type GameKey, type MinigameStatDTO } from "@/lib/minigameApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

type Active = null | "tic_tac_toe" | "reaction_tap" | "odd_one_out" | "coin_flip";

const CARDS: {
  id: Exclude<Active, null>;
  title: string;
  blurb: string;
  emoji: string;
  accent: string;
}[] = [
  {
    id: "tic_tac_toe",
    title: "Tic Tac Toe",
    blurb: "Classic grid — outsmart the machine (good luck).",
    emoji: "⭕",
    accent: "from-cyan-500/15 to-transparent border-cyan-500/30",
  },
  {
    id: "reaction_tap",
    title: "Reaction tap",
    blurb: "Wait for green, then strike like lightning.",
    emoji: "⚡",
    accent: "from-emerald-500/15 to-transparent border-emerald-500/30",
  },
  {
    id: "odd_one_out",
    title: "Odd one out",
    blurb: "Spot the emoji that breaks the pattern.",
    emoji: "🔍",
    accent: "from-violet-500/15 to-transparent border-violet-500/30",
  },
  {
    id: "coin_flip",
    title: "Coin flip",
    blurb: "Call it — build a streak of lucky guesses.",
    emoji: "🪙",
    accent: "from-amber-500/15 to-transparent border-amber-500/30",
  },
];

export default function UnwindClient() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [active, setActive] = useState<Active>(null);
  const [stats, setStats] = useState<Partial<Record<GameKey, MinigameStatDTO>>>({});
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("moodmirror_username") : null;
    setUsername(stored);
    if (typeof window !== "undefined" && !stored) {
      router.replace("/");
    }
  }, [router]);

  const loadStats = useCallback(async () => {
    if (!username) return;
    setStatsError(null);
    try {
      const rows = await fetchMinigameStats(API_BASE, username);
      setStats(Object.fromEntries(rows.map((r) => [r.game_key, r])) as Partial<Record<GameKey, MinigameStatDTO>>);
    } catch {
      setStatsError("Could not load scores — games still work; check your connection or API.");
    }
  }, [username]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (username === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-foreground-muted">Loading…</p>
      </main>
    );
  }

  if (!username) return null;

  function statLine(key: GameKey): string {
    const s = stats[key];
    if (!s) return "Play to record stats";
    if (key === "tic_tac_toe") return `${s.wins} wins · ${s.plays} games`;
    if (key === "reaction_tap")
      return s.best_reaction_ms != null ? `Best ${Math.round(s.best_reaction_ms)} ms` : `${s.plays} taps`;
    if (key === "odd_one_out") return `Streak ${s.best_streak} · ${s.wins} correct`;
    return `Streak ${s.best_streak} · ${s.wins} right / ${s.plays} flips`;
  }

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10 pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(252, 209, 22, 0.22), transparent), radial-gradient(ellipse 50% 40% at 100% 50%, rgba(34, 211, 238, 0.08), transparent)",
        }}
      />

      <header className="relative mb-10 text-center sm:text-left">
        <p className="text-sunburst/90 text-xs font-semibold uppercase tracking-[0.2em] mb-2">Mini breaks</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">Unwind</h1>
        <p className="text-foreground-muted text-sm max-w-xl leading-relaxed">
          Light, quick games to reset your brain. Scores sync to your account so you can see progress over time.
        </p>
        {statsError && <p className="text-amber-400/90 text-xs mt-3">{statsError}</p>}
      </header>

      {!active && (
        <div className="relative grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={`group text-left rounded-2xl border bg-gradient-to-br ${c.accent} border-midnight-lighter p-5 sm:p-6 transition hover:border-sunburst/50 hover:shadow-lg hover:shadow-sunburst/10 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sunburst focus-visible:ring-offset-2 focus-visible:ring-offset-midnight`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl drop-shadow-md" aria-hidden>
                  {c.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-sunburst group-hover:text-sunburst transition-colors">
                    {c.title}
                  </h2>
                  <p className="text-foreground-muted text-sm mt-1 leading-relaxed">{c.blurb}</p>
                  <p className="text-[11px] text-foreground-muted/80 mt-3 font-medium tabular-nums">
                    {statLine(c.id)}
                  </p>
                </div>
                <span className="text-sunburst/70 text-sm font-semibold shrink-0">Play →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {active === "tic_tac_toe" && (
        <TicTacToeGame
          username={username}
          apiBase={API_BASE}
          stat={stats.tic_tac_toe}
          onBack={() => setActive(null)}
          onStatsUpdated={loadStats}
        />
      )}
      {active === "reaction_tap" && (
        <ReactionTapGame
          username={username}
          apiBase={API_BASE}
          stat={stats.reaction_tap}
          onBack={() => setActive(null)}
          onStatsUpdated={loadStats}
        />
      )}
      {active === "odd_one_out" && (
        <OddOneOutGame
          username={username}
          apiBase={API_BASE}
          stat={stats.odd_one_out}
          onBack={() => setActive(null)}
          onStatsUpdated={loadStats}
        />
      )}
      {active === "coin_flip" && (
        <CoinFlipGame
          username={username}
          apiBase={API_BASE}
          stat={stats.coin_flip}
          onBack={() => setActive(null)}
          onStatsUpdated={loadStats}
        />
      )}
    </main>
  );
}
