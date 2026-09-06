"use client";

import Link from "next/link";
import { Gamepad2, BookOpen, Music, Users, ArrowRight } from "lucide-react";

export function ActivityCarousel() {
  const activities = [
    {
      title: "Memory Games",
      desc: "Garden matching & calm puzzles",
      icon: Gamepad2,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      href: "/arcade",
    },
    {
      title: "Daily Reminiscence",
      desc: "Familiar photo stories & warmth",
      icon: BookOpen,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      href: "/folk",
    },
    {
      title: "Music & Radio",
      desc: "Soothing classic tunes & chimes",
      icon: Music,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      href: "/",
    },
    {
      title: "Family Connection",
      desc: "Messages & photo shares",
      icon: Users,
      color: "text-teal-700 bg-teal-50 border-teal-200",
      href: "/folk",
    },
  ];

  return (
    <div className="w-full mt-6">
      <h3 className="font-bold text-xl text-slate-900 font-serif mb-4">
        Explore Today's Gentle Activities
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activities.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="group bg-white hover:bg-slate-50/80 rounded-3xl p-5 border border-slate-200/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 group-hover:scale-105 transition-transform ${item.color}`}
                >
                  <IconComp className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg text-slate-900 font-serif group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 mt-4 group-hover:translate-x-1 transition-transform">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
