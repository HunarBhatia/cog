export const WAKE_PHRASES = [
  "hello cogniva",
  "hey cogniva",
  "hi cogniva",
  "ok cogniva",
  "okay cogniva",
  "cogniva",
  "hello cog niva",
  "hey cog niva",
  "hi cog niva",
  "cog niva",
  "hello cognitive",
  "hey cognitive",
  "hello cogniba",
  "hey cogniba",
  "cogniba",
  "hello coniva",
  "hey coniva",
  "coniva",
  "hello kogniva",
  "hey kogniva",
  "kogniva",
  "hello cognita",
  "hey cognita",
  "namaste cogniva",
  "suno cogniva",
];

export const SLEEP_PHRASES = [
  "bye cogniva",
  "goodbye cogniva",
  "bye bye cogniva",
  "sleep cogniva",
  "go to sleep",
  "turn off",
  "stop listening",
];

export const DEFAULT_LOCALE = "en-US";

export const DJANGO_API_URL =
  process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://127.0.0.1:8000/api";

export const VOICE_TURN_ENDPOINT =
  process.env.NEXT_PUBLIC_VOICE_TURN_ENDPOINT || "/api/voice-turn";

export const GAME_LAUNCH_ENDPOINT =
  process.env.NEXT_PUBLIC_GAME_LAUNCH_ENDPOINT ?? "";

export const GAME_EVENTS_ENDPOINT =
  process.env.NEXT_PUBLIC_GAME_EVENTS_ENDPOINT ?? "";

export const DEFAULT_GAME_ID = "memory-garden-match";

export const DEFAULT_GAME_PATH = "/arcade/game";

