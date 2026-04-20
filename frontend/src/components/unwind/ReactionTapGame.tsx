"use client";

import { useCallback, useRef, useState } from "react";
import { recordMinigame, type MinigameStatDTO } from "@/lib/minigameApi";

type Phase = "intro" | "wait" | "go" | "early" | "result";

type Props = {
  username: string;
  apiBase: string;
  stat?: MinigameStatDTO;
  onBack: () => void;
  onStatsUpdated: () => void;
};

export default function ReactionTapGame({ username, apiBase, stat, onBack, onStatsUpdated }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [message, setMessage] = useState("Tap the button when the panel turns green — not before.");
  const goAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startRound = () => {
    clearTimers();
    setPhase("wait");
    setMessage("Wait for green…");
    goAtRef.current = null;
    const delay = 900 + Math.random() * 2800;
    timeoutRef.current = setTimeout(() => {
      goAtRef.current = performance.now();
      setPhase("go");
      setMessage("Now!");
    }, delay);
  };

  const recordBest = useCallback(
    async (ms: number) => {
      try {
        await recordMinigame(apiBase, {
          username,
          game_key: "reaction_tap",
          plays: 1,
          wins: 0,
          reaction_ms: Math.round(ms),
        });
        onStatsUpdated();
      } catch {
        /* ignore */
      }
    },
    [apiBase, username, onStatsUpdated]
  );

  const onTap = () => {
    if (phase === "intro") {
      startRound();
      return;
    }
    if (phase === "wait") {
      clearTimers();
      setPhase("early");
      setMessage("Too soon — wait for green next time.");
      goAtRef.current = null;
      return;
    }
    if (phase === "go" && goAtRef.current !== null) {
      const ms = performance.now() - goAtRef.current;
      setLastMs(ms);
      setPhase("result");
      setMessage(ms < 80 ? "Suspiciously fast — but we’ll take it." : "Nice reflexes.");
      void recordBest(ms);
      goAtRef.current = null;
      return;
    }
    if (phase === "early" || phase === "result") {
      startRound();
    }
  };

  const panelClass =
    phase === "go"
      ? "bg-emerald-500 shadow-[0_0_40px_rgba(34,197,94,0.45)] border-emerald-300"
      : phase === "wait"
        ? "bg-red-600/90 shadow-[0_0_30px_rgba(220,38,38,0.35)] border-red-400"
        : "bg-midnight-light border-midnight-lighter";

  return (
    <div className="rounded-2xl border border-sunburst/30 bg-gradient-to-b from-midnight-light/95 to-midnight/90 p-6 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-sunburst tracking-tight">Reaction tap</h2>
          <p className="text-foreground-muted text-sm mt-0.5">Wait for green, then tap as fast as you can.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-sunburst/90 hover:text-sunburst transition-colors"
        >
          ← All games
        </button>
      </div>

      {stat?.best_reaction_ms != null && (
        <p className="text-xs text-foreground-muted mb-4">
          Personal best:{" "}
          <strong className="text-emerald-300">{Math.round(stat.best_reaction_ms)} ms</strong> · Attempts logged:{" "}
          <strong className="text-foreground">{stat.plays}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={onTap}
        className={`relative w-full min-h-[200px] rounded-2xl border-2 transition-all duration-150 ${panelClass}`}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
          <span className="text-lg font-semibold text-white drop-shadow-md">{message}</span>
          {phase === "result" && lastMs !== null && (
            <span className="text-3xl font-bold tabular-nums text-white">{Math.round(lastMs)} ms</span>
          )}
          {phase === "intro" && (
            <span className="text-sm text-white/85">Tap anywhere here to start</span>
          )}
        </span>
      </button>

      <p className="text-center text-xs text-foreground-muted mt-4">
        Lower milliseconds = faster. Each green tap saves to your profile if it&apos;s a new best.
      </p>
    </div>
  );
}
