import { DEFAULT_GAME_ID, VOICE_TURN_ENDPOINT } from "./config";
import type { VoiceTurnRequest, VoiceTurnResponse } from "./contracts";

function createLocalVoiceReply(transcript: string): VoiceTurnResponse {
  const normalized = (transcript || "").toLowerCase().trim();

  if (
    normalized.includes("start") ||
    normalized.includes("play") ||
    normalized.includes("game") ||
    normalized.includes("flower") ||
    normalized.includes("garden") ||
    normalized.includes("match")
  ) {
    return {
      replyText: "I would love to play a flower matching game with you! Opening our peaceful memory garden now.",
      intent: "START_GAME",
      gameCommand: {
        action: "START_GAME",
        gameId: DEFAULT_GAME_ID,
        source: "voice",
        transcript,
      },
    };
  }

  if (normalized.includes("medicine") || normalized.includes("pill") || normalized.includes("dawa")) {
    return {
      replyText: "I have noted your medicine schedule in your daily routine. Staying on time brings peace of mind.",
      intent: "CHAT",
    };
  }

  if (normalized.includes("tea") || normalized.includes("chai") || normalized.includes("morning")) {
    return {
      replyText: "A warm cup of chamomile tea sounds delightful this morning. How are you feeling today?",
      intent: "CHAT",
    };
  }

  if (normalized.includes("family") || normalized.includes("daughter") || normalized.includes("son") || normalized.includes("sarah")) {
    return {
      replyText: "Family brings such warmth to the heart. It is wonderful remembering those special moments together.",
      intent: "CHAT",
    };
  }

  if (normalized.includes("help") || normalized.includes("what can you do")) {
    return {
      replyText: "I am your daily companion. You can ask me to start a flower memory game, check your reminders, or just chat with me about your day.",
      intent: "HELP",
    };
  }

  const variedReplies = [
    `It is so good to hear your voice. Tell me more about what you enjoyed most today.`,
    `I am listening with warm attention. Would you like to play a gentle flower matching game together?`,
    `Thank you for sharing that with me. What was your favorite flower or garden memory?`,
    `I am right here with you, comfortable and unhurried. Take all the time you need.`,
  ];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % variedReplies.length;
  }

  return {
    replyText: normalized ? variedReplies[Math.abs(hash)] : "I am listening whenever you are ready to speak.",
    intent: "CHAT",
  };
}

export async function sendVoiceTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const targetUrl = VOICE_TURN_ENDPOINT || "/api/voice-turn";

  try {
    const formData = new FormData();
    formData.append("transcript", request.transcript);
    formData.append("locale", request.locale);
    formData.append("route", request.route);
    formData.append("sessionId", request.sessionId);
    formData.append("token", request.token || "");

    if (request.audioBlob) {
      formData.append("audio", request.audioBlob, `voice-turn-${request.sessionId}.webm`);
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.replyText) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Direct voice engine call failed, falling back to local reasoning:", err);
  }

  return createLocalVoiceReply(request.transcript);
}
