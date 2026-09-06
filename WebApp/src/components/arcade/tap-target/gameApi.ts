import { postGameScore } from "@/lib/integrations/dashboardClient";

export interface IrtUpdateResult {
  domain: string;
  theta_old: number;
  theta_new: number;
  P: number;
  Q: number;
  M: number;
}

export interface GameResultPayload {
  gameId: string;
  playerName: string;
  score: number;
  completed: boolean;
  timeSeconds: number;
  accuracy: number;
  wrongTaps?: number;
  misses?: number;
  averageReactionTime?: number;
  rounds?: number;
}

/** GET /api/irt/level?domain=attention → recommended level */
export async function getRecommendedLevel(domain = "attention"): Promise<number> {
  try {
    const res = await fetch(`/api/irt/level?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) return 1;
    const data = await res.json();
    return typeof data.level === "number" ? data.level : 1;
  } catch {
    return 1;
  }
}

/** POST /api/irt/result + Django game score log */
export async function sendGameResult(
  payload: GameResultPayload,
  level: number,
  result: 0 | 1,
  token: string | null,
  domain = "attention"
): Promise<IrtUpdateResult | null> {
  const score = payload.score;
  let irtResponse: IrtUpdateResult | null = null;

  try {
    const res = await fetch("/api/irt/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, level, result, score }),
    });
    if (res.ok) irtResponse = await res.json();
  } catch (err) {
    console.error("IRT result update failed:", err);
  }

  if (token) {
    try {
      await postGameScore(
        { game_type: payload.gameId, score: Math.round(score), difficulty: `level-${level}` },
        token
      );
    } catch (err) {
      console.error("Django game score post failed:", err);
    }
  }

  return irtResponse;
}
