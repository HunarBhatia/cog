"use client";

import { Header } from "@/components/layout/Header";
import { RoutineSidebar } from "@/components/companion/RoutineSidebar";
import { MascotStage } from "@/components/mascot/MascotStage";
import { ActivityCarousel } from "@/components/companion/ActivityCarousel";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      {/* Top Navigation Bar */}
      <Header activeTab="home" />

      {/* Main Content Dashboard */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Routine, Streak, Reminders, Caregiver Connect */}
          <RoutineSidebar />

          {/* Right Main Column: Mascot Stage & Activities */}
          <section aria-label="Main Focus" className="lg:col-span-8 flex flex-col items-center">
            <MascotStage />
            <ActivityCarousel />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 py-6 mt-12 bg-white text-center text-xs text-stone-500">
        <div className="max-w-[1240px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
          <p>Cogniva Care Companion • Designed with dignity, comfort, and cognitive ease.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <span>WCAG AAA Accessible</span>
            <span>•</span>
            <span>Atkinson Hyperlegible Typography</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
