import { DEFAULT_GAME_PATH, GAME_EVENTS_ENDPOINT, GAME_LAUNCH_ENDPOINT } from "./config";
import type { GameLaunchRequest, GameLaunchResponse } from "./contracts";

export async function launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
  if (!GAME_LAUNCH_ENDPOINT) {
    return {
      gameId: request.gameId,
      sessionId: request.sessionId,
      launchPath: DEFAULT_GAME_PATH,
      autostart: true,
    };
  }

  const response = await fetch(GAME_LAUNCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Game launch request failed with ${response.status}`);
  }

  return response.json();
}

export async function sendGameEvent(eventName: string, payload: Record<string, unknown>) {
  if (!GAME_EVENTS_ENDPOINT) {
    return;
  }

  await fetch(GAME_EVENTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventName,
      payload,
      occurredAt: new Date().toISOString(),
    }),
  });
}

export { postGameScore } from "./dashboardClient";

