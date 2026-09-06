export type VoiceTurnStatus = "idle" | "wake-listening" | "listening" | "thinking" | "speaking" | "error";

export interface VoiceTurnRequest {
  audioBlob?: Blob | null;
  transcript: string;
  locale: string;
  route: string;
  sessionId: string;
  token?: string;
}

export interface GameLaunchCommand {
  action: "START_GAME";
  gameId: string;
  source: "voice" | "ui" | "engine";
  transcript?: string;
}

export interface VoiceTurnResponse {
  replyText: string;
  replyAudioUrl?: string;
  language?: string;
  intent?: "START_GAME" | "CHAT" | "HELP" | "UNKNOWN";
  gameCommand?: GameLaunchCommand;
}

export interface GameLaunchRequest {
  gameId: string;
  source: "voice" | "ui" | "engine";
  transcript?: string;
  sessionId: string;
}

export interface GameLaunchResponse {
  gameId: string;
  sessionId: string;
  launchPath: string;
  autostart: boolean;
}
