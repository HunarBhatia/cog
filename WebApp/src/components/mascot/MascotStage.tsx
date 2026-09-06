"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BhasiniBot, BotState, MascotCharacter } from "./BhasiniBot";
import {
  Mic,
  Brain,
  Volume2,
  Smile,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  Heart,
  VolumeX,
  Hand,
  Check,
  X,
  Radio,
  Square,
} from "lucide-react";
import confetti from "canvas-confetti";
import { sendVoiceTurn } from "@/lib/integrations/voiceEngineClient";
import { DEFAULT_LOCALE } from "@/lib/integrations/config";
import { useAuth } from "@/components/auth/AuthContext";

type SpeechRecognitionConstructor = new () => any;

const SILENCE_BREAK_MS = 2200;

function anyUnicodeRange(str: string, start: number, end: number): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= start && code <= end) return true;
  }
  return false;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

interface MascotStageProps {
  onStartActivity?: (activityId: string) => void;
}

const STATE_CONFIG: Record<
  BotState,
  { label: string; icon: any; color: string; desc: string; badgeColor: string }
> = {
  idle: {
    label: "Idle / Calm",
    icon: Sparkles,
    color: "text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300",
    desc: "Peaceful, calm breathing and gentle presence",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
  },
  listen: {
    label: "Listening",
    icon: Mic,
    color: "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border-emerald-300",
    desc: "Waving and attentively listening to your voice",
    badgeColor: "bg-emerald-50 text-[#065f46] border-emerald-300",
  },
  think: {
    label: "Thinking",
    icon: Brain,
    color: "text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-300",
    desc: "Taking a thoughtful breath and reflecting",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-300",
  },
  speak: {
    label: "Speaking",
    icon: Volume2,
    color: "text-amber-700 bg-amber-100 hover:bg-amber-200 border-amber-300",
    desc: "Speaking kind words and sharing encouragement",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-300",
  },
  happy: {
    label: "Happy",
    icon: Smile,
    color: "text-pink-700 bg-pink-100 hover:bg-pink-200 border-pink-300",
    desc: "Joyful celebration and smiling bounce",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-300",
  },
  concerned: {
    label: "Empathetic",
    icon: HeartHandshake,
    color: "text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border-indigo-300",
    desc: "Gentle understanding, empathy, and patient care",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-300",
  },
};

export function MascotStage({ onStartActivity }: MascotStageProps) {
  const [botState, setBotState] = useState<BotState>("idle");
  const [character, setCharacter] = useState<MascotCharacter>("Orson");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [spokenText, setSpokenText] = useState<string>(
    "Good morning! I am your companion. Today is a peaceful day for comfortable memories."
  );
  const [speechMuted, setSpeechMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const router = useRouter();
  const { token, user } = useAuth();

  // Refs for voice recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const turnRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef("");
  const finalTranscriptRef = useRef("");
  const isTurnActiveRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (nextTurnTimerRef.current) clearTimeout(nextTurnTimerRef.current);
    };
  }, []);

  const currentLangRef = useRef<string>("en-IN");

  // Play audio from URL or fallback to browser TTS with language detection
  const speakUtterance = useCallback(
    (text: string, audioUrl?: string, langCode?: string) => {
      return new Promise<void>((resolve) => {
        if (speechMuted) {
          resolve();
          return;
        }

        const fallbackTTS = () => {
          if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            resolve();
            return;
          }
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.88;
            utterance.pitch = 1.05;

            // Check if text is Devanagari or Hindi
            const isDevanagari = anyUnicodeRange(text, 0x0900, 0x097F);
            if (langCode === "hi" || isDevanagari) {
              utterance.lang = "hi-IN";
            } else if (langCode === "bn") {
              utterance.lang = "bn-IN";
            } else if (langCode === "ta") {
              utterance.lang = "ta-IN";
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
            audio.onended = () => resolve();
            audio.onerror = () => {
              console.warn("Audio URL playback failed, falling back to browser TTS");
              fallbackTTS();
            };
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                console.warn("Audio play() blocked, falling back to browser TTS:", err);
                fallbackTTS();
              });
            }
          } catch (e) {
            fallbackTTS();
          }
          return;
        }

        fallbackTTS();
      });
    },
    [speechMuted, user?.preferred_language]
  );

  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
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

  const stopSpeechRecognition = useCallback(() => {
    if (!turnRecognitionRef.current) return;
    try {
      turnRecognitionRef.current.onresult = null;
      turnRecognitionRef.current.onerror = null;
      turnRecognitionRef.current.onend = null;
      turnRecognitionRef.current.stop();
    } catch (_) {}
    turnRecognitionRef.current = null;
  }, []);

  // Cancel/stop a voice session completely
  const cancelVoiceSession = useCallback(() => {
    isTurnActiveRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (nextTurnTimerRef.current) {
      clearTimeout(nextTurnTimerRef.current);
      nextTurnTimerRef.current = null;
    }
    stopSpeechRecognition();
    stopRecording();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cogniva-voice-active", { detail: { active: false } }));
    }
    setIsVoiceActive(false);
    setBotState("idle");
    setLiveTranscript("");
    setSpokenText(`${character} is resting comfortably, ready whenever you are.`);
  }, [character, stopSpeechRecognition, stopRecording]);

  // Start recording: mic + speech recognition
  const startVoiceSession = useCallback(
    async (isContinuousTurn = false) => {
      // Cancel any existing speech
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cogniva-voice-active", { detail: { active: true } }));
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      setIsVoiceActive(true);
      isTurnActiveRef.current = true;
      transcriptRef.current = "";
      finalTranscriptRef.current = "";
      setLiveTranscript("");
      setBotState("listen");

      if (!isContinuousTurn) {
        setSpokenText(`${character} is listening to you with warm attention...`);
      }

      // If no speech is detected within 25 seconds during continuous conversation, gently return to idle
      idleTimerRef.current = setTimeout(() => {
        if (isTurnActiveRef.current && !transcriptRef.current.trim()) {
          cancelVoiceSession();
        }
      }, 25000);

      // Stop any prior tracks
      stopMediaStream();
      stopSpeechRecognition();

      // Start mic recording
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
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          recorder.start(250);
        }
      } catch (err) {
        console.warn("Microphone access declined:", err);
        setSpokenText("Microphone permission is needed. Please allow and try again.");
        setBotState("concerned");
        setIsVoiceActive(false);
        isTurnActiveRef.current = false;
        return;
      }

      // Prompt silence timer: if no speech is detected for 5.5s, submit turn
      silenceTimerRef.current = setTimeout(() => {
        if (isTurnActiveRef.current) {
          finishVoiceTurn(transcriptRef.current || "");
        }
      }, 5500);

      // Start speech recognition for live transcript
      const SpeechRecognition = getSpeechRecognition();
      if (!SpeechRecognition) {
        return;
      }

      const recognition = new SpeechRecognition();
      turnRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = user?.preferred_language === "hi" ? "hi-IN" : DEFAULT_LOCALE;

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let newlyFinalized = "";

        for (let index = event.resultIndex; index < event.results.length; index++) {
          const item = event.results[index];
          if (item.isFinal) {
            newlyFinalized += " " + item[0].transcript;
          } else {
            currentInterim += " " + item[0].transcript;
          }
        }

        if (newlyFinalized.trim()) {
          finalTranscriptRef.current = (finalTranscriptRef.current + " " + newlyFinalized.trim()).trim();
        }

        const combined = (finalTranscriptRef.current + " " + currentInterim.trim()).trim();
        transcriptRef.current = combined;
        setLiveTranscript(combined);

        // User spoke: reset idle timer
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }

        // Reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (combined.length > 0) {
          silenceTimerRef.current = setTimeout(() => {
            if (isTurnActiveRef.current) {
              finishVoiceTurn(transcriptRef.current);
            }
          }, SILENCE_BREAK_MS);
        }
      };

      recognition.onerror = (event: any) => {
        console.debug("Recognition error:", event.error);
      };

      recognition.onend = () => {
        if (isTurnActiveRef.current && isMountedRef.current) {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      try {
        recognition.start();
      } catch (error) {
        console.debug("Recognition start failed:", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character, cancelVoiceSession, stopMediaStream, stopSpeechRecognition, user?.preferred_language]
  );

  // Finish the turn: stop recording, send to voice agent, play response, then listen back!
  const finishVoiceTurn = useCallback(
    async (overrideTranscript?: string) => {
      if (!isTurnActiveRef.current) return;
      isTurnActiveRef.current = false;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }

      stopSpeechRecognition();

      const transcript = (overrideTranscript ?? transcriptRef.current ?? "").trim();
      setLiveTranscript(transcript);
      setBotState("think");
      setSpokenText(`${character} is taking a gentle breath and reflecting...`);

      try {
        const audioBlob = await stopRecording();
        const effectiveLocale = user?.preferred_language === "hi" ? "hi-IN" : DEFAULT_LOCALE;
        const sessionId = user?.id ? String(user.id) : user?.username || "stage-session";

        const response = await sendVoiceTurn({
          audioBlob,
          transcript,
          locale: effectiveLocale,
          route: "/",
          sessionId,
          token: token || undefined,
        });

        if (!isMountedRef.current) return;

        // Companion speaks reply
        setBotState("speak");
        setSpokenText(`"${response.replyText}"`);
        if (response.language) {
          currentLangRef.current = response.language === "hi" ? "hi-IN" : "en-IN";
        }
        await speakUtterance(response.replyText, response.replyAudioUrl, response.language);

        if (!isMountedRef.current) return;

        if (response.gameCommand?.action === "START_GAME") {
          if (onStartActivity) {
            onStartActivity(response.gameCommand.gameId || "memory-garden-match");
          } else {
            router.push(`/arcade?gameId=${response.gameCommand.gameId || "memory-garden-match"}`);
          }
          return;
        }

        // Brief cheerful sparkle
        setBotState("happy");
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors: ["#6c3bb8", "#059669", "#f59e0b", "#ec4899"],
        });

        // Immediately hear back from the user after completing speech!
        nextTurnTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          startVoiceSession(true);
        }, 600);
      } catch (error) {
        console.warn("Voice turn failed:", error);
        if (!isMountedRef.current) return;
        setBotState("concerned");
        setSpokenText("I could not reach the voice engine. Please try again in a moment.");
        setIsVoiceActive(false);
      }
    },
    [character, onStartActivity, router, speakUtterance, startVoiceSession, stopRecording, stopSpeechRecognition, token, user]
  );

  return (
    <div className="relative w-full">
      {/* Background stacked shadow cards mimicking Stitch Screen #2 */}
      <div className="absolute -right-3 top-3 bottom-3 left-3 bg-slate-100/70 rounded-3xl border border-slate-200/60 -z-10 hidden sm:block" />
      <div className="absolute -right-1.5 top-1.5 bottom-1.5 left-1.5 bg-slate-50 rounded-3xl border border-slate-200/70 -z-10" />

      {/* Main Foreground Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col items-center text-center">
        {/* Recommended Badge Pill */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#065f46] text-xs font-extrabold tracking-wider uppercase">
            RECOMMENDED FOR TODAY
          </span>
          <button
            onClick={() => setSpeechMuted(!speechMuted)}
            className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            title={speechMuted ? "Unmute Voice Narration" : "Mute Voice Narration"}
            aria-label="Toggle Voice Audio"
          >
            {speechMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-[#059669]" />}
          </button>
        </div>

        {/* Main Title with curved underline accent */}
        <div className="mb-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">
            Morning Reminiscence &{" "}
            <span className="relative inline-block text-slate-900">
              Calm
              <span className="absolute left-0 bottom-0 w-full h-[6px] bg-[#059669] rounded-full -mb-1 opacity-90" />
            </span>
          </h1>
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          DAILY COMPANION ROUTINE • LIVE VOICE AGENT
        </span>

        {/* Mascot Centerpiece Graphic with Ambient Glow */}
        <div className="relative w-full max-w-[380px] h-84 my-1 flex items-center justify-center">
          {/* Gentle ambient halo glow */}
          <div
            className={`absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              botState === "listen"
                ? "bg-emerald-300/40 scale-110"
                : botState === "think"
                ? "bg-purple-300/40 scale-105"
                : botState === "speak"
                ? "bg-amber-300/40 scale-110"
                : botState === "happy"
                ? "bg-pink-300/40 scale-115"
                : botState === "concerned"
                ? "bg-indigo-300/40"
                : "bg-gradient-to-tr from-emerald-100/60 via-purple-100 to-amber-50"
            }`}
          />

          {/* Soft container frame for Responsive Mascot */}
          <div
            className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl bg-gradient-to-b from-purple-50/70 via-white/80 to-purple-100/60 border-2 border-purple-100/80 shadow-md flex items-center justify-center overflow-visible cursor-pointer"
            onMouseEnter={() => !isVoiceActive && setBotState("listen")}
            onMouseLeave={() => !isVoiceActive && setBotState("idle")}
            onClick={() => (isVoiceActive ? cancelVoiceSession() : startVoiceSession())}
            title="Click to talk with your companion!"
          >
            {/* Rive Animated BhasiniBot with Responsive Mascot */}
            <BhasiniBot
              state={botState}
              character={character}
              onCharacterChange={setCharacter}
              className="w-full h-full pointer-events-none"
            />

            {/* Status Heart Badge */}
            <div
              className={`absolute bottom-2 right-2 w-8 h-8 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white transition-transform duration-300 ${
                botState === "happy" ? "scale-125 bg-pink-500 animate-pulse" : "bg-[#059669]"
              }`}
            >
              <Heart className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>

        {/* Direct interactive hint */}
        <div
          onClick={() => (isVoiceActive ? cancelVoiceSession() : startVoiceSession())}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#6c3bb8] cursor-pointer mt-2 mb-2 font-medium transition-colors"
        >
          <Hand className="w-3.5 h-3.5 text-[#6c3bb8]" />
          <span>Tip: Click directly on {character} to start speaking together!</span>
        </div>

        {/* Dynamic Companion Dialogue Bubble */}
        <div className="w-full max-w-lg mt-2 mb-4 p-4 rounded-2xl bg-[#faf7fc] border border-purple-100 text-left flex items-start gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6c3bb8] flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
            {character}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-bold text-[#6c3bb8] uppercase tracking-wider">
                Companion Speech
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${STATE_CONFIG[botState].badgeColor}`}
              >
                {STATE_CONFIG[botState].label}
              </span>
            </div>
            <p className="text-[15px] font-medium text-slate-800 leading-relaxed italic">
              {spokenText}
            </p>
          </div>
        </div>

        {/* Live transcript during voice session */}
        {isVoiceActive && botState === "listen" && (
          <div className="w-full max-w-lg mb-4 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-left animate-in fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Transcription
              </span>
              <button
                onClick={() => {
                  if (transcriptRef.current.trim()) {
                    finishVoiceTurn(transcriptRef.current);
                  }
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                type="button"
              >
                <Check className="w-3 h-3" /> Send now
              </button>
            </div>
            <p className="text-sm font-medium text-emerald-900 leading-relaxed min-h-[28px]">
              {liveTranscript ? (
                <span className="italic">&quot;{liveTranscript}&quot;</span>
              ) : (
                <span className="text-emerald-500 italic">Go ahead, speak naturally... I will listen until you pause.</span>
              )}
            </p>
          </div>
        )}

        {/* Interactive Node Status Row */}
        <div
          onClick={() => (isVoiceActive ? cancelVoiceSession() : startVoiceSession())}
          className="w-full max-w-lg mb-5 flex items-center justify-between px-4 py-3 rounded-2xl bg-[#f8fafc] hover:bg-[#f1f5f9] border border-slate-200/80 cursor-pointer transition-colors"
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-xs ${
                isVoiceActive ? "bg-emerald-200 border-emerald-500" : "bg-emerald-100 border-[#059669]"
              }`}>
                <span className={`w-3 h-3 rounded-full ${isVoiceActive ? "bg-emerald-600 animate-ping" : "bg-[#059669] animate-pulse"}`} />
              </div>
            </div>
            <span className="font-bold text-base text-slate-800 text-left">
              {isVoiceActive ? "Voice Session Active" : "Today\u0027s Conversation: Memories of Spring"}
            </span>
          </div>
          {isVoiceActive ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelVoiceSession();
              }}
              className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs font-bold transition-transform active:scale-95"
              title="Stop Session"
              type="button"
            >
              <Square className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startVoiceSession();
              }}
              className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-[#059669] flex items-center justify-center text-xs font-bold transition-transform active:scale-95"
              title="Start Conversation"
              type="button"
            >
              ▶
            </button>
          )}
        </div>

        {/* Primary Action Button (Start Voice Session) */}
        <div className="w-full max-w-lg flex flex-col items-center gap-3">
          <button
            disabled={botState === "think" || botState === "speak"}
            onClick={isVoiceActive ? cancelVoiceSession : () => startVoiceSession()}
            className={`w-full py-4 px-8 rounded-full text-white font-bold text-lg shadow-sm hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 ${
              botState === "think" || botState === "speak"
                ? "bg-slate-400 cursor-not-allowed"
                : isVoiceActive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-[#059669] hover:bg-[#047857]"
            }`}
          >
            {isVoiceActive ? (
              <>
                <X className="w-5 h-5" />
                <span>
                  {botState === "listen"
                    ? "Listening... (click to stop)"
                    : botState === "think"
                    ? "Voice Engine Thinking..."
                    : botState === "speak"
                    ? "Companion Speaking..."
                    : "Voice Session Active"}
                </span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Speak with {character}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="text-[#059669] font-bold">✓</span> Live voice agent • Real AI responses • Simple 1-tap start
          </p>
        </div>

      </div>
    </div>
  );
}

