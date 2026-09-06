import { postGameScore } from "@/lib/integrations/dashboardClient";

export interface GameResultPayload {
  gameId: string;
  playerName: string;
  score: number;
  completed: boolean;
  timeSeconds: number;
  moves: number;
  pairsFound: number;
  totalPairs: number;
}

/**
 * Fetches the IRT-recommended starting level for the memory domain.
 * Falls back to level 1 if the API is unavailable.
 */
export async function getRecommendedLevel(domain = "memory"): Promise<number> {
  try {
    const res = await fetch(`/api/irt/level?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) return 1;
    const data = await res.json();
    return typeof data.level === "number" ? data.level : 1;
  } catch {
    return 1;
  }
}

export interface IrtUpdateResult {
  domain: string;
  theta_old: number;
  theta_new: number;
  P: number;
  Q: number;
  M: number;
}

/**
 * Reports a completed game level to both:
 *  1. /api/irt/result  → updates the patient's IRT theta in ability_state.json
 *  2. Django /api/games/ → logs the score for the caregiver dashboard
 *
 * Returns the IRT response (theta_old / theta_new) for UI feedback.
 */
export async function sendGameResult(
  payload: GameResultPayload,
  level: number,
  result: 0 | 1,
  token: string | null,
  domain = "memory"
): Promise<IrtUpdateResult | null> {
  const score = payload.score;
  let irtResponse: IrtUpdateResult | null = null;

  // 1. Update IRT ability model
  try {
    const res = await fetch("/api/irt/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, level, result, score }),
    });
    if (res.ok) {
      irtResponse = await res.json();
    }
  } catch (err) {
    console.error("IRT result update failed:", err);
  }

  // 2. Log to Django for caregiver dashboard
  if (token) {
    try {
      await postGameScore(
        {
          game_type: payload.gameId,
          score: Math.round(score),
          difficulty: `level-${level}`,
        },
        token
      );
    } catch (err) {
      console.error("Django game score post failed:", err);
    }
  }

  return irtResponse;
}
