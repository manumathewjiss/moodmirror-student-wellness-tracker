export type GameKey = "tic_tac_toe" | "reaction_tap" | "odd_one_out" | "coin_flip";

export type MinigameStatDTO = {
  game_key: GameKey;
  plays: number;
  wins: number;
  best_reaction_ms: number | null;
  best_streak: number;
};

export async function fetchMinigameStats(apiBase: string, username: string): Promise<MinigameStatDTO[]> {
  const res = await fetch(
    `${apiBase}/api/v1/minigames/stats?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) throw new Error("Failed to load game stats");
  return res.json();
}

export type RecordPayload = {
  username: string;
  game_key: GameKey;
  plays?: number;
  wins?: number;
  reaction_ms?: number;
  report_streak?: number;
};

export async function recordMinigame(apiBase: string, payload: RecordPayload): Promise<MinigameStatDTO> {
  const res = await fetch(`${apiBase}/api/v1/minigames/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: payload.username,
      game_key: payload.game_key,
      plays: payload.plays ?? 1,
      wins: payload.wins ?? 0,
      reaction_ms: payload.reaction_ms,
      report_streak: payload.report_streak,
    }),
  });
  if (!res.ok) throw new Error("Failed to save score");
  return res.json();
}
