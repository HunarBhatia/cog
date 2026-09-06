"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import SequenceTheTask from "@/components/arcade/sequence-task/SequenceTheTask";

export default function SequenceTaskPage() {
  return (
    <div className="min-h-screen bg-[#fffdfa] flex flex-col">
      <Header activeTab="arcade" />
      <Suspense fallback={null}>
        <SequenceTheTask />
      </Suspense>
    </div>
  );
}
