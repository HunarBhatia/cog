"use client";

import { useEffect, useState, useRef } from "react";
import {
  useRive,
  useStateMachineInput,
  useViewModel,
  useViewModelInstance,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-webgl2";

export type BotState = "idle" | "listen" | "think" | "speak" | "happy" | "concerned";
export type MascotCharacter = "Orson" | "Merv";

interface BhasiniBotProps {
  state: BotState;
  character?: MascotCharacter;
  className?: string;
  onCharacterChange?: (character: MascotCharacter) => void;
  showControls?: boolean;
  onClick?: () => void;
}

export function BhasiniBot({
  state,
  character = "Orson",
  className = "h-80 w-80",
  onCharacterChange,
  showControls = false,
  onClick,
}: BhasiniBotProps) {
  const [mounted, setMounted] = useState(false);
  const lastStateRef = useRef<BotState | null>(null);
  const lastCharRef = useRef<MascotCharacter | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initialize Rive with the Responsive Mascots artboard and Animations state machine
  const { rive, RiveComponent } = useRive(
    {
      src: "/animations/bhasini.riv",
      artboard: "00main",
      stateMachine: "Animations",
      autoplay: true,
      layout: new Layout({
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
    },
    {
      shouldResizeCanvasToContainer: true,
    }
  );

  // 2. Access Rive 7+ Data Binding ViewModels directly
  const viewModel = useViewModel(rive, { useDefault: true });
  const vmi = useViewModelInstance(viewModel, { useDefault: true, rive });

  // 3. User snippet compatibility: BhasiniStates inputs
  const stateMachine = "BhasiniStates";
  const listen = useStateMachineInput(rive, stateMachine, "listen");
  const think = useStateMachineInput(rive, stateMachine, "think");
  const speak = useStateMachineInput(rive, stateMachine, "speak");
  const happy = useStateMachineInput(rive, stateMachine, "happy");
  const concerned = useStateMachineInput(rive, stateMachine, "concerned");

  // Handle character updates cleanly without React state recursion
  useEffect(() => {
    if (!vmi) return;
    if (lastCharRef.current === character) return;
    lastCharRef.current = character;

    try {
      const charEnum = vmi.enum("CharacterSelect");
      if (charEnum) {
        charEnum.value = character;
      }
    } catch (e) {
      console.debug("Character select error:", e);
    }
  }, [character, vmi]);

  // Handle state updates cleanly without React state recursion
  useEffect(() => {
    if (!rive) return;

    // Avoid duplicate triggers if state hasn't changed
    if (lastStateRef.current === state) return;
    lastStateRef.current = state;

    // A. Custom state machine inputs from user snippet
    if (state === "listen") listen?.fire();
    if (state === "think") think?.fire();
    if (state === "speak") speak?.fire();
    if (state === "happy") happy?.fire();
    if (state === "concerned") concerned?.fire();

    // B. Direct native Rive Responsive Mascot updates (zero React state overhead)
    try {
      if (vmi) {
        const face = vmi.enum("FaceEmotion");

        if (state === "idle") {
          if (face) face.value = "Neutral";
          vmi.trigger("anim_idle")?.trigger();
          rive.play("idle");
        } else if (state === "listen") {
          if (face) face.value = "Neutral";
          vmi.trigger("anim_wave")?.trigger();
          rive.play("wave");
        } else if (state === "think") {
          if (face) face.value = "Neutral";
          vmi.trigger("anim_breathLOOP")?.trigger();
          rive.play("breathIN-OUT");
        } else if (state === "speak") {
          if (face) face.value = "Happy";
          vmi.trigger("anim_cookie")?.trigger();
          rive.play("eat-cookie");
        } else if (state === "happy") {
          if (face) face.value = "Happy";
          vmi.trigger("anim_happy")?.trigger();
          rive.play("happy");
        } else if (state === "concerned") {
          if (face) face.value = "Sad";
          vmi.trigger("anim_sad")?.trigger();
          rive.play("sad");
        }
      } else {
        // Fallback: direct animation playback
        if (state === "idle") rive.play("idle");
        else if (state === "listen") rive.play("wave");
        else if (state === "think") rive.play("breathIN-OUT");
        else if (state === "speak") rive.play("eat-cookie");
        else if (state === "happy") rive.play("happy");
        else if (state === "concerned") rive.play("sad");
      }
    } catch (e) {
      console.debug("Rive dispatch error:", e);
    }
  }, [state, rive, vmi, listen, think, speak, happy, concerned]);

  if (!mounted) {
    return (
      <div className={`${className} flex items-center justify-center bg-purple-50/50 rounded-full animate-pulse`}>
        <div className="w-16 h-16 rounded-full border-4 border-[#6c3bb8] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative ${className} flex flex-col items-center justify-center`}>
      {/* Rive Canvas */}
      <div
        className="w-full h-full cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        onClick={() => {
          if (onClick) {
            onClick();
          } else {
            try {
              if (vmi) {
                vmi.trigger("anim_wave")?.trigger();
              }
              rive?.play("wave");
            } catch (e) {
              console.debug("Click wave error:", e);
            }
          }
        }}
        title="Tap to talk to your companion!"
      >
        <RiveComponent className="w-full h-full" />
      </div>

      {/* Character Switcher Toggle (Orson / Merv) - only shown when explicitly enabled */}
      {showControls && (
        <div className="absolute -bottom-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 shadow-xs z-10">
          <span className="text-[11px] font-bold text-slate-400">Mascot:</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCharacterChange?.("Orson");
            }}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
              character === "Orson"
                ? "bg-[#6c3bb8] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Orson
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCharacterChange?.("Merv");
            }}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${
              character === "Merv"
                ? "bg-[#059669] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Merv
          </button>
        </div>
      )}
    </div>
  );
}
