"use client";

import { useRef, useState } from "react";
import { recordMinigame, type MinigameStatDTO } from "@/lib/minigameApi";

type Side = "heads" | "tails";

type Props = {
  username: string;
  apiBase: string;
  stat?: MinigameStatDTO;
  onBack: () => void;
  onStatsUpdated: () => void;
};

export default function CoinFlipGame({ username, apiBase, stat, onBack, onStatsUpdated }: Props) {
  const [pick, setPick] = useState<Side | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<Side | null>(null);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("Choose heads or tails, then flip.");

  const flipsRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);

  async function submitSession(plays: number, wins: number, bestStreak: number) {
    try {
      await recordMinigame(apiBase, {
        username,
        game_key: "coin_flip",
        plays,
        wins,
        report_streak: bestStreak,
      });
      onStatsUpdated();
    } catch {
      /* ignore */
    }
  }

  function resetSession() {
    flipsRef.current = 0;
    correctRef.current = 0;
    streakRef.current = 0;
    setStreak(0);
    setLanded(null);
    setMessage("New run — pick a side.");
  }

  async function flip() {
    if (!pick || spinning) return;
    setSpinning(true);
    setLanded(null);
    setMessage("In the air…");

    window.setTimeout(() => {
      const side: Side = Math.random() < 0.5 ? "heads" : "tails";
      setLanded(side);
      setSpinning(false);

      const right = pick === side;
      flipsRef.current += 1;

      if (right) {
        correctRef.current += 1;
        streakRef.current += 1;
        setStreak(streakRef.current);
        setMessage(`It’s ${side}. You called it — streak ${streakRef.current}`);
      } else {
        setMessage(`It’s ${side}. Run ends — you had ${streakRef.current} in a row.`);
        const s = streakRef.current;
        void submitSession(flipsRef.current, correctRef.current, s);
        streakRef.current = 0;
        setStreak(0);
        correctRef.current = 0;
        flipsRef.current = 0;
      }
    }, 700);
  }

  return (
    <div className="rounded-2xl border border-sunburst/30 bg-gradient-to-b from-midnight-light/95 to-midnight/90 p-6 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-sunburst tracking-tight">Coin flip</h2>
          <p className="text-foreground-muted text-sm mt-0.5">Call the toss — see how long your streak can go.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-sunburst/90 hover:text-sunburst transition-colors"
        >
          ← All games
        </button>
      </div>

      {stat && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          <span className="rounded-full border border-amber-500/40 bg-amber-950/35 px-3 py-1 text-amber-100">
            Best streak: <strong>{stat.best_streak}</strong>
          </span>
          <span className="rounded-full border border-midnight-lighter bg-midnight/60 px-3 py-1 text-foreground-muted">
            Correct calls (all time): <strong className="text-foreground">{stat.wins}</strong> · Flips:{" "}
            <strong className="text-foreground">{stat.plays}</strong>
          </span>
        </div>
      )}

      <div className="flex justify-center gap-3 mb-6">
        {(["heads", "tails"] as const).map((s) => (
          <button
            key={s}
            type="button"
            disabled={spinning}
            onClick={() => setPick(s)}
            className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold capitalize transition ${
              pick === s
                ? "border-sunburst bg-sunburst/20 text-sunburst"
                : "border-midnight-lighter bg-midnight/50 text-foreground-muted hover:border-sunburst/40"
            } disabled:opacity-50`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border-4 transition-all duration-500 ${
            spinning
              ? "border-sunburst scale-95 rotate-180 shadow-[0_0_48px_rgba(252,209,22,0.35)]"
              : landed
                ? landed === "heads"
                  ? "border-cyan-400 bg-gradient-to-br from-cyan-900/60 to-midnight shadow-lg"
                  : "border-violet-400 bg-gradient-to-br from-violet-900/50 to-midnight shadow-lg"
                : "border-midnight-lighter bg-midnight/70"
          }`}
        >
          <span className="text-center text-sm font-bold uppercase tracking-widest text-foreground px-2">
            {spinning ? "…" : landed ? landed : "?"}
          </span>
        </div>

        <p className="text-sm text-foreground text-center min-h-[3rem] px-2">{message}</p>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!pick || spinning}
            onClick={() => void flip()}
            className="rounded-xl bg-sunburst px-6 py-2.5 text-sm font-semibold text-ink shadow-lg shadow-sunburst/25 transition hover:bg-sunburst-dark disabled:opacity-40"
          >
            Flip
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="rounded-xl border border-midnight-lighter px-5 py-2.5 text-sm font-medium text-foreground-muted hover:border-sunburst/40 hover:text-foreground transition"
          >
            Reset run
          </button>
        </div>

        <p className="text-xs text-foreground-muted text-center">
          Streak counts only consecutive correct guesses. When you miss, we save this run to your stats.
        </p>
      </div>
    </div>
  );
}
