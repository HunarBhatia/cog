# Cogniva Frontend Integration Architecture

This frontend is structured so voice, transcription, voice-engine replies, and game-engine launches are isolated behind small client adapters.

## Frontend Flow

1. `VoiceMascot` is mounted globally from `src/app/layout.tsx`.
2. The page listens for configured wake phrases from `WAKE_PHRASES`.
3. When the browser hears `blah blah`, the voice agent opens and starts a turn.
4. During the turn, the frontend records audio with `MediaRecorder` and shows live transcription with Web Speech Recognition.
5. When the turn ends, `sendVoiceTurn` sends the transcript and optional audio blob to the voice engine.
6. The voice engine returns text, optional spoken audio, and optional intent data.
7. The frontend speaks the reply.
8. If the reply contains `gameCommand.action = START_GAME`, the frontend asks the game engine for a launch session.
9. The user is redirected to `/arcade/game?gameId=...&gameSession=...&autostart=1`.

## Configuration

Set these environment variables when backend services are ready:

```env
NEXT_PUBLIC_VOICE_TURN_ENDPOINT=https://voice-engine.example.com/v1/voice/turn
NEXT_PUBLIC_GAME_LAUNCH_ENDPOINT=https://game-engine.example.com/v1/game/session
NEXT_PUBLIC_GAME_EVENTS_ENDPOINT=https://game-engine.example.com/v1/game/events
```

If these variables are empty, the frontend uses local demo fallbacks.

## Voice Engine Endpoint

`POST /v1/voice/turn`

Request type: `multipart/form-data`

Fields:

```ts
{
  audio?: File;
  transcript: string;
  locale: string;
  route: string;
  sessionId: string;
}
```

Expected response:

```ts
{
  replyText: string;
  replyAudioUrl?: string;
  intent?: "START_GAME" | "CHAT" | "HELP" | "UNKNOWN";
  gameCommand?: {
    action: "START_GAME";
    gameId: string;
    source: "voice" | "ui" | "engine";
    transcript?: string;
  };
}
```

Notes:

- `replyText` is required because the frontend uses browser speech synthesis when `replyAudioUrl` is not provided.
- `gameCommand` is optional. Return it only when the voice engine wants the frontend to launch a game.
- The current default game id is `memory-garden-match`.

## Game Engine Launch Endpoint

`POST /v1/game/session`

Request type: `application/json`

```ts
{
  gameId: string;
  source: "voice" | "ui" | "engine";
  transcript?: string;
  sessionId: string;
}
```

Expected response:

```ts
{
  gameId: string;
  sessionId: string;
  launchPath: string;
  autostart: boolean;
}
```

Recommended response for the current frontend:

```json
{
  "gameId": "memory-garden-match",
  "sessionId": "game-session-id",
  "launchPath": "/arcade/game",
  "autostart": true
}
```

## Game Events Endpoint

`POST /v1/game/events`

Request type: `application/json`

```ts
{
  eventName: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}
```

Current events:

- `game_started`
- `card_revealed`
- `game_reset`

## Key Files

- `src/components/mascot/VoiceMascot.tsx`: global voice orchestrator.
- `src/lib/integrations/voiceEngineClient.ts`: voice-engine adapter.
- `src/lib/integrations/gameEngineClient.ts`: game-engine adapter.
- `src/lib/integrations/config.ts`: endpoint and wake-phrase configuration.
- `src/components/arcade/MemoryGardenGame.tsx`: canonical arcade game UI.
- `src/app/arcade/game/page.tsx`: canonical game route.
- `src/app/game-arena/page.tsx`: compatibility redirect.
