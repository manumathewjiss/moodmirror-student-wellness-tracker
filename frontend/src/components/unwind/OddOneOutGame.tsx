"use client";

import { useCallback, useMemo, useState } from "react";
import { recordMinigame, type MinigameStatDTO } from "@/lib/minigameApi";

const PAIRS: { common: string; odd: string; hint: string }[] = [
  { common: "🍎", odd: "🍐", hint: "fruit" },
  { common: "⭐", odd: "✨", hint: "sparkle" },
  { common: "🐶", odd: "🐱", hint: "pet" },
  { common: "🔵", odd: "🟣", hint: "circle" },
  { common: "🌙", odd: "☀️", hint: "sky" },
  { common: "🎵", odd: "🎶", hint: "music" },
  { common: "⚽", odd: "🏀", hint: "ball" },
  { common: "🍕", odd: "🍔", hint: "food" },
];

function makeRound(level: number) {
  const pair = PAIRS[level % PAIRS.length]!;
  const oddIdx = Math.floor(Math.random() * 9);
  const cells = Array.from({ length: 9 }, (_, i) => (i === oddIdx ? pair.odd : pair.common));
  return { cells, oddIdx, hint: pair.hint };
}

type Props = {
  username: string;
  apiBase: string;
  stat?: MinigameStatDTO;
  onBack: () => void;
  onStatsUpdated: () => void;
};

export default function OddOneOutGame({ username, apiBase, stat, onBack, onStatsUpdated }: Props) {
  const [level, setLevel] = useState(0);
  const [round, setRound] = useState(() => makeRound(0));
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState<string>("Tap the one that doesn’t match the others.");
  const [locked, setLocked] = useState(false);

  const subtitle = useMemo(() => `Round ${level + 1} · Streak ${streak}`, [level, streak]);

  const pushRound = useCallback(() => {
    setLocked(false);
    setLevel((l) => {
      const next = l + 1;
      setRound(makeRound(next));
      return next;
    });
    setStatus("Find the odd one out again.");
  }, []);

  const endGame = useCallback(
    async (finalStreak: number, roundsPlayed: number, correct: number) => {
      setLocked(true);
      setStatus(`Run over — streak ${finalStreak}. Tap any tile to try again.`);
      try {
        await recordMinigame(apiBase, {
          username,
          game_key: "odd_one_out",
          plays: roundsPlayed,
          wins: correct,
          report_streak: finalStreak,
        });
        onStatsUpdated();
      } catch {
        /* ignore */
      }
    },
    [apiBase, username, onStatsUpdated]
  );

  const resetFull = () => {
    setLevel(0);
    setStreak(0);
    setRound(makeRound(0));
    setLocked(false);
    setStatus("Tap the one that doesn’t match the others.");
  };

  async function onCell(i: number) {
    if (status.startsWith("Run over") && locked) {
      resetFull();
      return;
    }
    if (locked) return;
    if (i === round.oddIdx) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setLocked(true);
      setStatus("Correct — next round!");
      window.setTimeout(() => pushRound(), 450);
    } else {
      await endGame(streak, level + 1, streak);
    }
  }

  return (
    <div className="rounded-2xl border border-sunburst/30 bg-gradient-to-b from-midnight-light/95 to-midnight/90 p-6 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-sunburst tracking-tight">Odd one out</h2>
          <p className="text-foreground-muted text-sm mt-0.5">{subtitle}</p>
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
          <span className="rounded-full border border-violet-500/40 bg-violet-950/40 px-3 py-1 text-violet-200">
            Best streak: <strong>{stat.best_streak}</strong>
          </span>
          <span className="rounded-full border border-midnight-lighter bg-midnight/60 px-3 py-1 text-foreground-muted">
            Total correct: <strong className="text-foreground">{stat.wins}</strong>
          </span>
        </div>
      )}

      <p className="text-sm text-foreground mb-3 text-center">{status}</p>
      <p className="text-[11px] text-foreground-muted text-center mb-4 uppercase tracking-wide">
        Theme: {round.hint}
      </p>

      <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-2">
        {round.cells.map((emoji, i) => (
          <button
            key={`${level}-${i}-${emoji}`}
            type="button"
            onClick={() => onCell(i)}
            className="flex aspect-square items-center justify-center rounded-xl border border-midnight-lighter bg-midnight/60 text-4xl transition hover:scale-[1.03] hover:border-sunburst/50 hover:bg-midnight-light active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
