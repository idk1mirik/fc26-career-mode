"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { HelpHint } from "@/components/HelpHint";

// Раньше здесь была отдельная страница "Таблица" — полный дубль виджета
// standings, который уже есть на дашборде. Вместо повторения того же самого
// здесь теперь лидеры лиги: бомбардиры, голевые передачи, средний рейтинг,
// самые "горячие" по карточкам — то, чего в игре пока не было нигде.
const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    rowHover: "hover:bg-white/[0.03]",
    divider: "border-white/[0.05]",
    userRow: "bg-emerald-950/20 border-l-2 border-emerald-500",
    userText: "text-emerald-400",
    tabActive: "bg-white/20 text-white", tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    gold: "#fbbf24", silver: "#cbd5e1", bronze: "#d97706",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    rowHover: "hover:bg-pink-50/50",
    divider: "border-pink-50",
    userRow: "bg-violet-50 border-l-2 border-violet-400",
    userText: "text-violet-600",
    tabActive: "bg-violet-500 text-white", tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
    gold: "#f59e0b", silver: "#a78bfa", bronze: "#fb7185",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    rowHover: "hover:bg-purple-950/20",
    divider: "border-purple-900/20",
    userRow: "bg-fuchsia-950/30 border-l-2 border-fuchsia-500",
    userText: "text-fuchsia-400",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700/50 text-fuchsia-300 font-mono", tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    gold: "#e879f9", silver: "#c084fc", bronze: "#a855f7",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

type TabKey = "goals" | "assists" | "rating" | "cards";

export default function LeagueLeadersPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId       = useCareerStore(s => s.seasonId);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const [leaders, setLeaders] = useState<{ topScorers: any[]; topAssists: any[]; topRated: any[]; mostCards: any[] }>({ topScorers: [], topAssists: [], topRated: [], mostCards: [] });
  const [tab, setTab] = useState<TabKey>("goals");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const ru = locale === "ru";

  useEffect(() => {
    if (!hydrated || !seasonId || !selectedLeague?.name) return;
    fetch(`/api/league-leaders?seasonId=${seasonId}&league=${encodeURIComponent(selectedLeague.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLeaders(data); })
      .catch(() => {});
  }, [hydrated, seasonId, selectedLeague?.name]);

  const userClub = selectedClub?.name || "";
  if (!hydrated) return null;

  const TABS: { key: TabKey; label: string; rows: any[]; valueOf: (r: any) => string; icon: string }[] = [
    { key: "goals", label: ru ? "Бомбардиры" : "Top Scorers", rows: leaders.topScorers, valueOf: r => String(r.goals), icon: "⚽" },
    { key: "assists", label: ru ? "Ассистенты" : "Top Assists", rows: leaders.topAssists, valueOf: r => String(r.assists), icon: "🎯" },
    { key: "rating", label: ru ? "Рейтинг" : "Best Rated", rows: leaders.topRated, valueOf: r => r.avg_rating.toFixed(2), icon: "⭐" },
    { key: "cards", label: ru ? "Карточки" : "Most Booked", rows: leaders.mostCards, valueOf: r => `🟨${r.yellow_cards ?? 0}${r.red_cards ? ` 🟥${r.red_cards}` : ""}`, icon: "🟨" },
  ];
  const active = TABS.find(t => t.key === tab)!;
  const medalColor = (i: number) => i === 0 ? ui.gold : i === 1 ? ui.silver : i === 2 ? ui.bronze : undefined;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="flex items-center gap-3 mb-6">
          <img src={getLeagueLogo(selectedLeague?.name || "")} alt="" className="w-10 h-10 object-contain"
            onError={e => (e.currentTarget.style.display = "none")} />
          <div className="flex-1">
            <div className={`text-[10px] uppercase tracking-widest mb-0.5 ${ui.muted}`}>{ru ? "Лидеры лиги" : "League Leaders"}</div>
            <h1 className="text-3xl font-display font-black">{selectedLeague?.name || (ru ? "Лига" : "League")} 2025/26</h1>
          </div>
          <HelpHint id="leaders-page-intro" theme={theme as any}
            title={ru ? "Лидеры лиги" : "League Leaders"}
            text={ru
              ? "Гонка бомбардиров, ассистентов и лучший средний рейтинг за сезон (мин. 3 матча) по всем клубам твоей лиги — обновляется после каждого сыгранного тура."
              : "The race for top scorer, top assists, and best average rating this season (min. 3 matches) across your league — updates after every matchday played."} />
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${tab === t.key ? ui.tabActive : ui.tabIdle}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div className={`rounded-2xl overflow-hidden ${ui.card} animate-fade-in-up`}>
          <div className={`grid text-[10px] uppercase tracking-widest font-bold ${ui.muted} px-5 py-4 border-b ${ui.divider}`}
            style={{ gridTemplateColumns: "40px 1fr 90px 70px" }}>
            <span>#</span><span>{ru ? "Игрок" : "Player"}</span><span className="text-center">{ru ? "Клуб" : "Club"}</span>
            <span className="text-right">{active.label}</span>
          </div>

          {active.rows.length === 0 && (
            <div className={`text-center py-10 ${ui.muted} text-sm`}>
              {ru ? "Пока нет данных — сыграйте несколько туров" : "No data yet — play a few matchdays"}
            </div>
          )}

          {active.rows.map((row: any, i: number) => {
            const isUser = row.club_id === userClub;
            return (
              <div key={row.player_id ?? `${row.club_id}-${row.player_name}`}
                className={`grid items-center px-5 py-3.5 transition-all hover:-translate-y-0.5 ${ui.rowHover} ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.userRow : ""}`}
                style={{ gridTemplateColumns: "40px 1fr 90px 70px" }}>
                <span className="text-sm font-black font-display" style={{ color: medalColor(i) }}>{i + 1}</span>
                <span className={`text-[15px] font-bold truncate ${isUser ? ui.userText : ""}`}>{row.player_name}</span>
                <div className="flex justify-center cursor-pointer" onClick={() => router.push(`/clubs/${encodeURIComponent(row.club_id)}`)} title={row.club_id}>
                  <img src={getClubLogo(row.club_id)} alt="" className="w-7 h-7 object-contain"
                    onError={e => (e.currentTarget.style.display = "none")} />
                </div>
                <span className="text-right font-display font-black text-lg">{active.valueOf(row)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
