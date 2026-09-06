"use client";

import { useEffect, useState } from "react";
import { Volume2, PhoneCall, Calendar, Flame } from "lucide-react";
import { speakAnnouncement } from "@/lib/speech";
import { useAuth } from "@/components/auth/AuthContext";
import {
  fetchReminders,
  createReminder,
  fetchGameLogs,
  ReminderItem,
} from "@/lib/integrations/dashboardClient";

export function RoutineSidebar() {
  const { user, token } = useAuth();
  const [liveReminders, setLiveReminders] = useState<ReminderItem[]>([]);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTime, setNewTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLiveReminders([]);
      setStreakDays(0);
      return;
    }

    // Fetch live reminders
    fetchReminders(token).then((data) => {
      if (data && Array.isArray(data)) {
        setLiveReminders(data);
      }
    });

    // Fetch game logs to calculate real streak
    fetchGameLogs(token).then((logs) => {
      if (logs && Array.isArray(logs) && logs.length > 0) {
        // Collect dates in YYYY-MM-DD
        const playedDates = new Set(
          logs.map((item) => {
            try {
              return new Date(item.played_at).toISOString().split("T")[0];
            } catch {
              return "";
            }
          }).filter(Boolean)
        );

        // Calculate consecutive days starting from today or yesterday
        let streak = 0;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yestStr = yesterday.toISOString().split("T")[0];

        let checkDate = playedDates.has(todayStr) ? now : playedDates.has(yestStr) ? yesterday : null;

        if (checkDate) {
          const current = new Date(checkDate);
          while (true) {
            const dateStr = current.toISOString().split("T")[0];
            if (playedDates.has(dateStr)) {
              streak++;
              current.setDate(current.getDate() - 1);
            } else {
              break;
            }
          }
        }
        setStreakDays(streak);
      } else {
        setStreakDays(0);
      }
    });
  }, [token]);

  const handleTriggerCaregiver = () => {
    speakAnnouncement(
      "Connecting with your caregiver instantly. Please sit comfortably while we reach your family."
    );
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !newTime.trim() || !token) return;
    setIsSubmitting(true);
    try {
      const created = await createReminder(newText.trim(), newTime.trim(), token);
      if (created) {
        setLiveReminders((prev) => [created, ...prev]);
        setNewText("");
        setNewTime("");
        setShowAddModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = user?.username ? user.username : "Guest User";
  const initial = displayName.charAt(0).toUpperCase();

  const todayDateString = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Generic fallback reminders for guests or when not logged in
  const guestReminders = [
    {
      time: "10:30 AM",
      title: "Morning Hydration & Stretch",
      desc: "Fresh glass of water & gentle breathing",
      audio: "At 10:30 AM, enjoy a soothing glass of fresh water and gentle morning stretches.",
    },
    {
      time: "2:00 PM",
      title: "Afternoon Memory Garden",
      desc: "Gentle floral card matching session",
      audio: "At 2:00 PM, take a relaxing break with the floral memory garden puzzle.",
    },
    {
      time: "5:00 PM",
      title: "Evening Folk Serenade",
      desc: "Listen to peaceful bamboo flute tunes",
      audio: "At 5:00 PM, enjoy the traditional North-Eastern folk melodies for calm relaxation.",
    },
  ];

  const displayList = user
    ? liveReminders.map((r) => ({
        time: r.time,
        title: r.text,
        desc: "Scheduled for you",
        audio: `At ${r.time}, reminder: ${r.text}`,
      }))
    : guestReminders;

  return (
    <aside aria-label="Daily Overview" className="lg:col-span-4 flex flex-col gap-5 w-full">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/60 flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-800 text-xl font-serif">
            {initial}
          </div>
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-xs"></span>
        </div>
        <div className="flex flex-col">
          <h2 className="font-bold text-xl text-slate-900 font-serif capitalize">{displayName}</h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full w-fit mt-1">
            {user?.role === "caregiver"
              ? "Caregiver Account"
              : user
              ? "Senior Sanctuary"
              : "Guest Companion"}
          </span>
        </div>
      </div>

      {/* Today's Schedule Header */}
      <div className="bg-[#184735] text-white rounded-3xl p-6 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between text-emerald-200 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span>Today's Date</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-amber-300 text-xs">
            <Flame className="w-3.5 h-3.5 fill-amber-300" />
            <span>{streakDays} Day Streak</span>
          </div>
        </div>
        <p className="font-bold text-2xl font-serif tracking-tight mt-1">
          {todayDateString}
        </p>
        <span className="text-xs text-emerald-100 font-medium mt-2 bg-white/10 px-3 py-1.5 rounded-xl w-fit">
          {user ? `Welcome back, ${displayName}` : "Daily Companion Active"}
        </span>
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/60 flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-lg text-slate-900 font-serif">Daily Reminders</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {displayList.length} Scheduled
            </span>
            {user && (
              <button
                onClick={() => setShowAddModal(!showAddModal)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                title="Add a custom reminder"
              >
                + Add
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Form */}
        {showAddModal && (
          <form onSubmit={handleAddReminder} className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col gap-2">
            <input
              type="text"
              placeholder="Reminder (e.g. Afternoon Medicine)"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-white border border-emerald-300 focus:outline-emerald-600"
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Time (e.g. 4:00 PM)"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl bg-white border border-emerald-300 focus:outline-emerald-600 flex-1"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {displayList.length === 0 ? (
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center">
            <p className="text-sm font-semibold text-stone-700">No reminders scheduled yet</p>
            <p className="text-xs text-stone-500 mt-1">
              Say &quot;Remind me to take my medicine&quot; to Cogniva, or tap + Add above.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayList.map((rem, i) => (
              <div
                key={i}
                className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-3.5 transition-colors flex items-center justify-between gap-3 border border-slate-200/50"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-emerald-800">{rem.time}</span>
                  <span className="font-bold text-slate-900 text-base">{rem.title}</span>
                  <span className="text-xs text-slate-500 truncate">{rem.desc}</span>
                </div>
                <button
                  onClick={() => speakAnnouncement(rem.audio)}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 shadow-xs flex items-center justify-center flex-shrink-0 transition-all border border-slate-200/60 active:scale-95"
                  title="Play spoken reminder"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Emergency Caregiver Button */}
        <button
          onClick={handleTriggerCaregiver}
          className="w-full mt-2 py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
        >
          <PhoneCall className="w-5 h-5 text-rose-600" />
          <span>Contact Caregiver Instantly</span>
        </button>
      </div>
    </aside>
  );
}
