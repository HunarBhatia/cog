"use client";

import Link from "next/link";
import { Leaf, User, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

interface HeaderProps {
  activeTab?: string;
}

export function Header({ activeTab = "home" }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/70 shadow-xs">
      <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center relative">
        {/* Left Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Leaf className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900 font-serif">
              Cogniva
            </span>
          </Link>
        </div>

        {/* Centered Navigation Bar */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 text-[15px] font-semibold">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 px-3.5 py-2 transition-colors rounded-xl ${
              activeTab === "home"
                ? "text-[#065f46] bg-emerald-50 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>🏠</span>
            <span>Sanctuary</span>
          </Link>

          <Link
            href="/arcade"
            className={`inline-flex items-center gap-2 px-3.5 py-2 transition-colors rounded-xl ${
              activeTab === "arcade"
                ? "text-[#065f46] bg-emerald-50 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>🎮</span>
            <span>Memory Garden</span>
          </Link>

          <Link
            href="/caregiver"
            className={`inline-flex items-center gap-2 px-3.5 py-2 transition-colors rounded-xl ${
              activeTab === "caregiver"
                ? "text-[#065f46] bg-emerald-50 font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>🛡️</span>
            <span>Caregiver Dashboard</span>
          </Link>
        </nav>

        {/* Right Action Controls */}
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                {user?.role === "caregiver" ? (
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span className="font-bold text-slate-800 capitalize">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 font-bold text-xs rounded-xl transition-all border border-stone-200"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#184735] hover:bg-[#1b4d3e] text-white font-bold text-sm rounded-xl transition-all shadow-xs"
            >
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
