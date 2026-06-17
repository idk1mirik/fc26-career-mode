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

export default function FixturesPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId   = useCareerStore(s => s.seasonId);
  const matchday   = useCareerStore(s => s.matchday);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const [fixtures, setFixtures]   = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [hydrated, setHydrated]   = useState(false);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    fetch(`/api/fixtures?seasonId=${seasonId}`)
      .then(r => r.json()).then(data => {
        setFixtures(data);
        setActiveDay(matchday);
      }).catch(() => {});
  }, [hydrated, seasonId, matchday]);

  const matchdays = useMemo(() =>
    [...new Set(fixtures.map((f: any) => f.matchday))].sort((a: any, b: any) => a - b) as number[],
    [fixtures]
  );
  const shown = useMemo(() =>
    activeDay ? fixtures.filter((f: any) => f.matchday === activeDay) : [],
    [fixtures, activeDay]
  );

  const userClub = selectedClub?.name || "";

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Fixtures</div>
          <h1 className="text-2xl font-black">Season 2025/26</h1>
        </div>

        {/* Matchday tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {matchdays.map(md => (
            <button key={md} onClick={() => setActiveDay(md)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${activeDay === md ? ui.tabActive : ui.tabIdle}`}>
              MD {md}{md === matchday ? " ▶" : ""}
            </button>
          ))}
        </div>

        {/* Matches */}
        <div className={`rounded-2xl overflow-hidden ${ui.card}`}>
          {shown.length === 0 && (
            <div className={`text-center py-10 ${ui.muted} text-sm`}>No fixtures</div>
          )}
          {(shown as any[]).map((f, i) => {
            const isUser = f.home_club === userClub || f.away_club === userClub;
            const played = f.played;
            const dateStr = f.match_date
              ? new Date(f.match_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
              : `MD ${f.matchday}`;
            return (
              <div key={f.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.highlight : ""}`}>
                <div className={`text-[10px] w-20 shrink-0 leading-tight ${ui.muted}`}>{dateStr}</div>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className={`text-sm font-bold truncate max-w-[110px] ${isUser && f.home_club === userClub ? ui.userColor : ""}`}>{f.home_club}</span>
                  <img src={getClubLogo(f.home_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                </div>
                <div className={`w-16 text-center font-black text-sm shrink-0 py-1 ${ui.scoreBg} ${played ? ui.text : ui.muted}`}>
                  {played ? `${f.home_goals} – ${f.away_goals}` : "vs"}
                </div>
                <div className="flex items-center gap-2 flex-1 justify-start">
                  <img src={getClubLogo(f.away_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                  <span className={`text-sm font-bold truncate max-w-[110px] ${isUser && f.away_club === userClub ? ui.userColor : ""}`}>{f.away_club}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
