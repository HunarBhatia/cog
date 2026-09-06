"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { ArrowLeft, Flower2, Heart, RefreshCw, Volume2, Trophy } from "lucide-react";
import { sendGameEvent, postGameScore } from "@/lib/integrations/gameEngineClient";
import { speakAnnouncement } from "@/lib/speech";
import { useAuth } from "@/components/auth/AuthContext";

interface CardItem {
  id: number;
  pairKey: string;
  name: string;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const initialCardsData = [
  { pairKey: "lavender", name: "Lavender", icon: "🪻" },
  { pairKey: "rose", name: "Velvet Rose", icon: "🌹" },
  { pairKey: "sunflower", name: "Sunflower", icon: "🌻" },
  { pairKey: "tulip", name: "Tulip", icon: "🌷" },
];

function createShuffledDeck(): CardItem[] {
  const deck: CardItem[] = [];
  let id = 1;
  initialCardsData.forEach((item) => {
    deck.push({ id: id++, pairKey: item.pairKey, name: item.name, icon: item.icon, isFlipped: false, isMatched: false });
    deck.push({ id: id++, pairKey: item.pairKey, name: item.name, icon: item.icon, isFlipped: false, isMatched: false });
  });
  // Deterministic friendly shuffle
  return deck.sort(() => Math.random() - 0.5);
}

export function MemoryGardenGame() {
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [cards, setCards] = useState<CardItem[]>(createShuffledDeck);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [speech, setSpeech] = useState(
    user?.username
      ? `Take your time, ${user.username}! We are enjoying our peaceful memory garden.`
      : "Take your time! We are enjoying our peaceful memory garden."
  );
  const scorePostedRef = useRef(false);

  const gameSession = searchParams.get("gameSession") ?? "local";
  const shouldAutostart = searchParams.get("autostart") === "1";

  useEffect(() => {
    if (!shouldAutostart) return;

    const message = "The memory garden is ready. Take your time and enjoy matching the flowers.";
    setSpeech(message);
    speakAnnouncement(message);
    sendGameEvent("game_started", {
      gameId: "memory-garden-match",
      gameSession,
      source: "voice",
    });
  }, [gameSession, shouldAutostart]);

  useEffect(() => {
    if (matchedCount === 4 && !scorePostedRef.current) {
      scorePostedRef.current = true;
      setIsCompleted(true);
      const winMessage = "Wonderful job! You found all the beautiful garden pairs!";
      setSpeech(winMessage);
      speakAnnouncement(winMessage);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

      sendGameEvent("game_completed", {
        gameId: "memory-garden-match",
        gameSession,
        score: 100,
      });

      if (token) {
        postGameScore(
          {
            game_type: "memory-garden-match",
            score: 100,
            difficulty: "gentle",
          },
          token
        );
      }
    }
  }, [matchedCount, gameSession, token]);

  const handleCardClick = (id: number) => {
    if (isLocked) return;
    const clickedCard = cards.find((c) => c.id === id);
    if (!clickedCard || clickedCard.isMatched || clickedCard.isFlipped) return;

    const newCards = cards.map((c) => (c.id === id ? { ...c, isFlipped: true } : c));
    setCards(newCards);
    speakAnnouncement(`Uncovered ${clickedCard.name}`);

    const newSelected = [...selectedIds, id];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      setIsLocked(true);
      const [firstId, secondId] = newSelected;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = clickedCard;

      if (firstCard && firstCard.pairKey === secondCard.pairKey) {
        // Match found!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c))
          );
          setMatchedCount((prev) => prev + 1);
          setSelectedIds([]);
          setIsLocked(false);
          const matchMsg = `Splendid! You paired the ${secondCard.name}s.`;
          setSpeech(matchMsg);
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c))
          );
          setSelectedIds([]);
          setIsLocked(false);
        }, 1200);
      }
    }
  };

  const handleReset = () => {
    scorePostedRef.current = false;
    setCards(createShuffledDeck());
    setSelectedIds([]);
    setMatchedCount(0);
    setIsCompleted(false);
    setIsLocked(false);
    setSpeech("Resetting cards gently. Enjoy matching your favorite garden pairs!");
    speakAnnouncement("Resetting cards gently. Enjoy matching your favorite garden pairs!");
    sendGameEvent("game_reset", {
      gameId: "memory-garden-match",
      gameSession,
    });
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto px-6 py-8 flex flex-col items-center w-full">
      <div className="w-full flex items-center justify-between mb-6">
        <Link
          href="/arcade"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-700" />
          <span>Back to Arcade Corner</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
          <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          <span>Gentle Memory Garden</span>
        </div>
      </div>

      <div className="w-full bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#fdecdb] flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
          🦦
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Pip Companion Says</span>
          <p className="text-slate-800 font-medium text-base mt-1">"{speech}"</p>
        </div>
        <button
          onClick={() => speakAnnouncement(speech)}
          className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl transition-colors"
          title="Read speech"
          type="button"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-[540px] bg-white rounded-3xl p-6 border border-slate-200 shadow-lg flex flex-col justify-between gap-6">
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-slate-800 text-sm">Garden Pairs</span>
          </div>
          <div className="text-xs font-bold text-slate-600">
            Matches Found: <span className="text-emerald-800 text-sm font-bold">{matchedCount} / 4</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 my-auto aspect-square">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`rounded-2xl p-2 flex flex-col items-center justify-center transition-all duration-200 shadow-sm border ${
                card.isMatched
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900 cursor-default"
                  : card.isFlipped
                  ? "bg-purple-50 border-purple-300 text-purple-900"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-400"
              }`}
              type="button"
            >
              <span className="text-3xl sm:text-4xl">{card.isFlipped ? card.icon : "❓"}</span>
              <span className="text-[11px] font-bold mt-1 truncate">
                {card.isFlipped ? card.name : "Tap"}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/60">
          <span className="text-xs text-slate-500 font-medium">No clocks, no rush. Breathe & enjoy.</span>
          <button
            onClick={handleReset}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
            type="button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Gently</span>
          </button>
        </div>
      </div>
    </main>
  );
}
