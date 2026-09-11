import { DEFAULT_GAME_PATH, GAME_EVENTS_ENDPOINT, GAME_LAUNCH_ENDPOINT } from "./config";
import type { GameLaunchRequest, GameLaunchResponse } from "./contracts";

const GAME_PATHS: Record<string, string> = {
  "memory-garden-match": "/arcade/game",
  "match-the-pairs": "/arcade/game",
  "match-pairs": "/arcade/game",
  "sequence-the-task": "/arcade/sequence-task",
  "sequence-task": "/arcade/sequence-task",
  "tap-the-target": "/arcade/tap-target",
  "tap-target": "/arcade/tap-target",
};

export async function launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
  const targetPath = (request.gameId && GAME_PATHS[request.gameId]) || DEFAULT_GAME_PATH;

  if (!GAME_LAUNCH_ENDPOINT) {
    return {
      gameId: request.gameId,
      sessionId: request.sessionId,
      launchPath: targetPath,
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

  const data = await response.json();
  return {
    ...data,
    launchPath: data.launchPath || targetPath,
  };
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
