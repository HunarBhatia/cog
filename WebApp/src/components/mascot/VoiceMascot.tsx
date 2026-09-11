"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Check, Mic, Radio, Sparkles, Volume2, X } from "lucide-react";
import { BhasiniBot, BotState } from "./BhasiniBot";
import { DEFAULT_GAME_ID, DEFAULT_LOCALE, WAKE_PHRASES, SLEEP_PHRASES } from "@/lib/integrations/config";
import { launchGame } from "@/lib/integrations/gameEngineClient";
import type { GameLaunchCommand } from "@/lib/integrations/contracts";
import { sendVoiceTurn } from "@/lib/integrations/voiceEngineClient";
import { useAuth } from "@/components/auth/AuthContext";

type SpeechRecognitionConstructor = new () => any;
type VoiceAgentStatus = "wake-listening" | "listening" | "thinking" | "speaking" | "happy" | "idle" | "error";

// 2.2 seconds of silence after speaking signals the user has completed their thought/turn
const SILENCE_BREAK_MS = 2200;
// Maximum duration a single turn can stay open (3 minutes)
const MAX_TURN_DURATION_MS = 180000;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `voice-${Date.now()}`;
}

function normalizeForMatching(text: string): { clean: string; unified: string } {
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const unified = clean
    .replace(/\bcog\s+niva\b/g, "cogniva")
    .replace(/\bcog\s+neva\b/g, "cogniva")
    .replace(/\bcog\s+neeva\b/g, "cogniva")
    .replace(/\bkog\s+niva\b/g, "cogniva")
    .replace(/\bcon\s+niva\b/g, "cogniva")
    .replace(/\bcor\s+niva\b/g, "cogniva")
    .replace(/\bcorn\s+iva\b/g, "cogniva")
    .replace(/\bconniva\b/g, "cogniva")
    .replace(/\bconiva\b/g, "cogniva")
    .replace(/\bkaniva\b/g, "cogniva")
    .replace(/\b(hello|hey|hi|ok|okay)\s+(?:cognitive|cogniba|cognita)\b/g, "$1 cogniva")
    .replace(/\bcall\s+niva\b/g, "cogniva");

  return { clean, unified };
}

function matchesWakePhrase(rawText: string): { matched: boolean; phrase: string; subsequent: string } {
  if (!rawText || !rawText.trim()) return { matched: false, phrase: "", subsequent: "" };

  const { clean, unified } = normalizeForMatching(rawText);

  for (const phrase of WAKE_PHRASES) {
    const normPhrase = phrase.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g, " ").trim();
    if (!normPhrase) continue;

    const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");

    let match = unified.match(regex);
    let targetStr = unified;
    if (!match) {
      match = clean.match(regex);
      targetStr = clean;
    }

    if (match && match.index !== undefined) {
      const matchStart = match.index + (match[0].startsWith(" ") ? 1 : 0);
      const matchedLen = normPhrase.length;
      const subsequent = targetStr.slice(matchStart + matchedLen).trim();
      return { matched: true, phrase, subsequent };
    }
  }

  return { matched: false, phrase: "", subsequent: "" };
}

function matchesSleepPhrase(rawText: string): boolean {
  if (!rawText || !rawText.trim()) return false;
  const { clean, unified } = normalizeForMatching(rawText);

  for (const phrase of SLEEP_PHRASES) {
    const normPhrase = phrase.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g, " ").trim();
    if (!normPhrase) continue;

    const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i");

    if (regex.test(unified) || regex.test(clean) || regex.test(rawText.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function VoiceMascot() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user } = useAuth();
  const [voiceStatus, setVoiceStatus] = useState<VoiceAgentStatus>("idle");
  const [isVoiceAgentActive, setIsVoiceAgentActive] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [permissionMessage, setPermissionMessage] = useState("");

  const sessionIdRef = useRef(createSessionId());

  useEffect(() => {
    if (user?.id) {
      sessionIdRef.current = String(user.id);
    } else if (user?.username) {
      sessionIdRef.current = user.username;
    }
  }, [user]);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const turnRecognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const restartWakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef("");
  const finalTranscriptAccumulatorRef = useRef("");
  const isTurnActiveRef = useRef(false);
  const isMountedRef = useRef(false);

  const isHiddenRoute = pathname === "/sign-in";

  // Restart the wake word listener whenever auth state changes (login / register).
  // Without this, the listener may be initialized before the token/user is hydrated
  // causing it to silently fail after sign-up or sign-in redirects.
  useEffect(() => {
    // Stop any existing wake recognition and re-launch with updated auth context
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.onresult = null;
        wakeRecognitionRef.current.onerror = null;
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.stop();
      } catch (_) {}
      wakeRecognitionRef.current = null;
    }
    // Delay slightly to let navigation settle after login/register redirect
    const t = setTimeout(() => {
      if (isMountedRef.current && !isTurnActiveRef.current && !isHiddenRoute) {
        startWakeWordListenerRef.current();
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.username, isHiddenRoute]);

  const botState: BotState = useMemo(() => {
    if (voiceStatus === "wake-listening" || voiceStatus === "listening") return "listen";
    if (voiceStatus === "thinking") return "think";
    if (voiceStatus === "speaking") return "speak";
    if (voiceStatus === "happy") return "happy";
    if (voiceStatus === "error") return "concerned";
    return "idle";
  }, [voiceStatus]);

  const isWelcome = pathname === "/welcome";

  const stopRecognition = useCallback((recognitionRef: React.MutableRefObject<any>) => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    } catch (_) {
      // Browser recognition engines can throw if already stopped.
    }

    recognitionRef.current = null;
  }, []);

  const stopMediaStream = useCallback(() => {
    if (!mediaStreamRef.current) return;
    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

function anyUnicodeRange(str: string, start: number, end: number): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= start && code <= end) return true;
  }
  return false;
}

  const speakUtterance = useCallback((text: string, audioUrl?: string, langCode?: string) => {
    return new Promise<void>((resolve) => {
      // Pause any ongoing speech or audio
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        } catch (_) {}
      }

      const fallbackTTS = () => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.92;
          utterance.pitch = 1.05;

          const isDevanagari = anyUnicodeRange(text, 0x0900, 0x097F);
          if (langCode === "hi" || isDevanagari) {
            utterance.lang = "hi-IN";
          } else if (langCode === "bn") {
            utterance.lang = "bn-IN";
          } else {
            utterance.lang = user?.preferred_language === "hi" ? "hi-IN" : "en-IN";
          }

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        } catch (_) {
          resolve();
        }
      };

      if (audioUrl) {
        try {
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.preload = "auto";
          audio.onended = () => {
            currentAudioRef.current = null;
            resolve();
          };
          audio.onerror = (err) => {
            console.warn("Corner mascot audio URL playback error, falling back to browser TTS:", err);
            currentAudioRef.current = null;
            fallbackTTS();
          };
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn("Corner mascot audio play() blocked, falling back to browser TTS:", err);
              currentAudioRef.current = null;
              fallbackTTS();
            });
          }
        } catch (e) {
          currentAudioRef.current = null;
          fallbackTTS();
        }
        return;
      }

      fallbackTTS();
    });
  }, [user?.preferred_language]);

  const startTurnRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      if ("MediaRecorder" in window) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.start(250); // Collect slices every 250ms
      }
    } catch (err) {
      console.warn("Microphone access declined or unavailable", err);
      setPermissionMessage("Microphone permission is needed for live voice conversation.");
    }
  }, []);

  const stopTurnRecording = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        stopMediaStream();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = audioChunksRef.current.length
          ? new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" })
          : null;
        mediaRecorderRef.current = null;
        stopMediaStream();
        resolve(blob);
      };

      try {
        recorder.stop();
      } catch (_) {
        stopMediaStream();
        resolve(null);
      }
    });
  }, [stopMediaStream]);

  const routeToGame = useCallback(
    async (command: GameLaunchCommand) => {
      const launch = await launchGame({
        gameId: command.gameId || DEFAULT_GAME_ID,
        source: command.source,
        transcript: command.transcript,
        sessionId: sessionIdRef.current,
      });
      const params = new URLSearchParams({
        gameId: launch.gameId,
        gameSession: launch.sessionId,
        autostart: launch.autostart ? "1" : "0",
      });

      router.push(`${launch.launchPath}?${params.toString()}`);
    },
    [router]
  );

  const startVoiceAgentRef = useRef<(initialTranscript?: string) => Promise<void>>(() => Promise.resolve());
  const finishVoiceTurnRef = useRef<(overrideTranscript?: string) => Promise<void>>(() => Promise.resolve());
  const startWakeWordListenerRef = useRef<() => void>(() => {});
  const handleSleepCommandRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const handleSleepCommand = useCallback(async () => {
    isTurnActiveRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTurnTimerRef.current) {
      clearTimeout(maxTurnTimerRef.current);
      maxTurnTimerRef.current = null;
    }
    stopRecognition(turnRecognitionRef);
    stopTurnRecording();

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch (_) {}
    }

    setVoiceStatus("speaking");
    const isHindi = user?.preferred_language === "hi";
    const sleepResponse = isHindi
      ? "अलविदा! मैं विश्राम कर रहा हूँ। जब भी ज़रूरत हो, बस 'hello cogniva' कहिए।"
      : "Goodbye! Going to sleep now. Just say 'hello cogniva' whenever you need me.";
    setAgentResponse(sleepResponse);
    await speakUtterance(sleepResponse, undefined, isHindi ? "hi" : "en");

    setIsVoiceAgentActive(false);
    setVoiceStatus("wake-listening");
    setSpeechTranscript("");
    setAgentResponse("");
    startWakeWordListenerRef.current();
  }, [speakUtterance, stopRecognition, stopTurnRecording, user?.preferred_language]);
  handleSleepCommandRef.current = handleSleepCommand;

  const finishVoiceTurn = useCallback(
    async (overrideTranscript?: string): Promise<void> => {
      if (!isTurnActiveRef.current) return;

      isTurnActiveRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (maxTurnTimerRef.current) {
        clearTimeout(maxTurnTimerRef.current);
        maxTurnTimerRef.current = null;
      }

      stopRecognition(turnRecognitionRef);

      const transcript = (overrideTranscript ?? transcriptRef.current ?? "").trim();
      if (matchesSleepPhrase(transcript)) {
        await handleSleepCommand();
        return;
      }

      // If user remained silent and did not speak, cleanly return to wake-listening mode
      if (!transcript && (!audioChunksRef.current || audioChunksRef.current.length === 0)) {
        stopTurnRecording();
        setIsVoiceAgentActive(false);
        setVoiceStatus("wake-listening");
        setSpeechTranscript("");
        setAgentResponse("");
        startWakeWordListenerRef.current();
        return;
      }

      setSpeechTranscript(transcript);
      setVoiceStatus("thinking");

      try {
        const audioBlob = await stopTurnRecording();
        const effectiveLocale = user?.preferred_language === "hi" ? "hi-IN" : DEFAULT_LOCALE;
        const currentSessionId = user?.id ? String(user.id) : (user?.username ? user.username : sessionIdRef.current);
        const response = await sendVoiceTurn({
          audioBlob,
          transcript,
          locale: effectiveLocale,
          route: pathname || "/",
          sessionId: currentSessionId,
          token: token || undefined,
        });

        setAgentResponse(response.replyText);
        setVoiceStatus("speaking");
        await speakUtterance(response.replyText, response.replyAudioUrl, response.language);

        if (response.gameCommand?.action === "START_GAME") {
          await routeToGame(response.gameCommand);
          return;
        }

        setVoiceStatus("happy");
        confetti({
          particleCount: 25,
          spread: 50,
          origin: isWelcome ? { y: 0.5, x: 0.5 } : { y: 0.85, x: 0.88 },
          colors: ["#6c3bb8", "#059669", "#f59e0b", "#ec4899"],
        });

        // Hear back from user after speech completes
        window.setTimeout(() => {
          if (!isMountedRef.current) return;
          startVoiceAgentRef.current();
        }, 600);
      } catch (error) {
        console.warn("Voice turn failed", error);
        setVoiceStatus("error");
        setAgentResponse("I could not reach the voice engine. Please try again in a moment.");
      }
    },
    [handleSleepCommand, isWelcome, pathname, routeToGame, speakUtterance, stopRecognition, stopTurnRecording, token, user]
  );
  finishVoiceTurnRef.current = finishVoiceTurn;

  const startVoiceAgent = useCallback(
    async (initialTranscript = ""): Promise<void> => {
      if (isHiddenRoute) return;

      stopRecognition(wakeRecognitionRef);
      stopRecognition(turnRecognitionRef);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        } catch (_) {}
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (maxTurnTimerRef.current) {
        clearTimeout(maxTurnTimerRef.current);
        maxTurnTimerRef.current = null;
      }

      finalTranscriptAccumulatorRef.current = initialTranscript.trim();
      transcriptRef.current = initialTranscript.trim();
      isTurnActiveRef.current = true;
      setIsVoiceAgentActive(true);
      setPermissionMessage("");
      setSpeechTranscript(initialTranscript.trim());
      setAgentResponse("");
      setVoiceStatus("listening");

      await startTurnRecording();

      // If user remains silent without saying any words for 9 seconds, close turn cleanly
      silenceTimerRef.current = setTimeout(() => {
        if (isTurnActiveRef.current) {
          if (transcriptRef.current && transcriptRef.current.trim().length > 0) {
            finishVoiceTurn(transcriptRef.current);
          } else {
            // Do NOT submit a fake empty turn; gently return to wake-listening
            setIsVoiceAgentActive(false);
            setVoiceStatus("wake-listening");
            setSpeechTranscript("");
            setAgentResponse("");
            stopTurnRecording();
            stopRecognition(turnRecognitionRef);
            startWakeWordListenerRef.current();
          }
        }
      }, 9000);

      const SpeechRecognition = getSpeechRecognition();

      if (!SpeechRecognition) {
        return;
      }

      const createTurnRecognition = () => {
        if (!isTurnActiveRef.current) return null;

        const recognition = new SpeechRecognition();
        turnRecognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = user?.preferred_language === "hi" ? "hi-IN" : DEFAULT_LOCALE;

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let newlyFinalized = "";

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const item = event.results[index];
            if (item.isFinal) {
              newlyFinalized += " " + item[0].transcript;
            } else {
              currentInterim += " " + item[0].transcript;
            }
          }

          if (newlyFinalized.trim()) {
            finalTranscriptAccumulatorRef.current = (
              finalTranscriptAccumulatorRef.current + " " + newlyFinalized.trim()
            ).trim();
          }

          const combinedTranscript = (
            finalTranscriptAccumulatorRef.current + " " + currentInterim.trim()
          ).trim();

          transcriptRef.current = combinedTranscript;
          setSpeechTranscript(combinedTranscript);

          // Check if user uttered sleep phrase ("bye cogniva", "sleep", etc.)
          if (matchesSleepPhrase(combinedTranscript)) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            handleSleepCommandRef.current();
            return;
          }

          // Reset silence break timer whenever voice activity / words are heard
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          if (combinedTranscript.length > 0) {
            // Wait for SILENCE_BREAK_MS pause before finishing the turn
            silenceTimerRef.current = setTimeout(() => {
              if (isTurnActiveRef.current) {
                finishVoiceTurn(transcriptRef.current);
              }
            }, SILENCE_BREAK_MS);
          }
        };

        recognition.onerror = (event: any) => {
          console.debug("Turn recognition event:", event.error);
        };

        recognition.onend = () => {
          // If browser ends speech recognition prematurely while turn is active, restart seamlessly
          if (isTurnActiveRef.current && isMountedRef.current) {
            try {
              recognition.start();
            } catch (_) {
              createTurnRecognition();
            }
          }
        };

        try {
          recognition.start();
        } catch (error) {
          console.debug("Turn recognition start failed:", error);
        }

        return recognition;
      };

      createTurnRecognition();

      // If initial transcript was already provided, set the silence break timer
      if (initialTranscript.trim().length > 0) {
        silenceTimerRef.current = setTimeout(() => {
          if (isTurnActiveRef.current) {
            finishVoiceTurn(transcriptRef.current);
          }
        }, SILENCE_BREAK_MS);
      }

      // Max safety timeout for the entire listening session
      maxTurnTimerRef.current = setTimeout(() => {
        if (isTurnActiveRef.current) {
          finishVoiceTurn(transcriptRef.current);
        }
      }, MAX_TURN_DURATION_MS);
    },
    [finishVoiceTurn, isHiddenRoute, startTurnRecording, stopRecognition, user?.preferred_language]
  );
  startVoiceAgentRef.current = startVoiceAgent;

  const isExternalStageActiveRef = useRef(false);

  const startWakeWordListener = useCallback(() => {
    startWakeWordListenerRef.current = startWakeWordListener;
    if (
      isHiddenRoute ||
      isTurnActiveRef.current ||
      wakeRecognitionRef.current ||
      isExternalStageActiveRef.current
    ) {
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceStatus("idle");
      setPermissionMessage("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    wakeRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use en-IN or hi-IN for accurate Indian accent & Cogniva recognition
    recognition.lang = user?.preferred_language === "hi" ? "hi-IN" : "en-IN";
    try {
      recognition.maxAlternatives = 3;
    } catch (_) {}

    recognition.onstart = () => {
      setVoiceStatus("wake-listening");
      setPermissionMessage("");
    };

    recognition.onresult = (event: any) => {
      // Evaluate incoming speech results with strict whole-word wake phrase matching
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const item = event.results[index];
        if (!item) continue;

        const maxAlts = Math.min(2, item.length);
        for (let alt = 0; alt < maxAlts; alt++) {
          const rawText = item[alt]?.transcript || "";
          if (!rawText.trim()) continue;

          const { matched, phrase, subsequent } = matchesWakePhrase(rawText);
          if (matched) {
            console.log(`[Cogniva Wake Word] Heard: "${rawText.trim()}" -> Waking up on intentional phrase: "${phrase}"`);
            confetti({
              particleCount: 15,
              spread: 40,
              origin: isWelcome ? { y: 0.5, x: 0.5 } : { y: 0.85, x: 0.88 },
              colors: ["#10b981", "#6366f1"],
            });
            startVoiceAgent(subsequent);
            return;
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Wake recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionMessage("Click anywhere or click the companion to enable microphone.");
      }
    };

    recognition.onend = () => {
      wakeRecognitionRef.current = null;
      if (
        !isMountedRef.current ||
        isTurnActiveRef.current ||
        isHiddenRoute ||
        isExternalStageActiveRef.current
      ) {
        return;
      }

      if (restartWakeTimerRef.current) clearTimeout(restartWakeTimerRef.current);
      restartWakeTimerRef.current = setTimeout(() => {
        if (
          isMountedRef.current &&
          !isTurnActiveRef.current &&
          !isHiddenRoute &&
          !wakeRecognitionRef.current
        ) {
          startWakeWordListenerRef.current();
        }
      }, 400);
    };

    try {
      recognition.start();
    } catch (error) {
      console.debug("Wake recognition start failed:", error);
      wakeRecognitionRef.current = null;
    }
  }, [isHiddenRoute, isWelcome, startVoiceAgent, user?.preferred_language]);

  useEffect(() => {
    const handleExternalVoice = (event: any) => {
      const active = !!event?.detail?.active;
      isExternalStageActiveRef.current = active;
      if (active) {
        stopRecognition(wakeRecognitionRef);
      } else {
        if (!isTurnActiveRef.current && !isHiddenRoute) {
          startWakeWordListener();
        }
      }
    };

    window.addEventListener("cogniva-voice-active", handleExternalVoice);
    return () => {
      window.removeEventListener("cogniva-voice-active", handleExternalVoice);
    };
  }, [isHiddenRoute, startWakeWordListener, stopRecognition]);

  useEffect(() => {
    isMountedRef.current = true;
    startWakeWordListener();

    return () => {
      isMountedRef.current = false;
      stopRecognition(wakeRecognitionRef);
      stopRecognition(turnRecognitionRef);
      stopMediaStream();
      if (restartWakeTimerRef.current) clearTimeout(restartWakeTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (maxTurnTimerRef.current) clearTimeout(maxTurnTimerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [startWakeWordListener, stopMediaStream, stopRecognition]);

  useEffect(() => {
    if (!isTurnActiveRef.current && !isHiddenRoute && !isExternalStageActiveRef.current) {
      startWakeWordListener();
    }
  }, [isHiddenRoute, pathname, startWakeWordListener]);

  // Ensure wake word listener is active as soon as user interacts with the page
  useEffect(() => {
    const handleGlobalInteraction = async () => {
      if (!isTurnActiveRef.current && !wakeRecognitionRef.current && !isHiddenRoute) {
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          }
        } catch (_) {}
        startWakeWordListener();
      }
    };

    window.addEventListener("click", handleGlobalInteraction);
    window.addEventListener("touchstart", handleGlobalInteraction);
    window.addEventListener("keydown", handleGlobalInteraction);
    return () => {
      window.removeEventListener("click", handleGlobalInteraction);
      window.removeEventListener("touchstart", handleGlobalInteraction);
      window.removeEventListener("keydown", handleGlobalInteraction);
    };
  }, [isHiddenRoute, startWakeWordListener]);

  const requestMicAndStart = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      setPermissionMessage("");
      startVoiceAgent();
    } catch (e) {
      setPermissionMessage("Microphone permission needed. Please allow microphone in your browser settings.");
    }
  };

  const closeVoiceAgent = (event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch (_) {}
    }
    isTurnActiveRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxTurnTimerRef.current) clearTimeout(maxTurnTimerRef.current);
    setIsVoiceAgentActive(false);
    setVoiceStatus("wake-listening");
    setSpeechTranscript("");
    setAgentResponse("");
    stopRecognition(turnRecognitionRef);
    stopTurnRecording();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    startWakeWordListener();
  };

  if (isHiddenRoute) {
    return null;
  }

  return (
    <div
      className={`mascot ${isWelcome ? "mascot-home" : "mascot-corner"} select-none`}
      onClick={() => startVoiceAgent()}
      role="button"
      tabIndex={0}
      aria-label="Interactive companion voice agent. Say 'hello cogniva' or click to speak."
      title="Say 'hello cogniva' to wake, or 'bye cogniva' to sleep."
    >
      {(isVoiceAgentActive || permissionMessage) && (
        <div
          className={`absolute pointer-events-auto transition-all duration-300 z-50 ${
            isWelcome
              ? "-top-36 left-1/2 -translate-x-1/2 w-80 sm:w-96"
              : "-top-40 right-0 sm:right-2 w-72 sm:w-84"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="bg-white/95 backdrop-blur-lg px-4 py-3.5 rounded-2xl shadow-2xl border-2 border-emerald-300/80 text-stone-800 text-xs sm:text-sm font-medium leading-snug relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    voiceStatus === "listening" || voiceStatus === "wake-listening"
                      ? "bg-emerald-500 animate-ping"
                      : voiceStatus === "thinking"
                      ? "bg-purple-500 animate-pulse"
                      : voiceStatus === "speaking"
                      ? "bg-amber-500 animate-bounce"
                      : voiceStatus === "error"
                      ? "bg-red-500"
                      : "bg-pink-500"
                  }`}
                />
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#184735] flex items-center gap-1">
                  {voiceStatus === "wake-listening" && (
                    <>
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Wake word ready
                    </>
                  )}
                  {voiceStatus === "listening" && (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      Listening to you...
                    </>
                  )}
                  {voiceStatus === "thinking" && (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                      Voice engine thinking
                    </>
                  )}
                  {voiceStatus === "speaking" && (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      Companion speaking
                    </>
                  )}
                  {voiceStatus === "happy" && <span>All set</span>}
                  {voiceStatus === "error" && <span>Connection issue</span>}
                </span>
              </div>

              <button
                onClick={closeVoiceAgent}
                className="p-1 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
                title="Close voice agent"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {permissionMessage && (
              <div className="py-1">
                <p className="text-stone-700 font-medium text-[13px] leading-relaxed mb-2">{permissionMessage}</p>
                <button
                  onClick={requestMicAndStart}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  type="button"
                >
                  Enable Microphone
                </button>
              </div>
            )}

            {voiceStatus === "listening" && (
              <div>
                <p className="text-stone-800 font-medium text-[13px] leading-relaxed min-h-[38px] flex items-center">
                  {speechTranscript ? (
                    <span className="text-emerald-800 font-semibold italic">"{speechTranscript}"</span>
                  ) : (
                    <span className="text-stone-400 italic">"Go ahead, speak naturally... Say 'bye cogniva' to sleep."</span>
                  )}
                </p>

                <div className="flex items-center justify-between mt-2.5 pt-1.5 text-[11px] text-stone-400 border-t border-stone-100">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <Radio className="w-3 h-3 animate-pulse" /> Live transcription
                  </span>
                  <button
                    onClick={() => finishVoiceTurn(speechTranscript)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    type="button"
                  >
                    <Check className="w-3 h-3" /> Send now
                  </button>
                </div>
              </div>
            )}

            {voiceStatus === "thinking" && (
              <div className="py-2">
                <p className="text-purple-700 font-serif text-[13px] italic mb-1">
                  Transcribing & sending voice to engine...
                </p>
                {speechTranscript && (
                  <p className="text-stone-500 text-[11px] italic truncate">"{speechTranscript}"</p>
                )}
              </div>
            )}

            {(voiceStatus === "speaking" || voiceStatus === "happy" || voiceStatus === "error") && agentResponse && (
              <p className="text-[#184735] font-serif text-[13px] font-medium leading-relaxed italic py-1">
                "{agentResponse}"
              </p>
            )}

            <div
              className={`absolute -bottom-2 w-3 h-3 bg-white border-r border-b border-emerald-300/80 rotate-45 ${
                isWelcome ? "left-1/2 -translate-x-1/2" : "right-10"
              }`}
            />
          </div>
        </div>
      )}

      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95">
        <BhasiniBot
          state={botState}
          character="Orson"
          className="w-full h-full"
          showControls={false}
          onClick={() => startVoiceAgent()}
        />
      </div>
    </div>
  );
}
