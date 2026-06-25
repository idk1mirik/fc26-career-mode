"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/app/lib/DashboardLayout";
import {
  LayoutDashboard, Users, Trophy, CalendarDays,
  ArrowRightLeft, Coins, ChevronRight, Zap, Star, Shield,
} from "lucide-react";
import { getLeagueTheme, getOverallColor } from "@/constants/themes";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { isLineupValid, getLineupCount, MIN_LINEUP_SIZE } from "@/lib/lineupValidation";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";
import React from "react";

const NAV = [
  { label: "Overview",     icon: LayoutDashboard, href: "/dashboard" },
  { label: "Squad",        icon: Users,           href: "/squad" },
  { label: "Transfers",    icon: ArrowRightLeft,  href: "/transfers" },
  { label: "Fixtures",     icon: CalendarDays,    href: "/fixtures" },
  { label: "League Table", icon: Trophy,          href: "/table" },
];

const GLOBAL_UI = {
  classic: {
    sidebar: "bg-black/60 border-r border-white/[0.06] backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Bebas Neue',sans-serif" },
    navItem: "hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1] rounded-2xl transition-all duration-300",
    navItemActive: "bg-white/[0.07] border border-white/[0.12] rounded-2xl",
    navIcon: "bg-white/[0.05] border border-white/[0.08] rounded-xl",
    navLabel: "font-bold text-white/70",
    navLabelActive: "font-black text-white",
    card: "bg-white/[0.03] border border-white/[0.07] rounded-[28px] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
    cardAlt: "bg-black/50 border border-white/[0.05] rounded-[28px] backdrop-blur-xl",
    subLabel: "text-white/25 uppercase tracking-[0.4em] text-[9px] font-black font-mono",
    badge: "bg-white/[0.05] border border-white/[0.08] rounded-xl",
    btnPrimary: "bg-emerald-500 text-black hover:bg-emerald-400 font-black rounded-2xl transition-all",
    btnDanger: "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/40 rounded-2xl transition-all",
    text: "text-white",
    muted: "text-white/40",
    divider: "border-white/[0.06]",
    tableRow: "hover:bg-white/[0.03]",
    tableHeader: "text-white/25",
    highlight: "bg-emerald-500/10 border-l-2 border-emerald-500",
    tabActive: "bg-emerald-500 text-black",
    tabIdle: "bg-white/[0.05] text-white/40 hover:bg-white/[0.1]",
  },
  aurora: {
    sidebar: "bg-white/55 border-r border-pink-100 backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Fraunces',serif" },
    navItem: "hover:bg-pink-50/90 border border-transparent hover:border-pink-100 rounded-2xl transition-all duration-300",
    navItemActive: "bg-pink-50 border border-pink-200 rounded-2xl",
    navIcon: "bg-pink-50 border border-pink-100 rounded-xl",
    navLabel: "font-semibold text-pink-900/70",
    navLabelActive: "font-black text-pink-900",
    card: "bg-white/65 border-2 border-pink-100 rounded-[32px] backdrop-blur-xl shadow-[0_8px_40px_rgba(236,72,153,0.08)]",
    cardAlt: "bg-white/50 border border-violet-100 rounded-[32px] backdrop-blur-xl",
    subLabel: "text-pink-800/40 uppercase tracking-widest text-[9px] font-black",
    badge: "bg-pink-50 border border-pink-100 rounded-xl",
    btnPrimary: "bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:opacity-90 rounded-2xl transition-all",
    btnDanger: "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 rounded-2xl",
    text: "text-pink-950",
    muted: "text-pink-900/40",
    divider: "border-pink-100",
    tableRow: "hover:bg-pink-50/50",
    tableHeader: "text-pink-800/40",
    highlight: "bg-violet-50 border-l-2 border-violet-400",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
  },
  maleficent: {
    sidebar: "bg-black/85 border-r border-purple-900/40 backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Share Tech Mono',monospace" },
    navItem: "hover:bg-purple-950/40 border border-transparent hover:border-fuchsia-900/50 rounded-none transition-all",
    navItemActive: "bg-purple-950/40 border border-fuchsia-800/50 rounded-none",
    navIcon: "bg-purple-950/30 border border-purple-900/30 rounded-none",
    navLabel: "font-mono text-purple-400/60 uppercase text-xs tracking-wider",
    navLabelActive: "font-mono font-black text-fuchsia-300 uppercase text-xs tracking-wider",
    card: "bg-black/80 border border-purple-900/50 rounded-none backdrop-blur-xl",
    cardAlt: "bg-black/60 border border-purple-900/30 rounded-none backdrop-blur-xl",
    subLabel: "text-purple-500/40 uppercase tracking-[0.5em] text-[8px] font-black font-mono",
    badge: "bg-purple-950/30 border border-purple-900/40 rounded-none font-mono",
    btnPrimary: "border border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-950/60 font-mono uppercase tracking-widest rounded-none transition-all",
    btnDanger: "border border-red-900/60 text-red-500/70 hover:bg-red-950/20 font-mono uppercase tracking-widest rounded-none transition-all",
    text: "text-purple-100",
    muted: "text-purple-500/40",
    divider: "border-purple-900/30",
    tableRow: "hover:bg-purple-950/20",
    tableHeader: "text-purple-500/40 font-mono",
    highlight: "bg-fuchsia-950/30 border-l-2 border-fuchsia-500",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
  },
};

// ─── STANDINGS TABLE ──────────────────────────────────────────────────────────
function StandingsTable({ standings, userClub, ui, theme, glowColor }: {
  standings: any[]; userClub: string; ui: any; theme: string; glowColor: string;
}) {
  if (!standings.length) return (
    <div className={`text-center py-8 ${ui.muted} text-sm`}>No standings yet</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`text-[10px] uppercase tracking-widest ${ui.tableHeader} border-b ${ui.divider}`}>
            <th className="text-left pb-3 pl-2 w-6">#</th>
            <th className="text-left pb-3">Club</th>
            <th className="pb-3 text-center">P</th>
            <th className="pb-3 text-center">W</th>
            <th className="pb-3 text-center">D</th>
            <th className="pb-3 text-center">L</th>
            <th className="pb-3 text-center">GD</th>
            <th className="pb-3 text-center font-black">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const isUser = row.club_id === userClub;
            const gd = row.gf - row.ga;
            return (
              <tr key={row.club_id}
                className={`transition-colors ${ui.tableRow} ${isUser ? ui.highlight : ""}`}>
                <td className={`py-2.5 pl-2 font-black text-xs ${i < 4 ? "text-emerald-400" : i > standings.length - 4 ? "text-red-400" : ui.muted}`}>{i + 1}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <img src={getClubLogo(row.club_id)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                    <span className={`font-bold truncate max-w-[120px] ${isUser ? (theme === "classic" ? "text-emerald-400" : theme === "aurora" ? "text-violet-600" : "text-fuchsia-400") : ui.text}`}>{row.club_id}</span>
                  </div>
                </td>
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.played}</td>
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.won}</td>
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.drawn}</td>
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.lost}</td>
                <td className={`py-2.5 text-center ${gd > 0 ? "text-emerald-400" : gd < 0 ? "text-red-400" : ui.muted}`}>{gd > 0 ? `+${gd}` : gd}</td>
                <td className={`py-2.5 text-center font-black text-base ${isUser ? (theme === "classic" ? "text-emerald-400" : theme === "aurora" ? "text-violet-600" : "text-fuchsia-400") : ui.text}`}>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MATCH RESULT ROW ─────────────────────────────────────────────────────────
function MatchRow({ fix, userClub, ui, theme, onOpenReport }: { fix: any; userClub: string; ui: any; theme: string; onOpenReport?: (fix: any) => void }) {
  const isUser = fix.home_club === userClub || fix.away_club === userClub;
  const played = fix.played;
  const clickable = played && onOpenReport;
  return (
    <div onClick={() => clickable && onOpenReport(fix)}
      className={`flex items-center gap-2 py-2.5 px-3 rounded-xl transition-colors ${ui.tableRow} ${isUser ? ui.highlight : ""} ${clickable ? "cursor-pointer" : ""}`}>
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        <span className={`text-sm font-bold truncate max-w-[100px] ${ui.text}`}>{fix.home_club}</span>
        <img src={getClubLogo(fix.home_club)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
      </div>
      <div className={`w-16 text-center font-black text-sm shrink-0 ${played ? ui.text : ui.muted}`}>
        {played ? `${fix.home_goals} – ${fix.away_goals}` : "vs"}
      </div>
      <div className="flex items-center gap-1.5 flex-1 justify-start">
        <img src={getClubLogo(fix.away_club)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
        <span className={`text-sm font-bold truncate max-w-[100px] ${ui.text}`}>{fix.away_club}</span>
      </div>
    </div>
  );
}

// ─── MATCH REPORT MODAL ───────────────────────────────────────────────────────
const EVENT_ICON: Record<string, string> = {
  goal: "⚽", yellow: "🟨", red: "🟥", substitution: "🔁", injury: "🩹",
};

function MatchReportModal({ fix, ui, theme, onClose }: { fix: any; ui: any; theme: string; onClose: () => void }) {
  const events = fix.events ?? [];
  const ratings = fix.ratings ?? { home: [], away: [] };
  const [tab, setTab] = useState<"events" | "ratings">("events");
  const [selectedRatingPlayer, setSelectedRatingPlayer] = useState<any>(null);

  const ratingColor = (r: number) => r >= 8.5 ? "#22c55e" : r >= 7.0 ? "#84cc16" : r >= 6.0 ? "#eab308" : r >= 5.0 ? "#f97316" : "#ef4444";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className={`w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto ${ui.card}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>Match Report</div>
          <button onClick={onClose} className={`text-lg ${ui.muted}`}>✕</button>
        </div>
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="flex flex-col items-center gap-1">
            <img src={getClubLogo(fix.home_club)} alt="" className="w-10 h-10 object-contain" />
            <span className={`text-xs font-bold ${ui.text}`}>{fix.home_club}</span>
          </div>
          <div className={`text-3xl font-black ${ui.text}`}>{fix.home_goals} – {fix.away_goals}</div>
          <div className="flex flex-col items-center gap-1">
            <img src={getClubLogo(fix.away_club)} alt="" className="w-10 h-10 object-contain" />
            <span className={`text-xs font-bold ${ui.text}`}>{fix.away_club}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("events")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "events" ? ui.tabActive : ui.tabIdle}`}>
            Events
          </button>
          <button onClick={() => setTab("ratings")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "ratings" ? ui.tabActive : ui.tabIdle}`}>
            Player Ratings
          </button>
        </div>

        {tab === "events" && (
          <div className="space-y-2">
            {events.length === 0 && <div className={`text-center text-sm ${ui.muted} py-4`}>No events recorded</div>}
            {events.map((e: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-xl ${ui.tableRow}`}>
                <span className={`text-xs font-black w-8 ${ui.muted}`}>{e.minute}'</span>
                <span className="text-base">{EVENT_ICON[e.type] ?? "•"}</span>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${ui.text}`}>
                    {e.type === "substitution" ? `${e.player2} ↔ ${e.player}` : e.player}
                  </div>
                  <div className={`text-[10px] ${ui.muted} capitalize`}>
                    {e.team === "home" ? fix.home_club : fix.away_club} · {e.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "ratings" && (
          <div className="space-y-5">
            {[{ label: fix.home_club, list: ratings.home ?? [] }, { label: fix.away_club, list: ratings.away ?? [] }].map(({ label, list }) => {
              const starters = list.filter((p: any) => !p.subbedIn);
              const subs = list.filter((p: any) => p.subbedIn);
              return (
                <div key={label}>
                  <div className={`text-[10px] uppercase tracking-widest font-black mb-2 flex items-center gap-1.5 ${ui.muted}`}>
                    <img src={getClubLogo(label)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {label}
                  </div>

                  {/* Стартовый состав — сетка как на поле, по линиям */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {starters.length === 0 && <div className={`text-xs col-span-3 ${ui.muted}`}>No data</div>}
                    {starters.map((p: any, i: number) => (
                      <button key={i} onClick={() => setSelectedRatingPlayer(p)}
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${ui.tableRow}`}>
                        <span className={`text-[11px] font-bold truncate ${ui.text}`}>{p.name}</span>
                        <span className="text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1" style={{ color: ratingColor(p.rating), background: `${ratingColor(p.rating)}18` }}>
                          {p.rating.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Замены — отдельным блоком */}
                  {subs.length > 0 && (
                    <div>
                      <div className={`text-[9px] uppercase tracking-widest mb-1 ${ui.muted}`}>Substitutes</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {subs.map((p: any, i: number) => (
                          <button key={i} onClick={() => setSelectedRatingPlayer(p)}
                            className={`flex items-center justify-between py-1.5 px-2 rounded-lg opacity-80 transition-colors ${ui.tableRow}`}>
                            <span className={`text-[11px] font-bold truncate ${ui.text}`}>{p.name}</span>
                            <span className="text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1" style={{ color: ratingColor(p.rating), background: `${ratingColor(p.rating)}18` }}>
                              {p.rating.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedRatingPlayer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedRatingPlayer(null)}>
            <div className={`w-full max-w-xs rounded-2xl p-5 ${ui.card}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-black ${ui.text}`}>{selectedRatingPlayer.name}</span>
                <span className="text-lg font-black px-2 py-0.5 rounded-md" style={{ color: ratingColor(selectedRatingPlayer.rating), background: `${ratingColor(selectedRatingPlayer.rating)}18` }}>
                  {selectedRatingPlayer.rating.toFixed(1)}
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  ["Goals", selectedRatingPlayer.stats?.goals],
                  ["Assists", selectedRatingPlayer.stats?.assists],
                  ["Key Passes", selectedRatingPlayer.stats?.keyPasses],
                  ["Saves", selectedRatingPlayer.stats?.saves],
                  ["Tackles", selectedRatingPlayer.stats?.tackles],
                  ["Interceptions", selectedRatingPlayer.stats?.interceptions],
                  ["Mistakes", selectedRatingPlayer.stats?.mistakes],
                  ["Minutes", selectedRatingPlayer.stats?.minutesPlayed],
                ].filter(([, v]) => v !== undefined).map(([label, value]) => (
                  <div key={label as string} className={`flex items-center justify-between text-xs ${ui.muted}`}>
                    <span>{label}</span>
                    <span className={`font-bold ${ui.text}`}>{value as any}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const theme = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;

  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const seasonId       = useCareerStore(s => s.seasonId);
  const matchday       = useCareerStore(s => s.matchday);
  const setMatchday    = useCareerStore(s => s.setMatchday);
  const tactic         = useCareerStore(s => s.tactic) || "Balanced";
  const customTactic   = useCareerStore(s => s.customTactic);
  const lineup         = useCareerStore(s => s.lineup);
  const formation       = useCareerStore(s => s.formation) || "4-3-3";
  const setFormation     = useCareerStore(s => s.setFormation);
  const lineupsByFormation = useCareerStore(s => s.lineupsByFormation);
  const customFormationsStore = useCareerStore(s => s.customFormations);
  const setSeasonId    = useCareerStore(s => s.setSeasonId);

  const [hydrated, setHydrated]     = useState(false);
  const [standings, setStandings]   = useState<any[]>([]);
  const [fixtures, setFixtures]     = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seasonFinished, setSeasonFinished] = useState(false);
  const [reportFix, setReportFix] = useState<any>(null);
  const [activeNav, setActiveNav]   = useState("/dashboard");
  const [calendar, setCalendar]     = useState<any[]>([]);
  const [unavailableNames, setUnavailableNames] = useState<Set<string>>(new Set());
  const [simulatingCup, setSimulatingCup] = useState(false);

  const availableLineupPlayers = useMemo(() =>
    Object.values(lineup || {}).filter((p: any) => p && !unavailableNames.has(p.name)),
    [lineup, unavailableNames]
  );
  const lineupValid    = availableLineupPlayers.length >= MIN_LINEUP_SIZE;
  const unavailableInLineup = useMemo(() =>
    Object.values(lineup || {}).filter((p: any) => p && unavailableNames.has(p.name)).map((p: any) => p.name),
    [lineup, unavailableNames]
  );
  const lineupCount    = availableLineupPlayers.length;

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !selectedClub) router.push("/leagues");
  }, [hydrated, selectedClub, router]);

  const leagueTheme = getLeagueTheme(selectedLeague?.name || selectedClub?.league || "Premier League", theme);
  const glowColor   = leagueTheme?.rawColor || "#ffffff";
  const userClub    = selectedClub?.name || "";

  // Загрузка таблицы и расписания
  const loadData = useCallback(async (sid: string) => {
    const [sRes, fRes] = await Promise.all([
      fetch(`/api/standings?seasonId=${sid}`),
      fetch(`/api/fixtures?seasonId=${sid}`),
    ]);
    if (sRes.ok) setStandings(await sRes.json());
    if (fRes.ok) setFixtures(await fRes.json());
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    loadData(seasonId);
    fetch(`/api/season?id=${seasonId}`).then(r => r.ok ? r.json() : null).then(s => {
      if (s?.status === "finished") setSeasonFinished(true);
    }).catch(() => {});
  }, [seasonId, loadData]);

  // Загружаем единый календарь (лига + кубки) для определения следующего матча
  const loadCalendar = useCallback(async (sid: string, clubId: string) => {
    const res = await fetch(`/api/calendar?seasonId=${sid}&clubId=${encodeURIComponent(clubId)}`);
    if (res.ok) {
      const data = await res.json();
      setCalendar(data.matches ?? []);
    }
    const statusRes = await fetch(`/api/player-status?seasonId=${sid}&clubId=${encodeURIComponent(clubId)}`);
    if (statusRes.ok) {
      const sd = await statusRes.json();
      setUnavailableNames(new Set((sd.statuses ?? []).map((s: any) => s.player_name)));
    }
  }, []);

  useEffect(() => {
    if (!seasonId || !userClub) return;
    loadCalendar(seasonId, userClub);
  }, [seasonId, userClub, loadCalendar]);

  // Следующий несыгранный матч клуба (лига ИЛИ кубок) по дате
  const nextMatch = useMemo(() => {
    return calendar.find(m => !m.played) ?? null;
  }, [calendar]);

  // Симуляция кубкового раунда
  const advanceCupRound = async () => {
    if (!nextMatch?.competition_id || simulatingCup || !lineupValid) return;
    setSimulatingCup(true);
    try {
      const res = await fetch("/api/cup/advance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: nextMatch.competition_id, userClubId: userClub, userTactic: tactic, userLineup: Object.values(lineup || {}).filter(Boolean) }),
      });
      if (res.ok) await loadCalendar(seasonId!, userClub);
    } catch (e) { console.error(e); }
    setSimulatingCup(false);
  };


  // Симуляция тура
  const advanceMatchday = async () => {
    if (!seasonId || simulating) return;
    setSimulating(true);
    setShowResults(false);
    setApiError(null);
    try {
      const res = await fetch("/api/season/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, userClubId: userClub, userTactic: tactic, userCustomTactic: tactic === "Custom" ? customTactic : undefined, userLineup: Object.values(lineup || {}).filter(Boolean) }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastResults(data.results || []);
        setMatchday(data.nextMatchday);
        setShowResults(true);
        await loadData(seasonId);
        await loadCalendar(seasonId, userClub);
        if (data.finished) setSeasonFinished(true);
      } else {
        setApiError(data.error || "Could not simulate matchday.");
      }
    } catch (e) { console.error(e); setApiError("Network error — try again."); }
    setSimulating(false);
  };

  // Текущий и следующий тур
  const currentFixtures = useMemo(() => fixtures.filter(f => f.matchday === matchday), [fixtures, matchday]);
  const lastPlayedDay   = useMemo(() => {
    const played = fixtures.filter(f => f.played);
    if (!played.length) return null;
    return Math.max(...played.map(f => f.matchday));
  }, [fixtures]);
  const lastFixtures = useMemo(() =>
    lastPlayedDay ? fixtures.filter(f => f.matchday === lastPlayedDay) : [],
    [fixtures, lastPlayedDay]
  );

  const userRow = standings.find(s => s.club_id === userClub);
  const userPos = userRow ? standings.indexOf(userRow) + 1 : "—";

  const [startingNewSeason, setStartingNewSeason] = useState(false);
  const handleStartNewSeason = async () => {
    if (!seasonId || startingNewSeason) return;
    setStartingNewSeason(true);
    try {
      const res = await fetch("/api/season/new", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldSeasonId: seasonId }),
      });
      if (res.ok) {
        const data = await res.json();
        useCareerStore.getState().setSeasonId(data.seasonId);
        useCareerStore.getState().setMatchday(1);
        setSeasonFinished(false);
        setStandings([]); setFixtures([]); setCalendar([]); setLastResults([]); setShowResults(false);
      }
    } catch (e) { console.error(e); }
    setStartingNewSeason(false);
  };

  if (!hydrated || !selectedClub) return null;

  if (seasonFinished) {
    const sortedStandings = [...standings].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    return (
      <DashboardLayout>
        <main className={`min-h-screen relative overflow-hidden flex items-center justify-center p-6 ${theme === "aurora" ? "bg-[#fef6ff]" : "bg-[#03040a]"}`}>
          <div className={`w-full max-w-lg p-8 rounded-3xl text-center ${ui.card}`}>
            <div className="text-5xl mb-3">🏁</div>
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.subLabel}`}>Season Complete</div>
            <h1 className={`text-2xl font-black mb-1 ${ui.text}`}>{selectedClub.name}</h1>
            <div className={`text-sm mb-6 ${ui.muted}`}>Final position: #{userPos} of {sortedStandings.length}</div>

            <div className="flex justify-center gap-2 mb-6">
              <img src={getClubLogo(sortedStandings[0]?.club_id || "")} className="w-10 h-10 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
              <div className="text-left">
                <div className={`text-[10px] uppercase ${ui.muted}`}>Champion</div>
                <div className={`text-sm font-black ${ui.text}`}>{sortedStandings[0]?.club_id}</div>
              </div>
            </div>

            <button onClick={handleStartNewSeason} disabled={startingNewSeason}
              className={`w-full py-4 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${ui.btnPrimary}`}>
              <Zap size={16} />
              {startingNewSeason ? "Starting new season…" : "Start New Season →"}
            </button>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <main className={`min-h-screen relative overflow-hidden ${theme === "aurora" ? "bg-[#fef6ff]" : "bg-[#03040a]"}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Share+Tech+Mono&display=swap');
        .fade-in { animation: fadeIn 0.4s ease both; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>

      {/* BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ backgroundColor: `${glowColor}10` }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${glowColor}08` }} />
      </div>

      {/* Main */}
      <div className={`relative z-10 p-6 md:p-8 pt-16 lg:pt-8 ${ui.text}`}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className={`${ui.subLabel} mb-1`}>Dashboard</div>
            <h2 className="text-2xl font-black" style={theme === "classic" ? { fontFamily: "'Bebas Neue',sans-serif", fontSize: "2.2rem" } : theme === "maleficent" ? { fontFamily: "'Share Tech Mono',monospace" } : {}}>
              {selectedClub?.name} — Season 2025/26
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* LEFT: fixtures + simulate */}
          <div className="xl:col-span-3 space-y-5 fade-in">

            {/* Главный игровой блок: либо кубковый матч (если его очередь пришла), либо лига.
                Кубок ПОЛНОСТЬЮ заменяет лигу на этой неделе — они никогда не показываются одновременно. */}
            {(() => {
              const careerDate = getLeagueMatchdayDate(matchday);
              const cupReady = seasonId && nextMatch && nextMatch.source === "cup" &&
                (!nextMatch.match_date || nextMatch.match_date <= careerDate);

              if (cupReady) {
                return (
                  <div className={`p-6 ${ui.card}`} style={{ borderLeft: `3px solid ${glowColor}` }}>
                    <div className={`${ui.subLabel} mb-2 flex items-center gap-2`}>
                      <span>🏆 {nextMatch.competition_name} — {nextMatch.round_name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className={`text-lg font-black ${ui.text} flex items-center gap-2`}>
                        <img src={getClubLogo(nextMatch.home_club)} className="w-6 h-6 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                        {nextMatch.home_club} vs {nextMatch.away_club}
                        <img src={getClubLogo(nextMatch.away_club)} className="w-6 h-6 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                      </div>
                      <button onClick={advanceCupRound} disabled={simulatingCup || !lineupValid}
                        className={`px-6 py-3 font-black text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${ui.btnPrimary}`}>
                        <Zap size={16} />
                        {simulatingCup ? "Simulating…" : "Play Match"}
                      </button>
                    </div>
                    {!lineupValid && (
                      <div className="mt-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        ⚠️ You need {MIN_LINEUP_SIZE} available players to play ({lineupCount}/{MIN_LINEUP_SIZE} available).
                    {unavailableInLineup.length > 0 && <> Unavailable: <b>{unavailableInLineup.join(", ")}</b>.</>}
                    {" "}<Link href="/squad" className="underline">Set up your Squad →</Link>
                      </div>
                    )}
                  </div>
                );
              }

              if (!seasonId) {
                return (
                  <div className={`p-6 ${ui.card} text-center`}>
                    <p className={`${ui.muted} mb-4 text-sm`}>No active season. Start a career first.</p>
                    <Link href="/leagues"><button className={`px-6 py-3 ${ui.btnPrimary}`}>Start Career</button></Link>
                  </div>
                );
              }

              return (
                <div className={`p-6 ${ui.card}`}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className={`${ui.subLabel} mb-1`}>Matchday {matchday}</div>
                      <div className={`text-lg font-black ${ui.text}`}>{currentFixtures.length} matches to play</div>
                    </div>
                    <button onClick={advanceMatchday} disabled={simulating || currentFixtures.every(f => f.played) || !lineupValid}
                      className={`px-6 py-3 font-black text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${ui.btnPrimary}`}>
                      <Zap size={16} />
                      {simulating ? "Simulating…" : "Simulate Matchday"}
                    </button>
                  </div>
                  {!lineupValid && (
                    <div className="mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                      ⚠️ You need {MIN_LINEUP_SIZE} available players to play ({lineupCount}/{MIN_LINEUP_SIZE} available).
                    {unavailableInLineup.length > 0 && <> Unavailable: <b>{unavailableInLineup.join(", ")}</b>.</>}
                    {" "}<Link href="/squad" className="underline">Set up your Squad →</Link>
                    </div>
                  )}
                {/* Choose lineup for this matchday */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t" style={{ borderColor: theme === "classic" ? "rgba(255,255,255,0.05)" : theme === "aurora" ? "#fce7f3" : "rgba(139,92,246,0.15)" }}>
                  <span className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>Lineup:</span>
                  {Object.keys(lineupsByFormation || {}).map(f => (
                    <button key={f} onClick={() => {
                        setFormation(f);
                        useCareerStore.getState().setLineup(lineupsByFormation[f]);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={{ background: formation === f ? `${leagueTheme.rawColor}30` : "rgba(255,255,255,0.05)", color: formation === f ? leagueTheme.rawColor : undefined }}>
                      {f}
                    </button>
                  ))}
                  {Object.keys(customFormationsStore || {}).map(f => (
                    <button key={f} onClick={() => {
                        setFormation(f);
                        useCareerStore.getState().setLineup(customFormationsStore[f].lineup);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={{ background: formation === f ? `${leagueTheme.rawColor}30` : "rgba(255,255,255,0.05)", color: formation === f ? leagueTheme.rawColor : undefined }}>
                      📐 {f}
                    </button>
                  ))}
                  <Link href="/squad" className="text-[10px] underline opacity-50 hover:opacity-100">Manage in Squad →</Link>
                </div>
              </div>
              );
            })()}

            {/* Last results */}
            {showResults && lastResults.length > 0 && (
              <div className={`p-5 ${ui.card} fade-in`}>
                <div className={`${ui.subLabel} mb-3`}>Matchday {matchday - 1} Results</div>
                <div className="space-y-1">
                  {lastResults.map((r, i) => (
                    <MatchRow key={i} fix={{ ...r, home_club: r.home, away_club: r.away, played: true, home_goals: r.homeGoals, away_goals: r.awayGoals, events: r.events }} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                  ))}
                </div>
              </div>
            )}

            {/* Current matchday fixtures */}
            {currentFixtures.length > 0 && (
              <div className={`p-5 ${ui.card}`}>
                <div className={`${ui.subLabel} mb-3`}>Matchday {matchday} — Upcoming</div>
                <div className="space-y-1">
                  {currentFixtures.map((f, i) => (
                    <MatchRow key={i} fix={f} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: standings */}
          <div className="xl:col-span-2 fade-in">
            <div className={`p-5 ${ui.card}`}>
              <div className="flex items-center gap-2 mb-4">
                <img src={getLeagueLogo(selectedLeague?.name || selectedClub?.league || "")} alt="" className="w-6 h-6 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                <div className={`${ui.subLabel}`}>{selectedLeague?.name || selectedClub?.league || "League Table"}</div>
              </div>
              {!seasonId ? (
                <div className={`${ui.muted} text-sm text-center py-4`}>Start a career to see standings</div>
              ) : (
                <StandingsTable standings={standings} userClub={userClub} ui={ui} theme={theme} glowColor={glowColor} />
              )}
            </div>
          </div>

        </div>
      </div>

      {reportFix && (
        <MatchReportModal fix={reportFix} ui={ui} theme={theme} onClose={() => setReportFix(null)} />
      )}
    </main>
    </DashboardLayout>
  );
}
