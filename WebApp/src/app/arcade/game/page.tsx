"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { MatchThePairs } from "@/components/arcade/match-pairs/MatchThePairs";

export default function ArcadeGamePage() {
  return (
    <div className="min-h-screen bg-[#f0fdf4] flex flex-col">
      <Header activeTab="arcade" />
      <Suspense fallback={null}>
        <MatchThePairs />
      </Suspense>
    </div>
  );
}

