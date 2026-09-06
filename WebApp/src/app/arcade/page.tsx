"use client";

import { Header } from "@/components/layout/Header";
import { ArcadeView } from "@/components/arcade/ArcadeView";

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-[#fbf9f4] flex flex-col justify-between">
      <Header activeTab="arcade" />
      <main className="flex-1">
        <ArcadeView />
      </main>
    </div>
  );
}
