"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import DashboardLayout from "@/app/lib/DashboardLayout";

export default function TablePage() {
  const router = useRouter();
  const theme  = useThemeStore(s => s.theme);
  const seasonId     = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const [standings, setStandings] = useState<any[]>([]);

  useEffect(() => {
    if (!seasonId) { router.push("/dashboard"); return; }
    fetch(`/api/standings?seasonId=${seasonId}`)
      .then(r => r.json()).then(setStandings).catch(() => {});
  }, [seasonId, router]);

  const isDark   = theme !== "aurora";
  const text     = isDark ? "text-white" : "text-pink-950";
  const muted    = isDark ? "text-white/40" : "text-pink-900/40";
  const card     = isDark ? "bg-white/[0.03] border border-white/[0.07]" : "bg-white/70 border border-pink-100";
  const rowHover = isDark ? "hover:bg-white/[0.03]" : "hover:bg-pink-50/50";
  const divider  = isDark ? "border-white/[0.05]" : "border-pink-50";
  const userClub = selectedClub?.name || "";

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${text}`}>
        <div className="flex items-center gap-3 mb-6">
          <img src={getLeagueLogo(selectedLeague?.name || "")} alt="" className="w-8 h-8 object-contain"
            onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-0.5 ${muted}`}>League Table</div>
            <h1 className="text-2xl font-black">{selectedLeague?.name || "League"} 2025/26</h1>
          </div>
        </div>

        <div className={`rounded-2xl overflow-hidden ${card}`}>
          {/* Header */}
          <div className={`grid text-[9px] uppercase tracking-widest ${muted} px-4 py-3 border-b ${divider}`}
            style={{ gridTemplateColumns: "32px 1fr 40px 40px 40px 40px 50px 48px" }}>
            <span>#</span><span>Club</span>
            <span className="text-center">P</span><span className="text-center">W</span>
            <span className="text-center">D</span><span className="text-center">L</span>
            <span className="text-center">GD</span><span className="text-center font-black">Pts</span>
          </div>

          {standings.length === 0 && (
            <div className={`text-center py-10 ${muted} text-sm`}>No standings yet — simulate a matchday first</div>
          )}

          {standings.map((row, i) => {
            const isUser = row.club_id === userClub;
            const gd = row.gf - row.ga;
            const zoneColor = i < 4 ? "#22c55e" : i >= standings.length - 3 ? "#ef4444" : "transparent";
            return (
              <div key={row.club_id}
                className={`grid items-center px-4 py-2.5 transition-colors ${rowHover} ${i > 0 ? `border-t ${divider}` : ""} ${isUser ? (isDark ? "bg-emerald-950/20 border-l-2 border-emerald-500" : "bg-violet-50 border-l-2 border-violet-400") : ""}`}
                style={{ gridTemplateColumns: "32px 1fr 40px 40px 40px 40px 50px 48px" }}>
                {/* # */}
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: zoneColor, opacity: zoneColor === "transparent" ? 0 : 1 }} />
                  <span className={`text-xs font-black ${muted}`}>{i + 1}</span>
                </div>
                {/* Club */}
                <div className="flex items-center gap-2 min-w-0">
                  <img src={getClubLogo(row.club_id)} alt="" className="w-5 h-5 object-contain shrink-0"
                    onError={e => (e.currentTarget.style.display = "none")} />
                  <span className={`text-sm font-bold truncate ${isUser ? (isDark ? "text-emerald-400" : "text-violet-600") : ""}`}>{row.club_id}</span>
                </div>
                <span className={`text-xs text-center ${muted}`}>{row.played}</span>
                <span className={`text-xs text-center ${muted}`}>{row.won}</span>
                <span className={`text-xs text-center ${muted}`}>{row.drawn}</span>
                <span className={`text-xs text-center ${muted}`}>{row.lost}</span>
                <span className={`text-xs text-center font-bold ${gd > 0 ? "text-emerald-400" : gd < 0 ? "text-red-400" : muted}`}>
                  {gd > 0 ? `+${gd}` : gd}
                </span>
                <span className={`text-base font-black text-center ${isUser ? (isDark ? "text-emerald-400" : "text-violet-600") : text}`}>{row.points}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`flex gap-4 mt-4 text-[10px] ${muted}`}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Champions League</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Relegation</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
