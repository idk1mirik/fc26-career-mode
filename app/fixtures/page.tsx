"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    divider: "border-white/[0.05]",
    tabActive: "bg-white/20 text-white",
    tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    scoreBg: "bg-white/[0.06] rounded-lg",
    highlight: "bg-white/[0.04]",
    userColor: "text-emerald-400",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    divider: "border-pink-50",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
    scoreBg: "bg-pink-50 rounded-lg",
    highlight: "bg-violet-50/50",
    userColor: "text-violet-600",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    divider: "border-purple-900/20",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700/50 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    scoreBg: "bg-purple-950/30 rounded-none",
    highlight: "bg-purple-950/20",
    userColor: "text-fuchsia-400",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

const COMP_ICON: Record<string, string> = {
  league: "⚽", domestic_cup: "🏆", super_cup: "⚡", continental: "🌍",
};

const COMP_FILTERS = [
  { key: "all", label: "All" },
  { key: "league", label: "League" },
  { key: "domestic_cup", label: "Cup" },
  { key: "continental", label: "Europe" },
  { key: "super_cup", label: "Super Cup" },
];

export default function FixturesPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId   = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const [matches, setMatches] = useState<any[]>([]);
  const [filter, setFilter]   = useState("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const userClub = selectedClub?.name || "";

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    fetch(`/api/calendar?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.json()).then(data => setMatches(data.matches ?? []))
      .catch(() => {});
  }, [hydrated, seasonId, userClub]);

  const filtered = useMemo(() => {
    if (filter === "all") return matches;
    return matches.filter(m => m.competition_type === filter);
  }, [matches, filter]);

  // Группируем по месяцу для удобной навигации
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(m => {
      const key = m.match_date ? m.match_date.slice(0, 7) : "TBD";
      if (!g[key]) g[key] = [];
      g[key].push(m);
    });
    return g;
  }, [filtered]);

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Calendar</div>
          <h1 className="text-2xl font-black">Season 2025/26 — All Competitions</h1>
        </div>

        {/* Competition filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {COMP_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${filter === f.key ? ui.tabActive : ui.tabIdle}`}>
              {COMP_ICON[f.key] ?? "📋"} {f.label}
            </button>
          ))}
        </div>

        {Object.keys(grouped).length === 0 && (
          <div className={`text-center py-10 ${ui.muted} text-sm`}>No matches found</div>
        )}

        {Object.entries(grouped).map(([month, monthMatches]) => (
          <div key={month} className="mb-6">
            <div className={`text-[10px] uppercase tracking-widest font-black mb-2 ${ui.muted}`}>
              {month === "TBD" ? "Date TBD" : new Date(month + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </div>
            <div className={`rounded-2xl overflow-hidden ${ui.card}`}>
              {monthMatches.map((f, i) => {
                const isUser = f.home_club === userClub || f.away_club === userClub;
                const played = f.played;
                const dateStr = f.match_date
                  ? new Date(f.match_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })
                  : "TBD";
                return (
                  <div key={f.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.highlight : ""}`}>
                    <div className={`text-[10px] leading-tight ${ui.muted} sm:w-24 sm:shrink-0 flex items-center gap-1`}>
                      <span>{COMP_ICON[f.competition_type] ?? "⚽"}</span>
                      <span>{dateStr} · {f.competition_name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-end min-w-0">
                        <span className={`text-xs sm:text-sm font-bold truncate ${isUser && f.home_club === userClub ? ui.userColor : ""}`}>{f.home_club}</span>
                        <img src={getClubLogo(f.home_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                      </div>
                      <div className={`w-14 sm:w-16 text-center font-black text-xs sm:text-sm shrink-0 py-1 ${ui.scoreBg} ${played ? ui.text : ui.muted}`}>
                        {played ? `${f.home_goals} – ${f.away_goals}` : "vs"}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-start min-w-0">
                        <img src={getClubLogo(f.away_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                        <span className={`text-xs sm:text-sm font-bold truncate ${isUser && f.away_club === userClub ? ui.userColor : ""}`}>{f.away_club}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
