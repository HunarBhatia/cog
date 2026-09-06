"use client";

import Link from "next/link";
import { Gamepad2, Flower2, ListOrdered, Target, ArrowLeft, Play } from "lucide-react";

export function ArcadeView() {
  const games = [
    {
      title: "Match the Pairs",
      desc: "10 adaptive levels · IRT Memory domain · 120s→30s timer · match all picture pairs to advance",
      icon: Flower2,
      category: "Memory",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      href: "/arcade/game",
    },
    {
      title: "Sequence the Task",
      desc: "10 adaptive levels · IRT Daily Routine domain · 180s→50s timer · reorder daily activities chronologically",
      icon: ListOrdered,
      category: "Daily Routine",
      color: "bg-orange-50 text-orange-800 border-orange-200",
      href: "/arcade/sequence-task",
    },
    {
      title: "Tap the Target",
      desc: "10 adaptive levels · IRT Attention domain · 60s→20s timer · spot and tap matching shapes against distractors",
      icon: Target,
      category: "Attention",
      color: "bg-amber-50 text-amber-800 border-amber-200",
      href: "/arcade/tap-target",
    },
  ];

  return (
    <div className="w-full max-w-[1240px] mx-auto px-6 py-8 flex flex-col gap-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm rounded-2xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-700" />
          <span>Return to Home</span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
          <Gamepad2 className="w-4 h-4 text-emerald-600" />
          <span>Quiet Leisure Space</span>
        </div>
      </div>

      {/* Hero Games Banner */}
      <div className="bg-gradient-to-br from-[#184735] via-[#1b4d3e] to-[#113326] text-white rounded-3xl p-8 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="max-w-xl z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-300 bg-white/10 px-3 py-1 rounded-full">
            Senior-Friendly Games Hub
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold font-serif mt-3 tracking-tight">
            Arcade Games Corner
          </h1>
          <p className="text-emerald-100 text-base mt-2 leading-relaxed">
            Gentle puzzles, soothing shapes, and peaceful memory activities designed without clocks or rush.
          </p>
        </div>

        <Link
          href="/arcade/game"
          className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-base rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 flex-shrink-0 z-10"
        >
          <Play className="w-5 h-5 fill-slate-900" />
          <span>Play Memory Arena</span>
        </Link>
      </div>

      {/* Games Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((g, i) => {
          const IconComp = g.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${g.color}`}>
                  <IconComp className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {g.category}
                </span>
                <h3 className="font-bold text-xl text-slate-900 font-serif mt-1">{g.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{g.desc}</p>
              </div>

              <Link
                href={g.href}
                className="mt-6 w-full py-3 bg-[#184735] hover:bg-[#1b4d3e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Game</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
