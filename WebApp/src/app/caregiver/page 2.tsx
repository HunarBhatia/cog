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
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";

const weeklyScores = [68, 71, 69, 74, 76, 78, 81];

const games = [
  { name: "Memory Garden Match", detail: "Today · 10 minutes", score: "88%", tone: "bg-emerald-50 text-emerald-800 border-emerald-100" },
  { name: "Harmonious Chimes", detail: "Yesterday · 7 minutes", score: "76%", tone: "bg-amber-50 text-amber-800 border-amber-100" },
  { name: "Art & Colors Tapestry", detail: "Sep 2 · 12 minutes", score: "82%", tone: "bg-rose-50 text-rose-800 border-rose-100" },
];

export default function CaregiverPage() {
  return (
    <main className="min-h-screen bg-[#fcfaf6] text-slate-800">
      <header className="border-b border-emerald-950/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#184735] text-emerald-200">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[#184735]">Cogniva</span>
          </Link>
          <div className="flex items-center gap-3">
            <button className="relative rounded-xl border border-stone-200 bg-white p-2.5 text-slate-600 shadow-sm" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>
            <Link href="/sign-in" className="rounded-xl bg-[#184735] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1b4d3e]">
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-6 py-8 lg:py-10">
        <Link href="/sign-in" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-950">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <section className="mt-5 flex flex-col justify-between gap-5 rounded-3xl bg-[#184735] p-7 text-white shadow-lg md:flex-row md:items-center md:p-9">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-100">
              <ShieldCheck className="h-4 w-4" /> CAREGIVER OVERVIEW
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">Martha&apos;s daily care overview</h1>
            <p className="mt-2 max-w-2xl text-emerald-100">A calm summary of her recent activities, game sessions, and patterns that may be useful to notice together.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Last updated</p>
            <p className="mt-1 flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4" /> Today, 12:45 PM</p>
          </div>
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-12">
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#184735]"><UserRound className="h-7 w-7" /></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Doing well today</span>
              </div>
              <h2 className="mt-5 font-serif text-2xl font-bold text-slate-900">Martha Sharma</h2>
              <p className="mt-1 text-sm text-slate-500">Patient ID · CG-2048 &nbsp;•&nbsp; Age 72</p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-100 pt-5 text-sm">
                <div><p className="text-slate-500">Caregiver</p><p className="mt-1 font-bold">Aaditya Sharma</p></div>
                <div><p className="text-slate-500">Preferred time</p><p className="mt-1 font-bold">10:00 AM</p></div>
              </div>
              <Link href="/" className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 py-3 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-50">View daily routine <ChevronRight className="h-4 w-4" /></Link>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-[#fff9e9] p-6">
              <div className="flex items-center gap-3 text-amber-900"><Bell className="h-5 w-5" /><h2 className="font-serif text-lg font-bold">Gentle reminder</h2></div>
              <p className="mt-3 text-sm leading-relaxed text-amber-900/75">Martha&apos;s evening medicine reminder is scheduled for 7:30 PM. No action is needed right now.</p>
              <button className="mt-4 text-sm font-bold text-amber-900 underline underline-offset-4">View reminders</button>
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-8">
            <section className="grid gap-4 sm:grid-cols-3">
              <Metric icon={Brain} label="Memory score" value="81%" detail="Up 7% this week" color="text-emerald-700 bg-emerald-50" />
              <Metric icon={Gamepad2} label="Games completed" value="12" detail="3 more than last week" color="text-amber-700 bg-amber-50" />
              <Metric icon={CalendarDays} label="Active days" value="6 / 7" detail="A steady weekly rhythm" color="text-rose-700 bg-rose-50" />
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-sm font-bold text-emerald-800">WEEKLY MEMORY PATTERN</p><h2 className="mt-1 font-serif text-2xl font-bold text-slate-900">Progress is gently trending upward</h2></div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><TrendingUp className="h-4 w-4" /> +7% this week</span>
              </div>
              <div className="mt-8 flex h-40 items-end justify-between gap-3 border-b border-stone-100 pb-1">
                {weeklyScores.map((score, index) => (
                  <div className="flex flex-1 flex-col items-center gap-2" key={score + index}>
                    <div className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-[#184735] to-emerald-400" style={{ height: `${score}%` }} title={`${score}%`} />
                    <span className="text-xs font-medium text-slate-400">{["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"][index]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950"><Sparkles className="h-5 w-5 shrink-0 text-emerald-700" /><p><span className="font-bold">Care insight:</span> Martha showed her strongest recall during morning picture-matching sessions. Keeping that familiar routine may help her feel confident.</p></div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:p-7">
              <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-emerald-800">RECENT ACTIVITY</p><h2 className="mt-1 font-serif text-2xl font-bold text-slate-900">Games Martha has played</h2></div><Link href="/arcade" className="text-sm font-bold text-emerald-800 hover:text-emerald-950">View all</Link></div>
              <div className="mt-5 divide-y divide-stone-100">
                {games.map((game) => <div key={game.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${game.tone}`}><Gamepad2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">{game.name}</h3><p className="mt-0.5 text-sm text-slate-500">{game.detail}</p></div><div className="text-right"><p className="font-serif text-xl font-bold text-[#184735]">{game.score}</p><p className="text-xs text-slate-400">session score</p></div></div>)}
              </div>
            </section>
          </div>
        </section>

        <p className="mt-7 flex items-center gap-2 text-xs leading-relaxed text-slate-500"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" /> These patterns support everyday care conversations and are not a medical diagnosis.</p>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail, color }: { icon: typeof Brain; label: string; value: string; detail: string; color: string }) {
  return <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-medium text-slate-500">{label}</p><p className="mt-1 font-serif text-3xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs font-semibold text-emerald-700">{detail}</p></div>;
}
