"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getThemeCopy } from "@/lib/i18n";
import { HelpHint } from "@/components/HelpHint";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    rowHover: "hover:bg-white/[0.03]",
    divider: "border-white/[0.05]",
    userRow: "bg-emerald-950/20 border-l-2 border-emerald-500",
    userText: "text-emerald-400",
    userPts: "text-emerald-400",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    rowHover: "hover:bg-pink-50/50",
    divider: "border-pink-50",
    userRow: "bg-violet-50 border-l-2 border-violet-400",
    userText: "text-violet-600",
    userPts: "text-violet-600",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    rowHover: "hover:bg-purple-950/20",
    divider: "border-purple-900/20",
    userRow: "bg-fuchsia-950/30 border-l-2 border-fuchsia-500",
    userText: "text-fuchsia-400",
    userPts: "text-fuchsia-400",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

export default function TablePage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId       = useCareerStore(s => s.seasonId);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const [standings, setStandings] = useState<any[]>([]);
  const [hydrated, setHydrated]   = useState(false);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    fetch(`/api/standings?seasonId=${seasonId}`)
      .then(r => r.json()).then(setStandings).catch(() => {});
  }, [hydrated, seasonId]);

  const userClub = selectedClub?.name || "";

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="flex items-center gap-3 mb-6">
          <img src={getLeagueLogo(selectedLeague?.name || "")} alt="" className="w-10 h-10 object-contain"
            onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-0.5 ${ui.muted}`}>{copy.tableTitle}</div>
            <h1 className="text-3xl font-display font-black">{selectedLeague?.name || (locale === "ru" ? "Лига" : "League")} 2025/26</h1>
          </div>
        </div>

        <div className={`rounded-2xl overflow-hidden ${ui.card} animate-fade-in-up`}>
          {/* Header */}
          <div className={`grid text-[10px] uppercase tracking-widest font-bold ${ui.muted} px-5 py-4 border-b ${ui.divider}`}
            style={{ gridTemplateColumns: "40px 1fr 50px 50px 50px 50px 50px 50px 55px 64px" }}>
            <span>#</span><span>{locale === "ru" ? "Клуб" : "Club"}</span>
            <span className="text-center">{copy.tableP}</span>
            <span className="text-center">{copy.tableW}</span>
            <span className="text-center">{copy.tableD}</span>
            <span className="text-center">{copy.tableL}</span>
            <span className="text-center">{locale === "ru" ? "ЗМ" : "GF"}</span>
            <span className="text-center">{locale === "ru" ? "ПМ" : "GA"}</span>
            <span className="text-center">{copy.tableGD}</span>
            <span className="text-center font-black">{copy.tablePts}</span>
          </div>

          {standings.length === 0 && (
            <div className={`text-center py-10 ${ui.muted} text-sm`}>
              {copy.tableNoStandings}
            </div>
          )}

          {standings.map((row, i) => {
            const isUser = row.club_id === userClub;
            const gd = row.gf - row.ga;
            const zoneColor = i < 4 ? "#22c55e" : i >= standings.length - 3 ? "#ef4444" : null;
            return (
              <div key={row.club_id}
                className={`grid items-center px-5 py-4 transition-colors ${ui.rowHover} ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? `${ui.userRow} scale-[1.005]` : ""}`}
                style={{ gridTemplateColumns: "40px 1fr 50px 50px 50px 50px 50px 50px 55px 64px" }}>

                {/* # + zone indicator */}
                <div className="flex items-center gap-2">
                  {zoneColor
                    ? <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />
                    : <div className="w-1.5 h-6 shrink-0" />
                  }
                  <span className={`text-sm font-black font-display ${ui.muted}`}>{i + 1}</span>
                </div>

                {/* Club */}
                <div className="flex items-center gap-3 min-w-0">
                  <img src={getClubLogo(row.club_id)} alt="" className="w-8 h-8 object-contain shrink-0"
                    onError={e => (e.currentTarget.style.display = "none")} />
                  <span className={`text-[15px] font-bold truncate ${isUser ? ui.userText : ""}`}>
                    {row.club_id}
                    {isUser && <span className={`ml-1.5 text-[9px] font-black uppercase tracking-widest ${ui.userText} opacity-70`}>{locale === "ru" ? "твой клуб" : "you"}</span>}
                  </span>
                </div>

                <span className={`text-sm text-center ${ui.muted}`}>{row.played}</span>
                <span className={`text-sm text-center ${ui.muted}`}>{row.won}</span>
                <span className={`text-sm text-center ${ui.muted}`}>{row.drawn}</span>
                <span className={`text-sm text-center ${ui.muted}`}>{row.lost}</span>
                <span className={`text-sm text-center ${ui.muted}`}>{row.gf}</span>
                <span className={`text-sm text-center ${ui.muted}`}>{row.ga}</span>
                <span className={`text-sm text-center font-bold ${gd > 0 ? "text-emerald-400" : gd < 0 ? "text-red-400" : ui.muted}`}>
                  {gd > 0 ? `+${gd}` : gd}
                </span>
                <span className={`text-lg font-display font-black text-center ${isUser ? ui.userPts : ui.text}`}>
                  {row.points}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className={`flex gap-5 mt-5 text-xs font-bold ${ui.muted} items-center`}>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            {copy.tableChampionsLeague}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            {copy.tableRelegation}
          </span>
          <HelpHint id="table-zones" theme={theme as any}
            title={locale === "ru" ? "Зоны таблицы" : "Table zones"}
            text={locale === "ru"
              ? "Верхние 4 места дают путёвку в еврокубки на следующий сезон, нижние 3 — вылет в низший дивизион."
              : "Top 4 earn continental qualification for next season, bottom 3 get relegated."} />
        </div>
      </div>
    </DashboardLayout>
  );
}
