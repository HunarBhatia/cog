"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import TapTheTarget from "@/components/arcade/tap-target/TapTheTarget";

export default function TapTargetPage() {
  return (
    <div className="min-h-screen bg-[#f0f9e8] flex flex-col">
      <Header activeTab="arcade" />
      <Suspense fallback={null}>
        <TapTheTarget />
      </Suspense>
    </div>
  );
}
