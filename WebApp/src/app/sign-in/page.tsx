"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Gamepad2,
  BookOpen,
  Music,
  Users,
  ArrowRight,
  Lock,
  Globe,
  Phone,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { speakAnnouncement } from "@/lib/speech";
import { BhasiniBot, BotState } from "@/components/mascot/BhasiniBot";
import { useAuth } from "@/components/auth/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, user, logout } = useAuth();
  const [mascotState, setMascotState] = useState<BotState>("idle");
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "caregiver">("patient");
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    setMascotState("think");

    try {
      await login({ username, password });
      setMascotState("happy");
      setSuccessMsg("Welcome back! Loading your sanctuary...");
      speakAnnouncement(`Welcome back ${username}!`);
      setTimeout(() => {
        router.push(role === "caregiver" ? "/caregiver" : "/");
      }, 700);
    } catch (err: any) {
      setMascotState("concerned");
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    setMascotState("think");

    try {
      await register({
        username,
        password,
        role,
        preferred_language: language,
        phone_number: phone || undefined,
      });
      setMascotState("happy");
      setSuccessMsg("Account created successfully! Preparing your companion...");
      speakAnnouncement(`Welcome to Cogniva, ${username}!`);
      setTimeout(() => {
        router.push(role === "caregiver" ? "/caregiver" : "/");
      }, 700);
    } catch (err: any) {
      setMascotState("concerned");
      setErrorMsg(err.message || "Registration failed. Please try a different username.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUser: string, demoPass: string, demoRole: "patient" | "caregiver") => {
    setUsername(demoUser);
    setPassword(demoPass);
    setRole(demoRole);
    setErrorMsg(null);
    setLoading(true);
    setMascotState("think");

    try {
      await login({ username: demoUser, password: demoPass });
      setMascotState("happy");
      speakAnnouncement(`Welcome ${demoUser}!`);
      router.push(demoRole === "caregiver" ? "/caregiver" : "/");
    } catch {
      // If login fails because user isn't created yet in backend, attempt registration
      try {
        await register({
          username: demoUser,
          password: demoPass,
          role: demoRole,
          preferred_language: "hi",
        });
        setMascotState("happy");
        speakAnnouncement(`Welcome ${demoUser}!`);
        router.push(demoRole === "caregiver" ? "/caregiver" : "/");
      } catch (regErr: any) {
        setMascotState("concerned");
        setErrorMsg(`Demo login/setup failed: ${regErr.message || "Backend unreachable"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] flex flex-col justify-between relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#184735] text-white flex items-center justify-center font-serif text-xl font-bold">
            C
          </div>
          <span className="font-serif font-bold text-2xl text-[#184735]">Cogniva</span>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600">
                Logged in as <strong className="text-emerald-900">{user?.username}</strong>
              </span>
              <button
                onClick={logout}
                className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/"
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200 transition-colors"
            >
              Explore as Guest →
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl w-full mx-auto px-6 py-8 flex flex-col items-center z-10">
        {/* Animated Mascot Centerpiece */}
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 mb-4 flex items-center justify-center cursor-pointer group"
          onMouseEnter={() => setMascotState("listen")}
          onMouseLeave={() => setMascotState("idle")}
          onClick={() => setMascotState("happy")}
          title="Click to interact with your companion!"
        >
          <div className="absolute inset-0 rounded-full bg-[#fdecdb] blur-2xl opacity-70 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-90" />
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-b from-[#fff6ee] via-[#fdecdb] to-[#fce4cb] border-2 border-amber-200/80 shadow-md flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
            <BhasiniBot
              state={mascotState}
              character="Orson"
              className="w-full h-full scale-115"
            />
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#184735] tracking-tight text-center leading-tight">
          A gentle day, rooted in care.
        </h1>
        <p className="text-stone-600 text-sm md:text-base font-normal text-center mt-2 max-w-md">
          Sign in to synchronize your companion's memory, routine, and care insights.
        </p>

        {/* Auth Box */}
        <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200 shadow-xl p-6 mt-6">
          {/* Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-sm font-serif font-bold rounded-xl transition-all ${
                activeTab === "signin"
                  ? "bg-white text-[#184735] shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-sm font-serif font-bold rounded-xl transition-all ${
                activeTab === "register"
                  ? "bg-white text-[#184735] shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Register New Account
            </button>
          </div>

          {/* Feedback banners */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#184735] hover:bg-[#1b4d3e] text-white font-serif font-bold text-base py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Sanctuary</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "patient" | "caregiver")}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  >
                    <option value="patient">Patient (Senior)</option>
                    <option value="caregiver">Caregiver / Family</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Voice Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "hi" | "en")}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  >
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#184735]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#184735] hover:bg-[#1b4d3e] text-white font-serif font-bold text-base py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register & Start Companion</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <span className="block text-center text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              Fast Demo Accounts
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickDemo("testpatient", "testpass123", "patient")}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Patient Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("testcaregiver", "testpass123", "caregiver")}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>Caregiver Demo</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Dock Navigation */}
      <footer className="w-full max-w-5xl mx-auto px-6 pb-8 z-10">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200 shadow-xl p-4 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-stone-200 text-center">
          <Link href="/arcade" className="p-3 hover:bg-stone-50 rounded-2xl transition-colors">
            <Gamepad2 className="w-6 h-6 text-[#184735] mx-auto mb-1" />
            <h3 className="font-serif font-bold text-xs text-slate-900">Memory Games</h3>
          </Link>

          <Link href="/" className="p-3 hover:bg-stone-50 rounded-2xl transition-colors">
            <BookOpen className="w-6 h-6 text-[#c25e43] mx-auto mb-1" />
            <h3 className="font-serif font-bold text-xs text-slate-900">Daily Routine</h3>
          </Link>

          <Link href="/" className="p-3 hover:bg-stone-50 rounded-2xl transition-colors">
            <Music className="w-6 h-6 text-[#d99a26] mx-auto mb-1" />
            <h3 className="font-serif font-bold text-xs text-slate-900">Radio & Music</h3>
          </Link>

          <Link href="/caregiver" className="p-3 hover:bg-stone-50 rounded-2xl transition-colors">
            <Users className="w-6 h-6 text-[#184735] mx-auto mb-1" />
            <h3 className="font-serif font-bold text-xs text-slate-900">Care Dashboard</h3>
          </Link>
        </div>
      </footer>
    </div>
  );
}
