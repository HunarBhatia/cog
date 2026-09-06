"use client";

import { Header } from "@/components/layout/Header";
import { RoutineSidebar } from "@/components/companion/RoutineSidebar";
import { MascotStage } from "@/components/mascot/MascotStage";
import { ActivityCarousel } from "@/components/companion/ActivityCarousel";
import { useAuth } from "@/components/auth/AuthContext";

export default function FolkPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#fbf9f4] relative">
      {/* Folk Border Motifs */}
      <div className="fixed left-0 top-0 w-6 h-72 pointer-events-none z-30 folk-border-pattern shadow-sm hidden sm:block"></div>
      <div className="fixed right-0 top-0 w-6 h-72 pointer-events-none z-30 folk-border-pattern folk-border-right shadow-sm hidden sm:block"></div>

      {/* Top Header */}
      <Header activeTab="folk" />

      {/* Content */}
      <main className="max-w-[1240px] mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="bg-[#fbeee9] text-[#c25e43] border border-[#c25e43]/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Traditional Folk Heritage View
          </span>
          <h1 className="text-3xl font-bold font-serif text-[#184735] mt-2 capitalize">
            {user?.username ? `${user.username}'s Daily Folk Companion` : "Your Daily Folk Companion"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <RoutineSidebar />
          <section className="lg:col-span-8 flex flex-col items-center">
            <MascotStage />
            <ActivityCarousel />
          </section>
        </div>
      </main>
    </div>
  );
}
