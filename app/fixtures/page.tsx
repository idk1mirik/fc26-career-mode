"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";

export default function FixturesPage() {
  const router = useRouter();
  const theme  = useThemeStore(s => s.theme);
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

  useEffect(() => {
    if (!hydrated) return;
    if (!seasonId) { router.push("/dashboard"); return; }
    fetch(`/api/fixtures?seasonId=${seasonId}`)
      .then(r => r.json()).then(data => {
        setFixtures(data);
        setActiveDay(matchday);
      }).catch(() => {});
  }, [hydrated, seasonId, matchday, router]);

  const matchdays = useMemo(() => [...new Set(fixtures.map((f: any) => f.matchday))].sort((a: any, b: any) => a - b), [fixtures]);
  const shown     = useMemo(() => activeDay ? fixtures.filter((f: any) => f.matchday === activeDay) : [], [fixtures, activeDay]);

  const isDark   = theme !== "aurora";
  const text     = isDark ? "text-white" : "text-pink-950";
  const muted    = isDark ? "text-white/40" : "text-pink-900/40";
  const card     = isDark ? "bg-white/[0.03] border border-white/[0.07]" : "bg-white/70 border border-pink-100";
  const divider  = isDark ? "border-white/[0.05]" : "border-pink-50";
  const userClub = selectedClub?.name || "";

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${text}`}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${muted}`}>Fixtures</div>
          <h1 className="text-2xl font-black">Season 2025/26</h1>
        </div>

        {/* Matchday tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {(matchdays as number[]).map(md => (
            <button key={md} onClick={() => setActiveDay(md)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                activeDay === md
                  ? isDark ? "bg-white/20 text-white" : "bg-violet-500 text-white"
                  : isDark ? "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]" : "bg-pink-50 text-pink-400 hover:bg-pink-100"
              }`}>
              MD {md} {md === matchday ? "▶" : ""}
            </button>
          ))}
        </div>

        {/* Matches */}
        <div className={`rounded-2xl overflow-hidden ${card}`}>
          {shown.length === 0 && (
            <div className={`text-center py-10 ${muted} text-sm`}>No fixtures</div>
          )}
          {(shown as any[]).map((f, i) => {
            const isUser = f.home_club === userClub || f.away_club === userClub;
            const played = f.played;
            const dateStr = f.match_date
              ? new Date(f.match_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
              : `Matchday ${f.matchday}`;
            return (
              <div key={f.id}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${i > 0 ? `border-t ${divider}` : ""} ${isUser ? (isDark ? "bg-white/[0.04]" : "bg-violet-50/50") : ""}`}>
                {/* Date */}
                <div className={`text-[10px] w-20 shrink-0 leading-tight ${muted}`}>{dateStr}</div>
                {/* Home */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className={`text-sm font-bold truncate max-w-[110px] ${isUser && f.home_club === userClub ? (isDark ? "text-emerald-400" : "text-violet-600") : ""}`}>{f.home_club}</span>
                  <img src={getClubLogo(f.home_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
                {/* Score */}
                <div className={`w-16 text-center font-black text-sm shrink-0 ${isDark ? "bg-white/[0.05] rounded-lg py-1" : "bg-pink-50 rounded-lg py-1"} ${played ? text : muted}`}>
                  {played ? `${f.home_goals} – ${f.away_goals}` : "vs"}
                </div>
                {/* Away */}
                <div className="flex items-center gap-2 flex-1 justify-start">
                  <img src={getClubLogo(f.away_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className={`text-sm font-bold truncate max-w-[110px] ${isUser && f.away_club === userClub ? (isDark ? "text-emerald-400" : "text-violet-600") : ""}`}>{f.away_club}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
