"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordMinigame, type MinigameStatDTO } from "@/lib/minigameApi";

type Mark = "X" | "O" | null;
type Board = Mark[];

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(b: Board): "X" | "O" | "draw" | null {
  for (const [a, c, d] of WIN_LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a] as "X" | "O";
  }
  if (b.every((cell) => cell !== null)) return "draw";
  return null;
}

function minimax(board: Board, isMaximizing: boolean): number {
  const w = checkWinner(board);
  if (w === "O") return 10;
  if (w === "X") return -10;
  if (w === "draw") return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      const next = [...board] as Board;
      next[i] = "O";
      best = Math.max(best, minimax(next, false));
    }
    return best;
  }
  let best = Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const next = [...board] as Board;
    next[i] = "X";
    best = Math.min(best, minimax(next, true));
  }
  return best;
}

function aiPick(board: Board): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const next = [...board] as Board;
    next[i] = "O";
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
}

type Props = {
  username: string;
  apiBase: string;
  stat?: MinigameStatDTO;
  onBack: () => void;
  onStatsUpdated: () => void;
};

export default function TicTacToeGame({ username, apiBase, stat, onBack, onStatsUpdated }: Props) {
  const [board, setBoard] = useState<Board>(() => Array(9).fill(null) as Board);
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [status, setStatus] = useState<string>("Your turn — you are ✕");
  const [gameOver, setGameOver] = useState(false);
  const recordedRef = useRef(false);

  const reset = () => {
    setBoard(Array(9).fill(null) as Board);
    setTurn("X");
    setStatus("Your turn — you are ✕");
    setGameOver(false);
    recordedRef.current = false;
  };

  const submitResult = useCallback(
    async (outcome: "win" | "loss" | "draw") => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      try {
        await recordMinigame(apiBase, {
          username,
          game_key: "tic_tac_toe",
          plays: 1,
          wins: outcome === "win" ? 1 : 0,
        });
        onStatsUpdated();
      } catch {
        recordedRef.current = false;
      }
    },
    [apiBase, username, onStatsUpdated]
  );

  useEffect(() => {
    const w = checkWinner(board);
    if (!w) return;
    setGameOver(true);
    if (w === "X") {
      setStatus("You won — nice!");
      void submitResult("win");
    } else if (w === "O") {
      setStatus("Computer wins this round.");
      void submitResult("loss");
    } else {
      setStatus("Draw — evenly matched.");
      void submitResult("draw");
    }
  }, [board, submitResult]);

  useEffect(() => {
    if (gameOver || turn !== "O") return;
    if (checkWinner(board)) return;
    const t = window.setTimeout(() => {
      setBoard((prev) => {
        const w = checkWinner(prev);
        if (w) return prev;
        const move = aiPick(prev);
        if (move < 0) return prev;
        const next = [...prev] as Board;
        next[move] = "O";
        return next;
      });
      setTurn("X");
      setStatus("Your turn — you are ✕");
    }, 420);
    return () => window.clearTimeout(t);
  }, [turn, gameOver, board]);

  function onCellClick(i: number) {
    if (gameOver || turn !== "X" || board[i]) return;
    const next = [...board] as Board;
    next[i] = "X";
    setBoard(next);
    setTurn("O");
    setStatus("Computer is thinking…");
  }

  return (
    <div className="rounded-2xl border border-sunburst/30 bg-gradient-to-b from-midnight-light/95 to-midnight/90 p-6 shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-sunburst tracking-tight">Tic Tac Toe</h2>
          <p className="text-foreground-muted text-sm mt-0.5">Play ✕ against the computer (○). Unwinnable AI — try your best.</p>
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
        <div className="flex flex-wrap gap-3 mb-6 text-xs">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-emerald-200">
            Wins vs AI: <strong className="text-emerald-100">{stat.wins}</strong>
          </span>
          <span className="rounded-full border border-midnight-lighter bg-midnight/60 px-3 py-1.5 text-foreground-muted">
            Games played: <strong className="text-foreground">{stat.plays}</strong>
          </span>
        </div>
      )}

      <p className={`text-center text-sm font-medium mb-4 ${gameOver ? "text-sunburst" : "text-foreground"}`}>{status}</p>

      <div className="mx-auto grid w-full max-w-[220px] grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={gameOver || turn !== "X" || cell !== null}
            onClick={() => onCellClick(i)}
            className={`flex aspect-square items-center justify-center rounded-xl border-2 text-3xl font-bold transition-all
              ${
                cell === "X"
                  ? "border-sunburst/60 bg-sunburst/15 text-sunburst"
                  : cell === "O"
                    ? "border-cyan-400/50 bg-cyan-950/40 text-cyan-200"
                    : "border-midnight-lighter bg-midnight/50 text-foreground-muted hover:border-sunburst/40 hover:bg-midnight-light/80 disabled:opacity-40"
              }`}
          >
            {cell ?? ""}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={reset}
        className="mt-6 w-full rounded-xl bg-sunburst py-3 text-sm font-semibold text-ink shadow-lg shadow-sunburst/20 transition hover:bg-sunburst-dark"
      >
        New round
      </button>
    </div>
  );
}
