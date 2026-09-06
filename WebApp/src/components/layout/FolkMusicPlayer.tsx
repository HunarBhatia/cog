"use client";

import React, { useState, useEffect, useRef } from "react";
import { Music, Volume2, VolumeX, Pause, Play, Disc } from "lucide-react";

// North Eastern Folk Melody Pentatonic Notes (Assamese / Bodo Flute scale - Mohanam / Bhupali: C4, D4, E4, G4, A4, C5, D5)
const FOLK_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

// Relaxing folk flute melody sequence
const MELODY_SEQUENCE = [
  { note: 2, dur: 1.2 }, // E4
  { note: 3, dur: 0.8 }, // G4
  { note: 4, dur: 1.5 }, // A4
  { note: 3, dur: 0.8 }, // G4
  { note: 2, dur: 1.0 }, // E4
  { note: 1, dur: 1.5 }, // D4
  { note: 0, dur: 2.0 }, // C4
  { note: 1, dur: 1.0 }, // D4
  { note: 2, dur: 1.2 }, // E4
  { note: 4, dur: 1.5 }, // A4
  { note: 5, dur: 2.2 }, // C5
  { note: 4, dur: 1.0 }, // A4
  { note: 3, dur: 1.2 }, // G4
  { note: 2, dur: 1.8 }, // E4
  { note: 1, dur: 1.2 }, // D4
  { note: 0, dur: 2.5 }, // C4
];

export function FolkMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isExpanded, setIsExpanded] = useState(false);
  const [useSynth, setUseSynth] = useState(false);
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isSynthRunningRef = useRef(false);
  const synthTimerRef = useRef<NodeJS.Timeout | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // High quality royalty-free North-Eastern ambient flute / folk streams
  const AUDIO_SRC = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=meditation-flute-22534.mp3";
  const BACKUP_SRC = "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=traditional-flute-folk-ambient-11048.mp3";

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("cogniva_folk_music");
    if (saved === "true") {
      // Browsers often block auto-play until interaction, but we note preference
    }
  }, []);

  // Web Audio Synth for 100% reliable soothing Bamboo Flute & Tanpura Drone
  const startBambooFluteSynth = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Gentle Tanpura / Drone in C
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();

      droneOsc1.type = "sine";
      droneOsc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
      droneOsc2.type = "triangle";
      droneOsc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3

      droneGain.gain.setValueAtTime(0.08, ctx.currentTime);
      droneOsc1.connect(droneGain);
      droneOsc2.connect(droneGain);
      droneGain.connect(masterGain);

      droneOsc1.start();
      droneOsc2.start();

      isSynthRunningRef.current = true;
      let noteIndex = 0;

      const playNextNote = () => {
        if (!isSynthRunningRef.current || !audioCtxRef.current) return;

        const currentNote = MELODY_SEQUENCE[noteIndex % MELODY_SEQUENCE.length];
        const freq = FOLK_SCALE[currentNote.note];
        const now = ctx.currentTime;

        // Flute voice: Sine + slight breath filter
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Flute vibrato
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.setValueAtTime(5.2, now); // 5Hz vibrato
        vibratoGain.gain.setValueAtTime(2.5, now);
        vibrato.connect(osc.frequency);
        vibrato.start(now + 0.3);
        vibrato.stop(now + currentNote.dur);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1600, now);

        // Gentle flute attack and decay envelope
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.18, now + 0.25);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + currentNote.dur);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + currentNote.dur + 0.1);

        noteIndex++;
        synthTimerRef.current = setTimeout(playNextNote, currentNote.dur * 1000);
      };

      playNextNote();
    } catch (err) {
      console.warn("Folk music synth initialization failed:", err);
    }
  };

  const stopBambooFluteSynth = () => {
    isSynthRunningRef.current = false;
    if (synthTimerRef.current) {
      clearTimeout(synthTimerRef.current);
      synthTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const handleToggle = async () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopBambooFluteSynth();
      setIsPlaying(false);
      localStorage.setItem("cogniva_folk_music", "false");
    } else {
      // Play
      setIsPlaying(true);
      localStorage.setItem("cogniva_folk_music", "true");

      if (audioRef.current) {
        try {
          audioRef.current.volume = volume;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              console.warn("Audio URL failed or blocked, switching to soothing WebAudio folk flute:", e);
              setUseSynth(true);
              startBambooFluteSynth();
            });
          }
        } catch (e) {
          setUseSynth(true);
          startBambooFluteSynth();
        }
      } else {
        startBambooFluteSynth();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(val * 0.35, audioCtxRef.current.currentTime);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 font-sans select-none print:hidden">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        loop
        preload="auto"
        onError={() => {
          // Switch to backup audio or synth
          if (audioRef.current && audioRef.current.src !== BACKUP_SRC) {
            audioRef.current.src = BACKUP_SRC;
            if (isPlaying) audioRef.current.play().catch(() => startBambooFluteSynth());
          } else {
            setUseSynth(true);
            if (isPlaying) startBambooFluteSynth();
          }
        }}
      />

      {/* Expanded Control Box */}
      {isExpanded && (
        <div className="mb-2 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-amber-800/20 w-64 text-stone-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-amber-900/10 mb-2.5">
            <div className="flex items-center gap-2">
              <Disc className={`w-4 h-4 text-amber-700 ${isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
              <span className="text-xs font-bold tracking-wide text-amber-900 uppercase">
                NE Cultural Serenade
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              Assam & Bodo Folk
            </span>
          </div>

          <p className="text-[11px] text-stone-600 mb-3 leading-relaxed">
            Soothing bamboo flute and folk frequencies crafted for senior cognitive calm & focus.
          </p>

          <div className="flex items-center gap-2 mb-1">
            {volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            )}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
              aria-label="Folk music volume"
            />
            <span className="text-[11px] font-mono text-stone-500 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Floating Pill Toggle Button */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg border transition-all duration-300 ${
            isPlaying
              ? "bg-[#8e2b24] text-[#fbf9f4] border-[#701e18] shadow-amber-900/20 hover:bg-[#7a231d] hover:scale-105"
              : "bg-white/95 text-stone-700 border-stone-300 shadow-stone-400/20 hover:bg-stone-50 hover:border-amber-700/50"
          }`}
          title={isPlaying ? "Pause North-Eastern Folk Music" : "Play North-Eastern Folk Music"}
          aria-label={isPlaying ? "Pause Folk Music" : "Play Folk Music"}
        >
          {isPlaying ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200"></span>
              </span>
              <Pause className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">Folk Music: On</span>
              {/* Animated sound bars */}
              <span className="flex items-end gap-0.5 h-3.5 ml-0.5">
                <span className="w-0.5 bg-amber-200 animate-pulse h-2"></span>
                <span className="w-0.5 bg-amber-200 animate-pulse h-3.5" style={{ animationDelay: "150ms" }}></span>
                <span className="w-0.5 bg-amber-200 animate-pulse h-1.5" style={{ animationDelay: "300ms" }}></span>
              </span>
            </>
          ) : (
            <>
              <Music className="w-4 h-4 text-amber-800" />
              <Play className="w-3 h-3 text-amber-800 fill-current" />
              <span className="text-xs font-semibold text-stone-800">Folk Music: Off</span>
            </>
          )}
        </button>

        {/* Small settings expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2.5 rounded-full bg-white/90 border border-stone-300 text-stone-600 hover:text-amber-800 hover:bg-stone-50 shadow-md transition-all"
          title="Folk music audio settings"
          aria-label="Folk music settings"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
