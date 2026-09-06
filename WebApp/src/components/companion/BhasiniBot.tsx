"use client";

import { useState } from "react";
import { Mic, Volume2, Globe, Sparkles } from "lucide-react";
import { speakAnnouncement } from "@/lib/speech";
import { useAuth } from "@/components/auth/AuthContext";

export function BhasiniBot() {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState(
    "Tap the microphone or type below to speak with Pip in your native language."
  );

  const languages = ["English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi"];

  const toggleListening = () => {
    setIsListening((prev) => !prev);
    if (!isListening) {
      setSpokenTranscript("Listening gently... Speak whenever you are ready.");
      const friendName = user?.username ? user.username : "friend";
      setTimeout(() => {
        setIsListening(false);
        const greeting = `Namaste ${friendName}! I am Pip. Today is a beautiful day for our gentle activities.`;
        setSpokenTranscript(`"${greeting}"`);
        speakAnnouncement(greeting);
      }, 3000);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-slate-200/60 shadow-xs flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 font-serif">
              Multilingual Companion Bot
            </h3>
            <p className="text-xs text-slate-500">
              Powered by Bhasini Voice & Language Engine
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <Globe className="w-4 h-4 text-slate-500 ml-2" />
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none pr-2"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          💬
        </div>
        <p className="text-sm text-slate-700 leading-relaxed italic">{spokenTranscript}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={toggleListening}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs ${
            isListening
              ? "bg-rose-500 text-white animate-pulse"
              : "bg-[#184735] hover:bg-[#1b4d3e] text-white"
          }`}
        >
          <Mic className="w-5 h-5" />
          <span>{isListening ? "Listening..." : "Tap to Speak"}</span>
        </button>

        <button
          onClick={() => speakAnnouncement(spokenTranscript)}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors"
          title="Repeat speech"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
