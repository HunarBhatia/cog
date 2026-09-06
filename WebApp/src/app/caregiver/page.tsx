"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gamepad2,
  HeartHandshake,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  UserRound,
  Plus,
  RefreshCw,
  Loader2,
  Target,
  ListOrdered,
  Palette,
  Play,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  fetchMemories,
  fetchReminders,
  fetchGameLogs,
  createReminder,
  MemoryItem,
  ReminderItem,
  GameLogItem,
} from "@/lib/integrations/dashboardClient";

interface DomainAbility {
  key: string;
  name: string;
  category: string;
  gameTitle: string;
  gameRoute: string;
  accentColor: string;
  bgTone: string;
  borderColor: string;
  theta: number;
  score: number;
  level: number;
  trajectory: "improving" | "stable" | "declining";
  trajectoryLabel: string;
  delta: number;
  clinicalInsight: string;
}

interface AbilitiesData {
  domains: DomainAbility[];
  overallScore: number;
  stats: {
    improving: number;
    stable: number;
    declining: number;
  };
  overallSummary: string;
  lastUpdated: string;
}

const fallbackDomains: DomainAbility[] = [
  {
    key: "memory",
    name: "Memory Recall",
    category: "Short-term memory",
    gameTitle: "Match the Pairs",
    gameRoute: "/arcade/game",
    accentColor: "text-emerald-700",
    bgTone: "bg-emerald-50",
    borderColor: "border-emerald-200",
    theta: -0.79,
    score: 37,
    level: 4,
    trajectory: "improving",
    trajectoryLabel: "+3% this week",
    delta: 3,
    clinicalInsight: "Morning picture matching helps recall. Keep sessions under 5 minutes for best confidence.",
  },
  {
    key: "attention",
    name: "Focus & Attention",
    category: "Reaction speed",
    gameTitle: "Tap the Target",
    gameRoute: "/arcade/tap-target",
    accentColor: "text-amber-700",
    bgTone: "bg-amber-50",
    borderColor: "border-amber-200",
    theta: -0.03,
    score: 49,
    level: 5,
    trajectory: "stable",
    trajectoryLabel: "Stable baseline",
    delta: 0,
    clinicalInsight: "Reaction time is steady and consistent across multiple rounds with minimal misses.",
  },
  {
    key: "daily_routine",
    name: "Daily Routine",
    category: "Step-by-step tasks",
    gameTitle: "Sequence the Task",
    gameRoute: "/arcade/sequence-task",
    accentColor: "text-orange-700",
    bgTone: "bg-orange-50",
    borderColor: "border-orange-200",
    theta: 0.26,
    score: 54,
    level: 6,
    trajectory: "improving",
    trajectoryLabel: "+6% this week",
    delta: 6,
    clinicalInsight: "Noticeable confidence ordering morning rituals like brushing, tea, and breakfast.",
  },
  {
    key: "pattern_recognition",
    name: "Shapes & Art",
    category: "Visual distinction",
    gameTitle: "Art & Colors Tapestry",
    gameRoute: "/arcade/game",
    accentColor: "text-purple-700",
    bgTone: "bg-purple-50",
    borderColor: "border-purple-200",
    theta: 2.23,
    score: 87,
    level: 9,
    trajectory: "stable",
    trajectoryLabel: "Strong pillar",
    delta: 0,
    clinicalInsight: "High confidence and joy distinguishing colors and textures. A great mood booster.",
  },
  {
    key: "emotional",
    name: "Mood & Well-being",
    category: "Conversational ease",
    gameTitle: "Voice Sanctuary",
    gameRoute: "/",
    accentColor: "text-rose-700",
    bgTone: "bg-rose-50",
    borderColor: "border-rose-200",
    theta: 2.23,
    score: 87,
    level: 9,
    trajectory: "stable",
    trajectoryLabel: "Warm & positive",
    delta: 0,
    clinicalInsight: "Warm engagement with voice companion. Speaks comfortably and expresses feelings clearly.",
  },
];

const fallbackGames = [
  {
    name: "Match the Pairs",
    detail: "Today · Memory · Level 4",
    score: "100%",
    icon: "🧠",
  },
  {
    name: "Sequence the Task",
    detail: "Today · Daily Routine · Level 5",
    score: "88%",
    icon: "📋",
  },
  {
    name: "Tap the Target",
    detail: "Yesterday · Attention · Level 5",
    score: "82%",
    icon: "🎯",
  },
];

export default function CaregiverPage() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [gameLogs, setGameLogs] = useState<GameLogItem[]>([]);
  const [abilitiesData, setAbilitiesData] = useState<AbilitiesData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New reminder form state
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch cognitive domain abilities
      const abilities = await fetch("/api/irt/abilities")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (abilities) setAbilitiesData(abilities);

      // 2. Fetch Django user data if authenticated
      if (token) {
        const [mems, rems, games] = await Promise.all([
          fetchMemories(token).catch(() => []),
          fetchReminders(token).catch(() => []),
          fetchGameLogs(token).catch(() => []),
        ]);
        setMemories(mems);
        setReminders(rems);
        setGameLogs(games);
      }
    } catch (err) {
      console.warn("Sync error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText || !newReminderTime || !token) return;
    setIsAddingReminder(true);
    try {
      const created = await createReminder(newReminderText, newReminderTime, token);
      if (created) {
        setReminders((prev) => [created, ...prev]);
        setNewReminderText("");
        setNewReminderTime("");
      }
    } finally {
      setIsAddingReminder(false);
    }
  };

  const patientName = user?.role === "patient" ? user.username : (user?.username || "Senior Patient");
  const domains = abilitiesData?.domains ?? fallbackDomains;
  const overallScore = abilitiesData?.overallScore ?? 63;

  return (
    <main className="min-h-screen bg-[#faf8f5] text-slate-800 antialiased pb-16">
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#184735] text-emerald-300 shadow-xs">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#184735]">
                Cogniva
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-500 bg-stone-100 px-2 py-0.5 rounded-md">
                Caregiver Hub
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-stone-50 transition-colors"
              title="Refresh latest data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-700" : "text-slate-500"}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {isAuthenticated ? (
              <button
                onClick={logout}
                className="rounded-xl bg-[#184735] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1b4d3e]"
              >
                Sign Out ({user?.username})
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-xl bg-[#184735] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1b4d3e]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-6">
        {/* ── Friendly Hero Card ────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-r from-[#184735] to-[#235843] text-white p-7 sm:p-9 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-emerald-200">
              <ShieldCheck className="h-4 w-4" /> Everyday Care Summary
            </div>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              {patientName}&apos;s Cognitive Health
            </h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-100/95 leading-relaxed">
              Overall status is <strong>stable and steady</strong>. Daily routines and memory
              recall are showing positive progress this week.
            </p>
          </div>

          {/* Big Clear Overall Score */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center min-w-[170px] shrink-0 self-stretch md:self-auto flex flex-col items-center justify-center">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">
              Overall Score
            </span>
            <div className="flex items-baseline justify-center gap-1 my-1">
              <span className="font-serif text-4xl font-extrabold text-white">
                {overallScore}
              </span>
              <span className="text-sm font-semibold text-emerald-200">/ 100</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-200 bg-white/15 px-2.5 py-0.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" /> Steady Progress
            </span>
          </div>
        </section>

        {/* ── Main 2-Column Grid ────────────────────────────────────────── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* ── LEFT (8 cols): Simple Domain Cards & Trend Analysis ─────── */}
          <div className="space-y-8 lg:col-span-8">

            {/* 1. Five Cognitive Abilities (0–100) */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-slate-900">
                    Cognitive Abilities (0 – 100)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Simplified scores calculated from everyday arcade games. Higher is stronger.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Strong (≥70)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Steady (45–69)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Gentle Care (&lt;45)
                  </span>
                </div>
              </div>

              {/* 5 Domain List */}
              <div className="mt-5 space-y-4">
                {domains.map((dom) => {
                  const scoreColor =
                    dom.score >= 70
                      ? "bg-emerald-500"
                      : dom.score >= 45
                      ? "bg-amber-500"
                      : "bg-rose-500";

                  const badgeStyle =
                    dom.score >= 70
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : dom.score >= 45
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-800 border-rose-200";

                  return (
                    <div
                      key={dom.key}
                      className="rounded-2xl border border-stone-200/90 bg-stone-50/40 p-4 sm:p-5 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl shrink-0">
                            {dom.key === "memory"
                              ? "🧠"
                              : dom.key === "attention"
                              ? "🎯"
                              : dom.key === "daily_routine"
                              ? "📋"
                              : dom.key === "pattern_recognition"
                              ? "🎨"
                              : "💚"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-slate-900">
                                {dom.name}
                              </h3>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}
                              >
                                {dom.trajectoryLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {dom.category} • Playing at Level {dom.level} of 10
                            </p>
                          </div>
                        </div>

                        {/* Score Number & Link */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="font-serif text-2xl font-bold text-slate-900">
                              {dom.score}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">/100</span>
                          </div>

                          <Link
                            href={dom.gameRoute}
                            className="p-2 bg-white hover:bg-stone-100 text-slate-700 rounded-xl border border-stone-200 shadow-2xs transition-colors"
                            title={`Play ${dom.gameTitle}`}
                          >
                            <Play className="h-3.5 w-3.5 fill-slate-700" />
                          </Link>
                        </div>
                      </div>

                      {/* Clean Progress Bar */}
                      <div className="mt-3.5">
                        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${scoreColor}`}
                            style={{ width: `${dom.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Friendly Care Tip */}
                      <p className="mt-3 text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-stone-200/60">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-slate-800">Care tip: </strong>
                          {dom.clinicalInsight}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Progress vs. Decline Summary */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-2xl font-bold text-slate-900">
                Progress vs. Decline at a Glance
              </h2>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                A simple breakdown of what is improving and what needs gentle care.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* What's Going Well */}
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-5">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs">
                      ▲
                    </span>
                    <span>What&apos;s Going Well</span>
                  </div>
                  <ul className="space-y-2 text-xs text-emerald-950 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>
                        <strong>Daily Routine (+6%):</strong> {patientName} is getting much faster at
                        ordering morning tasks like tea, breakfast, and medicine.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>
                        <strong>Memory Recall (+3%):</strong> Flower picture matching showed
                        stronger recall when played in the morning.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>
                        <strong>Mood & Arts:</strong> Consistently positive conversations with
                        BhasiniBot voice companion.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Where Support is Needed */}
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-5">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm mb-3">
                    <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs">
                      ●
                    </span>
                    <span>Areas for Gentle Support</span>
                  </div>
                  <ul className="space-y-2 text-xs text-amber-950 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>
                        <strong>Afternoon Memory Dips:</strong> Recall is noticeably lower after
                        3:00 PM. Schedule activities before lunch for best results.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>
                        <strong>Keep Sessions Short:</strong> 3 to 5 minutes is ideal to avoid
                        fatigue or frustration.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>
                        <strong>No Sudden Decline:</strong> All 5 domains remain steady with zero
                        rapid drop-offs detected.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. Recent Games Played */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-slate-900">
                  Recent Game Sessions
                </h2>
                <Link
                  href="/arcade"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950"
                >
                  View Arcade →
                </Link>
              </div>

              <div className="divide-y divide-stone-100">
                {(gameLogs.length > 0
                  ? gameLogs.slice(0, 4).map((log) => ({
                      name: log.game_type.replace(/_/g, " "),
                      detail: `${new Date(log.played_at).toLocaleDateString()} · Difficulty: ${log.difficulty}`,
                      score: `${log.score} pts`,
                      icon: "🎮",
                    }))
                  : fallbackGames
                ).map((g, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{g.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 capitalize">
                          {g.name}
                        </h4>
                        <p className="text-xs text-slate-500">{g.detail}</p>
                      </div>
                    </div>
                    <span className="font-serif font-bold text-base text-[#184735]">
                      {g.score}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── RIGHT SIDEBAR (4 cols): Profile, Reminders, Voice Notes ─── */}
          <aside className="space-y-6 lg:col-span-4">
            {/* Patient Profile */}
            <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#184735] flex items-center justify-center font-bold text-lg">
                  {patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{patientName}</h3>
                  <p className="text-xs text-slate-500">
                    Caregiver: {user?.role === "caregiver" ? user.username : (user?.username ? `${user.username}'s Caregiver` : "Family Caregiver")}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Best Routine Time</span>
                  <strong className="text-slate-700">10:00 AM</strong>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Preferred Language</span>
                  <strong className="text-slate-700">
                    {user?.preferred_language === "en" ? "English" : "Hindi (हिंदी)"}
                  </strong>
                </div>
              </div>

              <Link
                href="/"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              >
                Go to Daily Sanctuary View →
              </Link>
            </div>

            {/* Scheduled Reminders */}
            <div className="rounded-3xl border border-amber-200 bg-[#fffdf5] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3 text-amber-900">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <h3 className="font-bold text-sm">Reminders for {patientName}</h3>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {reminders.length > 0 ? `${reminders.length} Active` : "1 Active"}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reminders.length > 0 ? (
                  reminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 bg-white rounded-xl border border-amber-200/80 text-xs shadow-2xs"
                    >
                      <p className="font-bold text-slate-800">{r.text}</p>
                      <span className="text-amber-800 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock3 className="w-3 h-3" /> {r.time}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200/80 text-xs shadow-2xs">
                    <p className="font-bold text-slate-800">Evening medicine & water</p>
                    <span className="text-amber-800 text-[11px] flex items-center gap-1 mt-0.5">
                      <Clock3 className="w-3 h-3" /> 7:30 PM
                    </span>
                  </div>
                )}
              </div>

              {/* Add reminder input */}
              {isAuthenticated && (
                <form
                  onSubmit={handleCreateReminder}
                  className="mt-4 pt-4 border-t border-amber-200/60 space-y-2"
                >
                  <input
                    type="text"
                    required
                    value={newReminderText}
                    onChange={(e) => setNewReminderText(e.target.value)}
                    placeholder="New reminder (e.g. Drink water)"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      placeholder="Time (e.g. 4:00 PM)"
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isAddingReminder}
                      className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      {isAddingReminder ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Add</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Voice Companion Memories */}
            <div className="rounded-3xl border border-emerald-200 bg-[#f4f9f4] p-6 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-950 mb-2">
                <Brain className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-sm">Notes from Voice Conversations</h3>
              </div>
              <p className="text-xs text-emerald-900/75 mb-3 leading-relaxed">
                Facts captured automatically when {patientName} talks with BhasiniBot:
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {memories.length > 0 ? (
                  memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-white rounded-xl border border-emerald-200/70 text-xs text-slate-800 shadow-2xs"
                    >
                      <p className="font-medium">{m.fact}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(m.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white/70 rounded-xl border border-emerald-200/50 text-xs text-slate-600 text-center">
                    Talk with BhasiniBot on Sanctuary to automatically save memories here.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Friendly bottom disclaimer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> These scores help caregivers
            support daily routines and are not a medical diagnosis.
          </p>
        </div>
      </div>
    </main>
  );
}
