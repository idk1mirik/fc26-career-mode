"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getLeagueTheme } from "@/constants/themes";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { isLineupValid, getLineupCount, MIN_LINEUP_SIZE } from "@/lib/lineupValidation";
import { getClubLogo } from "@/data/clublogos";
import { useClubColor } from "@/app/hooks/useClubColor";
import { getLeagueLogo } from "@/data/leagueLogos";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";
import { getThemeCopy } from "@/lib/i18n";
import { MatchReportModal } from "@/components/MatchReportModal";
import { HelpHint } from "@/components/HelpHint";
import { LiveCompetitionPanel } from "@/components/LiveCompetitionPanel";
import { BoardWidget } from "@/components/BoardWidget";
import { NewsWidget } from "@/components/NewsWidget";
import { AwardsBlock } from "@/components/AwardsBlock";
import { getFx } from "@/lib/i18nFx";
import { getDash } from "@/lib/i18nDash";
import { isTransferWindowOpenForDate } from "@/lib/transferWindow";
import { DashBackdrop } from "@/components/dashboard/DashBackdrop";
import { ClubHero } from "@/components/dashboard/ClubHero";
import { SeasonStrip } from "@/components/dashboard/SeasonStrip";
import { MatchHero } from "@/components/dashboard/MatchHero";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { icons } from "@/lib/themeFlavor";
import { Stars, SectionTitle } from "@/components/ThemeBits";
import { DrawModal } from "@/components/DrawModal";
import { runTimeline, advanceBackgroundCups, type DrawInfo, type SimContext } from "@/lib/simClient";
import { seasonLabel, formatGameDate } from "@/lib/seasonLabel";
import React from "react";

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
    card: "bg-white/85 border-2 border-pink-100 rounded-[32px] backdrop-blur-xl shadow-[0_8px_40px_rgba(236,72,153,0.12)]",
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
import { getZoneColor } from "@/lib/europeanZones";

function StandingsTable({ standings, userClub, ui, theme, glowColor, leagueName }: {
  standings: any[]; userClub: string; ui: any; theme: string; glowColor: string; leagueName?: string;
}) {
  const router = useRouter();
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
            <th className="pb-3 text-center">GF</th>
            <th className="pb-3 text-center">GA</th>
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
                onClick={() => router.push(`/clubs/${encodeURIComponent(row.club_id)}`)}
                className={`transition-colors cursor-pointer ${ui.tableRow} ${isUser ? ui.highlight : ""}`}>
                <td className={`py-2.5 pl-2 font-black text-xs ${ui.muted}`} style={getZoneColor(i, leagueName || "", standings.length) ? { color: getZoneColor(i, leagueName || "", standings.length)! } : undefined}>{i + 1}</td>
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
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.gf}</td>
                <td className={`py-2.5 text-center ${ui.muted}`}>{row.ga}</td>
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
function getRatingColorDash(r: number): string {
  if (r >= 8.5) return "#22c55e";
  if (r >= 7.0) return "#84cc16";
  if (r >= 6.0) return "#eab308";
  if (r >= 5.0) return "#f97316";
  return "#ef4444";
}

function MatchRow({ fix, userClub, ui, theme, onOpenReport }: { fix: any; userClub: string; ui: any; theme: string; onOpenReport?: (fix: any) => void }) {
  const router = useRouter();
  const isUser = fix.home_club === userClub || fix.away_club === userClub;
  const played = fix.played;
  const clickable = played && onOpenReport;

  let form: "W" | "D" | "L" | null = null;
  if (isUser && played) {
    const isHome = fix.home_club === userClub;
    const gf = isHome ? fix.home_goals : fix.away_goals;
    const ga = isHome ? fix.away_goals : fix.home_goals;
    form = gf > ga ? "W" : gf < ga ? "L" : "D";
  }
  const formColor = form === "W" ? "#22c55e" : form === "L" ? "#ef4444" : "#94a3b8";

  return (
    <div onClick={() => clickable && onOpenReport(fix)}
      className={`flex items-center gap-2 py-2.5 px-3 rounded-xl transition-colors ${ui.tableRow} ${isUser ? ui.highlight : ""} ${clickable ? "cursor-pointer" : ""}`}>
      {form && (
        <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ background: formColor }}>{form}</span>
      )}
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        <span className={`text-sm font-bold truncate max-w-[100px] hover:underline ${ui.text}`}
          onClick={e => { e.stopPropagation(); router.push(`/clubs/${encodeURIComponent(fix.home_club)}`); }}>{fix.home_club}</span>
        <img src={getClubLogo(fix.home_club)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
      </div>
      <div className={`w-16 text-center font-black text-sm shrink-0 ${played ? ui.text : ui.muted}`}>
        {played ? `${fix.home_goals} – ${fix.away_goals}` : "vs"}
      </div>
      <div className="flex items-center gap-1.5 flex-1 justify-start">
        <img src={getClubLogo(fix.away_club)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
        <span className={`text-sm font-bold truncate max-w-[100px] hover:underline ${ui.text}`}
          onClick={e => { e.stopPropagation(); router.push(`/clubs/${encodeURIComponent(fix.away_club)}`); }}>{fix.away_club}</span>
      </div>
      {form && <span className="w-5 shrink-0" />}
    </div>
  );
}

// ─── MATCH REPORT MODAL ───────────────────────────────────────────────────────

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const theme = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);

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
  const seasonNum      = useCareerStore(s => s.seasonNum);
  const setSeasonNum   = useCareerStore(s => s.setSeasonNum);

  const [hydrated, setHydrated]     = useState(false);
  const [standings, setStandings]   = useState<any[]>([]);
  const [fixtures, setFixtures]     = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastResults, setLastResults] = useState<any[]>([]);  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seasonFinished, setSeasonFinished] = useState(false);
  const [seasonTrophies, setSeasonTrophies] = useState<any[]>([]);
  const [allCompetitionResults, setAllCompetitionResults] = useState<any[]>([]);
  const [reportFix, setReportFix] = useState<any>(null);
  const [activeNav, setActiveNav]   = useState("/dashboard");
  const [calendar, setCalendar]     = useState<any[]>([]);
  // Раньше кубковый раунд на дашборде показывал только личный матч клуба —
  // весь остальной раунд (и до игры, и результаты после) был виден только
  // на /cups. Теперь блок "результаты/предстоящие" на дашборде подменяется
  // ЕГО полным раундом целиком (все матчи, не только клуба пользователя) —
  // той же версткой, что и у лиги. Как только раунд сыгран и по календарю
  // наступает очередь другого турнира (хоть снова лиги, хоть другого
  // кубка) — блок сам переключается, ничего вручную закреплять не нужно.
  // Два отдельных состояния (а не одно), чтобы "предстоящий раунд"
  // (грузится наперёд эффектом ниже) не перезаписывал "только что сыгранный"
  // раунд, если следующий по календарю матч — снова кубковый.
  const [upcomingCupRound, setUpcomingCupRound] = useState<{ info: { name: string; round: string }; fixtures: any[] } | null>(null);
  const [justPlayedCupRound, setJustPlayedCupRound] = useState<{ info: { name: string; round: string }; results: any[] } | null>(null);
  const [lastPlayedWasCup, setLastPlayedWasCup] = useState(false);

  const loadUpcomingCupRound = useCallback(async (competitionId: string, name: string) => {
    const res = await fetch(`/api/cup/current-round?competitionId=${competitionId}`);
    if (res.ok) {
      const data = await res.json();
      setUpcomingCupRound({ info: { name, round: data.roundLabel ?? "" }, fixtures: data.fixtures ?? [] });
      return data.roundLabel as string | undefined;
    }
    return undefined;
  }, []);
  const [seasonPlayerStats, setSeasonPlayerStats] = useState<any[]>([]);
  const [clubContracts, setClubContracts] = useState<any[]>([]);
  const [unavailableNames, setUnavailableNames] = useState<Set<string>>(new Set());
  const [simulatingCup, setSimulatingCup] = useState(false);

  // ── Правая панель: таблица лиги или таблица/сетка текущего турнира ──
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [fixturesByComp, setFixturesByComp] = useState<Record<string, any[]>>({});
  const [standingsByComp, setStandingsByComp] = useState<Record<string, any[]>>({});
  const [panelCompId, setPanelCompId] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  // ── Жеребьёвки (очередь окон) ──
  const [drawQueue, setDrawQueue] = useState<DrawInfo[]>([]);
  const drawPausedRef = useRef(false);

  const loadCompetitions = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/competitions?seasonId=${sid}`);
      if (!res.ok) return;
      const data = await res.json();
      setCompetitions(data.competitions ?? []);
      setFixturesByComp(data.fixturesByComp ?? {});
      setStandingsByComp(data.standingsByComp ?? {});
    } catch { /* панель просто останется со старыми данными */ }
  }, []);

  const pushDraw = useCallback((d: DrawInfo) => setDrawQueue(q => [...q, d]), []);

  const availableLineupPlayers = useMemo(() =>
    Object.values(lineup || {}).filter((p: any) => p && !unavailableNames.has(p.id ?? p.name)),
    [lineup, unavailableNames]
  );
  const lineupValid    = availableLineupPlayers.length >= MIN_LINEUP_SIZE;
  const unavailableInLineup = useMemo(() =>
    Object.values(lineup || {}).filter((p: any) => p && unavailableNames.has(p.id ?? p.name)).map((p: any) => p.name),
    [lineup, unavailableNames]
  );
  const lineupCount    = availableLineupPlayers.length;

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !selectedClub) router.push("/leagues");
  }, [hydrated, selectedClub, router]);

  const leagueTheme = getLeagueTheme(selectedLeague?.name || selectedClub?.league || "Premier League", theme);
  const clubColor = useClubColor(
    selectedClub?.name,
    selectedLeague?.name || selectedClub?.league,
    selectedClub?.name ? getClubLogo(selectedClub.name) : null,
    theme
  );
  const glowColor   = clubColor || leagueTheme?.rawColor || "#ffffff";
  const lineupConfirmed = useCareerStore(s => s.lineupConfirmed);
  const tacticConfirmed = useCareerStore(s => s.tacticConfirmed);
  const readyForSeasonSim = lineupConfirmed && tacticConfirmed;
  const userClub    = selectedClub?.name || "";

  useEffect(() => {
    if (!seasonId || !userClub) return;
    fetch(`/api/season-stats?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSeasonPlayerStats(data.stats ?? []); }).catch(() => {});

    fetch(`/api/contracts?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClubContracts(data.contracts ?? []); }).catch(() => {});
  }, [seasonId, userClub]);

  useEffect(() => {
    if (!seasonFinished || !seasonId) return;
    // Экран итогов строится из competitions/fixturesByComp/standingsByComp —
    // перезагружаем их, чтобы там были финальные результаты ВСЕХ турниров.
    loadCompetitions(seasonId);
    fetch(`/api/competitions?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const finished = (data.competitions ?? []).filter((c: any) => c.status === "finished" && c.winner_club);
        setSeasonTrophies(finished.filter((c: any) => c.winner_club === userClub));
        setAllCompetitionResults(finished);
      }).catch(() => {});
  }, [seasonFinished, seasonId, userClub, loadCompetitions]);

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
    loadCompetitions(seasonId);
    fetch(`/api/season?id=${seasonId}`).then(r => r.ok ? r.json() : null).then(s => {
      if (s?.status === "finished") setSeasonFinished(true);
      if (s?.season_num) setSeasonNum(s.season_num);
    }).catch(() => {});
  }, [seasonId, loadData, loadCompetitions, setSeasonNum]);

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
      setUnavailableNames(new Set((sd.statuses ?? []).map((s: any) => s.player_id || s.player_name)));
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

  // Как только очередь доходит до кубкового матча (см. cupReady ниже, та же
  // логика по дате) — подгружаем ВЕСЬ раунд этого турнира целиком, не
  // только матч пользователя.
  useEffect(() => {
    if (!nextMatch || nextMatch.source !== "cup" || !nextMatch.competition_id) return;
    const careerDate = getLeagueMatchdayDate(matchday);
    const due = !nextMatch.match_date || nextMatch.match_date <= careerDate;
    if (!due) return;
    loadUpcomingCupRound(nextMatch.competition_id, nextMatch.competition_name);
  }, [nextMatch, matchday, loadUpcomingCupRound]);

  const simCtx = (): SimContext => ({
    seasonId: seasonId!, userClubId: userClub, tactic, customTactic,
    lineup: Object.values(lineup || {}).filter(Boolean),
  });

  // Симуляция кубкового раунда
  const advanceCupRound = async () => {
    if (!nextMatch?.competition_id || simulatingCup || !lineupValid) return;
    setSimulatingCup(true);
    setApiError(null);
    try {
      const res = await fetch("/api/cup/advance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: nextMatch.competition_id, userClubId: userClub, userTactic: tactic, userLineup: Object.values(lineup || {}).filter(Boolean) }),
      });
      if (res.ok) {
        const data = await res.json();
        // Ответ /api/cup/advance уже содержит результаты ВСЕГО раунда (не
        // только матча пользователя) — используем их напрямую.
        setJustPlayedCupRound({
          info: { name: nextMatch.competition_name, round: upcomingCupRound?.info.round ?? "" },
          results: data.results ?? [],
        });
        setLastPlayedWasCup(true);
        setShowResults(true);
        setUpcomingCupRound(null);
        setPanelCompId(nextMatch.competition_id);
        if (data.draw) pushDraw(data.draw);
        // Остальные турниры с той же датой (где клуб пользователя не играет) —
        // доигрываются сами, иначе они бы так и висели неигранными.
        const more = await advanceBackgroundCups(simCtx(), nextMatch.match_date ?? getLeagueMatchdayDate(matchday));
        more.forEach(pushDraw);
        await loadCalendar(seasonId!, userClub);
        await loadCompetitions(seasonId!);
      } else {
        const data = await res.json().catch(() => ({}));
        setApiError(`${nextMatch.competition_name}: ${data.error ?? `HTTP ${res.status}`}`);
        console.error("Cup advance failed:", res.status, data);
      }
    } catch (e: any) {
      setApiError(`${nextMatch.competition_name}: ${e?.message ?? "network error"}`);
      console.error(e);
    }
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
        setLastPlayedWasCup(false);
        setMatchday(data.nextMatchday);
        setShowResults(true);
        setPanelCompId(null);
        // Кубки, где клуб пользователя сейчас не играет, идут сами по датам
        const bg = await advanceBackgroundCups(simCtx(), data.finished ? "9999-12-31" : getLeagueMatchdayDate(data.nextMatchday), { ignoreDate: !!data.finished });
        bg.forEach(pushDraw);
        await loadData(seasonId);
        await loadCalendar(seasonId, userClub);
        await loadCompetitions(seasonId);
        if (data.finished) setSeasonFinished(true);
      } else {
        setApiError(data.error || "Could not simulate matchday.");
      }
    } catch (e) { console.error(e); setApiError("Network error — try again."); }
    setSimulating(false);
  };

  // Промотка сезона целиком — тур за туром, каждый матч (включая матчи
  // пользователя) играет ИИ по рейтингу состава, без ручного состава/тактики.
  // Гоняем циклом с клиента, а не одним огромным запросом на сервере —
  // так не упираемся в таймаут serverless-функции на Vercel, и заодно видно
  // прогресс по ходу дела.
  const [simulatingSeason, setSimulatingSeason] = useState(false);
  const [seasonSimProgress, setSeasonSimProgress] = useState<{ done: number; matchday: number } | null>(null);
  const [simPaused, setSimPaused] = useState(false);
  const simPausedRef = useRef(false);
  const simStopRef = useRef(false);

  const simSleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Промотка сезона целиком — единая хронология лиги и кубков (см.
  // lib/simClient.ts): берём ближайшее событие по датам (тур лиги или раунд
  // любого кубка) и играем его, до самого конца. Гоняем циклом с клиента, а
  // не одним запросом — так не упираемся в таймаут serverless-функции и
  // видно прогресс. После КАЖДОГО события таблица обновляется "вживую", а
  // правая панель переключается на играемый турнир.
  const simulateWholeSeason = async () => {
    if (!seasonId || simulating || simulatingSeason) return;
    setSimulatingSeason(true);
    setApiError(null);
    setLiveMode(true);
    setSeasonSimProgress({ done: 0, matchday });
    simPausedRef.current = false;
    simStopRef.current = false;
    drawPausedRef.current = false;
    setSimPaused(false);
    let done = 0;
    try {
      const result = await runTimeline(simCtx(), matchday, "end", {
        shouldStop: () => simStopRef.current,
        waitIfPaused: async () => { while (simPausedRef.current && !simStopRef.current) await simSleep(200); },
        stepDelayMs: 320,
        onError: (m) => setApiError(m),
        onDraw: (d) => {
          pushDraw(d);
          // Жеребьёвка с участием клуба пользователя — ставим на паузу, чтобы успеть посмотреть
          const involved = d.byes.includes(userClub) || d.pairs.some(pr => pr.home === userClub || pr.away === userClub);
          if (involved) { drawPausedRef.current = true; simPausedRef.current = true; setSimPaused(true); }
        },
        onEvent: async (e) => {
          done++;
          setSeasonSimProgress({ done, matchday: e.matchday });
          if (e.kind === "league") { setMatchday(e.matchday); setPanelCompId(null); }
          else if (e.competitionId) setPanelCompId(e.competitionId);
          await Promise.all([loadData(seasonId), loadCompetitions(seasonId)]);
        },
      });
      if (result.leagueFinished) setSeasonFinished(true);
      await loadData(seasonId);
      await loadCompetitions(seasonId);
      await loadCalendar(seasonId, userClub);
    } catch (e) { console.error(e); setApiError("Network error during season simulation."); }
    setSimulatingSeason(false);
    setLiveMode(false);
    setSeasonSimProgress(null);
    simPausedRef.current = false;
    simStopRef.current = false;
    setSimPaused(false);
  };

  const toggleSimPause = () => {
    simPausedRef.current = !simPausedRef.current;
    setSimPaused(simPausedRef.current);
  };
  const stopSim = () => {
    simStopRef.current = true;
    simPausedRef.current = false;
    setSimPaused(false);
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

  // Раньше форма считалась только по лиговым fixtures — если последний
  // сыгранный матч клуба был кубковым (ЛЧ, Кубок страны и т.д.), он просто
  // пропускался: полоска формы "перескакивала" на устаревший лиговый матч
  // или вовсе оставалась пустой. Теперь берём единый календарь (лига +
  // кубки, см. /api/calendar), отсортированный по реальной дате.
  const recentForm = useMemo(() => {
    return calendar
      .filter((m: any) => m.played && (m.home_club === userClub || m.away_club === userClub))
      .sort((a: any, b: any) => (a.match_date ?? "").localeCompare(b.match_date ?? ""))
      .slice(-5)
      .map((m: any) => {
        const isHome = m.home_club === userClub;
        const gf = isHome ? m.home_goals : m.away_goals;
        const ga = isHome ? m.away_goals : m.home_goals;
        return gf > ga ? "W" : gf < ga ? "L" : "D";
      });
  }, [calendar, userClub]);

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
        if (data.seasonNum) useCareerStore.getState().setSeasonNum(data.seasonNum);
        useCareerStore.getState().setMatchday(1);
        setSeasonFinished(false);
        setStandings([]); setFixtures([]); setCalendar([]); setLastResults([]); setShowResults(false);
        setCompetitions([]); setFixturesByComp({}); setStandingsByComp({}); setPanelCompId(null); setSeasonTrophies([]); setAllCompetitionResults([]);
      }
    } catch (e) { console.error(e); }
    setStartingNewSeason(false);
  };

  if (!hydrated || !selectedClub) return null;

  if (seasonFinished) {
    const sortedStandings = [...standings].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));

    // ── Итоги сезона для клуба пользователя ──
    const withRating = seasonPlayerStats.filter((p: any) => p.matches_played >= 5);
    const bestPlayer = [...withRating].sort((a: any, b: any) => (b.total_rating / b.matches_played) - (a.total_rating / a.matches_played))[0];
    const bestScorer = [...seasonPlayerStats].sort((a: any, b: any) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0))[0];
    // Лучший матч — не просто крупная победа: считаем "зрелищность" —
    // много голов, мало разрыва (4:3 интереснее 5:0), победа и важная
    // стадия турнира (полуфинал/финал) добавляют очки.
    const playedUserMatches = calendar.filter((m: any) => m.played && (m.home_club === userClub || m.away_club === userClub));
    const matchScore = (m: any) => {
      const hg = m.home_goals ?? 0, ag = m.away_goals ?? 0;
      const isHome = m.home_club === userClub;
      const won = (isHome ? hg > ag : ag > hg);
      const stageBonus = /final|semi/i.test(m.round_name ?? "") ? 1.5 : /quarter/i.test(m.round_name ?? "") ? 0.7 : 0;
      return (hg + ag) - Math.abs(hg - ag) * 0.4 + (won ? 0.8 : 0) + stageBonus;
    };
    const bestMatch = [...playedUserMatches].sort((a: any, b: any) => matchScore(b) - matchScore(a))[0];
    // ── Итоги по КАЖДОМУ турниру, где играл клуб пользователя ──
    const ru = locale === "ru";
    const STAGE_RU: Record<string, string> = {
      "Playoff Round": "стыковых матчах", "Round of 16": "1/8 финала", "Quarter-final": "1/4 финала", "Quarter-finals": "1/4 финала",
      "Semi-final": "1/2 финала", "Semi-finals": "1/2 финала", "Round of 32": "1/16 финала", "Round of 64": "1/32 финала",
    };
    const stageText = (name: string) => ru ? (STAGE_RU[name] ?? name) : name;
    const tournaments = competitions
      .map((c: any) => {
        const fx: any[] = fixturesByComp[c.id] ?? [];
        const mine = fx.filter(f => f.home_club === userClub || f.away_club === userClub);
        if (mine.length === 0) return null;
        const phaseRounds = c.league_phase_rounds ?? 0;
        const isNewEuro = c.type === "continental" && phaseRounds > 0;
        const won = c.winner_club === userClub;
        const last = [...mine].sort((a, b) => b.round - a.round)[0];
        let result = "";
        let tone: "gold" | "good" | "neutral" | "bad" = "neutral";
        if (won) { result = ru ? "★ Победа в турнире" : "★ Champions"; tone = "gold"; }
        else if (!c.winner_club) { result = ru ? "Турнир не завершён" : "Not finished"; }
        else if (isNewEuro && last.round <= phaseRounds) {
          const pos = (standingsByComp[c.id] ?? []).findIndex((r: any) => r.club === userClub) + 1;
          result = ru ? `Вылет в лига-фазе${pos ? ` (${pos}-е место)` : ""}` : `Out in league phase${pos ? ` (#${pos})` : ""}`;
          tone = "bad";
        } else if (/^final$/i.test(last.round_name ?? "") && last.played) { result = ru ? "🥈 Финалист" : "🥈 Runners-up"; tone = "good"; }
        else {
          const name = last.round_name ?? "";
          result = ru ? `Вылет в ${stageText(name) || "кубке"}` : `Out in ${name || "the cup"}`;
          tone = "bad";
        }
        const played = mine.filter(f => f.played && !f.is_bye);
        const w = played.filter(f => (f.home_club === userClub ? (f.home_goals ?? 0) > (f.away_goals ?? 0) : (f.away_goals ?? 0) > (f.home_goals ?? 0))).length;
        const gf = played.reduce((n, f) => n + (f.home_club === userClub ? (f.home_goals ?? 0) : (f.away_goals ?? 0)), 0);
        const ga = played.reduce((n, f) => n + (f.home_club === userClub ? (f.away_goals ?? 0) : (f.home_goals ?? 0)), 0);
        return { id: c.id, name: c.name, type: c.type, winner: c.winner_club as string | null, result, tone, played: played.length, wins: w, gf, ga };
      })
      .filter(Boolean) as any[];
    const leagueRow = {
      id: "league", name: selectedLeague?.name || selectedClub?.league || (ru ? "Лига" : "League"), type: "league",
      winner: sortedStandings[0]?.club_id as string | null,
      result: userPos === 1 ? (ru ? "★ Чемпионы лиги" : "★ League champions") : (ru ? `${userPos}-е место из ${sortedStandings.length}` : `Finished #${userPos} of ${sortedStandings.length}`),
      tone: (userPos === 1 ? "gold" : Number(userPos) <= 4 ? "good" : "neutral") as "gold" | "good" | "neutral" | "bad",
      played: sortedStandings.find(r => r.club_id === userClub)?.played ?? 0,
      wins: sortedStandings.find(r => r.club_id === userClub)?.won ?? 0,
      gf: sortedStandings.find(r => r.club_id === userClub)?.gf ?? 0,
      ga: sortedStandings.find(r => r.club_id === userClub)?.ga ?? 0,
    };
    const allTournaments = [leagueRow, ...tournaments];
    const fxs = getFx(locale, theme);
    const ics = icons(theme);
    const isMal = theme === "maleficent", isAur = theme === "aurora";
    const goldC = isMal ? "#e879f9" : isAur ? "#f59e0b" : "#eab308";
    const toneColor = (t: string) => t === "gold" ? goldC : t === "good" ? "#22c55e" : t === "bad" ? "#f87171" : undefined;
    const tIcon = (t: string) => t === "league" ? ics.league : t === "domestic_cup" ? ics.cup : t === "super_cup" ? ics.super : ics.continental;
    const ratingStarsDash = (r: number) => Math.max(0, Math.min(5, (r - 5) * 1.25));
    const statTile = (icon: string, label: string, name: string, value: string, color?: string, stars?: number) => (
      <div className={`flex items-center gap-3 p-3 ${isMal ? "" : "rounded-2xl"} text-left min-w-0 ${ui.cardAlt}`}>
        <span className="text-2xl shrink-0" style={isMal ? { color: "#e879f9", textShadow: "0 0 10px #e879f988" } : undefined}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className={`text-[9px] uppercase tracking-widest ${ui.muted}`}>{label}</div>
          <div className={`text-sm font-black truncate ${ui.text}`}>{name}</div>
        </div>
        <div className="text-right shrink-0">
          {stars != null && <Stars value={stars} theme={theme} size={10} />}
          <div className="text-lg font-display font-black leading-tight" style={color ? { color } : undefined}>{value}</div>
        </div>
      </div>
    );
    return (
      <DashboardLayout>
        <main className={`min-h-screen relative overflow-hidden flex items-center justify-center p-6 ${theme === "aurora" ? "bg-[#fef6ff]" : "bg-[#03040a]"}`}>
          <div className={`w-full max-w-2xl p-6 sm:p-8 rounded-3xl text-center ${ui.card} animate-fade-in-up`}>
            <div className="text-5xl mb-3 animate-floaty-sm inline-block" style={isMal ? { color: "#e879f9", textShadow: "0 0 24px #e879f988" } : undefined}>{isMal ? "◈" : isAur ? "👑" : "🏁"}</div>
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.subLabel}`}>{fxs.seasonDone(seasonLabel(seasonNum))}</div>
            <h1 className={`text-2xl font-display font-black mb-1 ${ui.text}`}>{selectedClub.name}</h1>
            <div className={`text-sm mb-5 ${ui.muted}`}>{fxs.finalPos(Number(userPos) || 0, sortedStandings.length)}{userPos === 1 && <Stars value={5} theme={theme} size={14} className="ml-2 align-middle" />}</div>

            {seasonId && (
              <div className="mb-5">
                <BoardWidget seasonId={seasonId} clubId={userClub} theme={theme} locale={locale as "en" | "ru"} />
              </div>
            )}
            {seasonId && <AwardsBlock seasonId={seasonId} userClub={userClub} theme={theme} locale={locale as "en" | "ru"} />}

            {/* Итоги клуба: лучший игрок, бомбардир, лучший матч */}
            {(bestPlayer || bestScorer?.goals > 0 || bestMatch) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                {bestPlayer && statTile(ics.awards, fxs.clubPlayer, bestPlayer.player_name, (bestPlayer.total_rating / bestPlayer.matches_played).toFixed(2), getRatingColorDash(bestPlayer.total_rating / bestPlayer.matches_played), ratingStarsDash(bestPlayer.total_rating / bestPlayer.matches_played))}
                {bestScorer && bestScorer.goals > 0 && statTile(ics.scorer, fxs.clubScorer, bestScorer.player_name, `${bestScorer.goals} ${locale === "ru" ? "гол." : "G"}`)}
                {bestMatch && (
                  <div className="sm:col-span-2">
                    <div className={`text-[10px] uppercase tracking-widest mb-1.5 text-left ${ui.muted}`}><span style={isMal ? { color: "#e879f9" } : undefined}>{ics.match}</span> {fxs.matchOfSeason} · {bestMatch.competition_name === "League" ? fxs.panelLeague : bestMatch.competition_name}</div>
                    <div className={`${isMal ? "" : "rounded-2xl"} p-1 ${ui.cardAlt}`}>
                      <MatchRow fix={bestMatch} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Все турниры сезона, где играл клуб: результат клуба + победитель */}
            <div className={`text-left rounded-2xl p-4 mb-6 ${ui.card}`}>
              <SectionTitle theme={theme} icon={ics.tournament}>{ru ? "Турниры сезона" : "Season competitions"}</SectionTitle>
              <div className="space-y-2.5">
                {allTournaments.map((t: any) => (
                  <div key={t.id} className={`${isMal ? "" : "rounded-xl"} p-3 ${ui.cardAlt}`} style={t.tone === "gold" ? { borderLeft: `3px solid ${goldC}`, boxShadow: theme !== "classic" ? `0 0 18px ${goldC}22` : undefined } : undefined}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0" style={isMal ? { color: "#e879f9" } : undefined}>{tIcon(t.type)}</span>
                      <span className={`text-sm font-black truncate min-w-0 flex-1 ${ui.text}`}>{t.name}</span>
                      <span className="text-[11px] font-black text-right shrink-0 max-w-[55%] flex items-center gap-1.5 justify-end" style={{ color: toneColor(t.tone) }}>{t.tone === "gold" && <Stars value={1} max={1} theme={theme} size={12} />}{t.result}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                      <div className={`text-[11px] flex items-center gap-1.5 min-w-0 ${ui.muted}`}>
                        {ru ? "Победитель:" : "Winner:"}
                        {t.winner ? (
                          <span className={`font-bold flex items-center gap-1.5 min-w-0 ${t.winner === userClub ? (isMal ? "text-fuchsia-400" : isAur ? "text-violet-600" : "text-emerald-400") : ui.text}`}>
                            <img src={getClubLogo(t.winner)} className="w-4 h-4 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                            <span className="truncate">{t.winner}</span>
                          </span>
                        ) : <span>—</span>}
                      </div>
                      {t.played > 0 && (
                        <div className={`text-[11px] shrink-0 ${ui.muted}`}>
                          {ru ? `${t.played} матч. · ${t.wins} поб. · мячи ${t.gf}:${t.ga}` : `${t.played} played · ${t.wins} W · GF/GA ${t.gf}:${t.ga}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleStartNewSeason} disabled={startingNewSeason}
              className={`w-full py-4 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-transform hover:scale-[1.02] ${ui.btnPrimary}`}>
              <Zap size={16} />
              {startingNewSeason ? fxs.startingNew : fxs.startNew}
            </button>
          </div>
          {reportFix && (
            <MatchReportModal fix={reportFix} ui={ui} theme={theme} copy={copy} locale={locale} onClose={() => setReportFix(null)} />
          )}
          {drawQueue.length > 0 && (
            <DrawModal draw={drawQueue[0]} theme={theme as any} locale={locale as "en" | "ru"} userClub={userClub}
              remaining={drawQueue.length - 1} onClose={() => setDrawQueue(q => q.slice(1))} />
          )}
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

      <DashBackdrop theme={theme} glowColor={glowColor} />

      {/* Main */}
      <div className={`relative z-10 p-6 md:p-8 pt-16 lg:pt-8 ${ui.text}`}>
        {/* Ошибка последнего действия (тур лиги / раунд кубка) — раньше при
            сбое на сервере не показывалось вообще ничего, кнопка просто
            переставала крутиться и всё оставалось как было. Теперь видно
            точный текст ошибки — по нему можно диагностировать, что
            конкретно пошло не так. */}
        {apiError && (
          <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold flex items-center justify-between gap-3 animate-fade-in-up">
            <span>⚠️ {apiError}</span>
            <button onClick={() => setApiError(null)} className="shrink-0 opacity-60 hover:opacity-100 transition">✕</button>
          </div>
        )}

        {/* Шапка: герб, кольцо прогресса сезона, анимированные цифры, форма */}
        {(() => {
          const leagueTotal = standings.length || (selectedLeague?.clubs?.length ?? 20);
          const dd = getDash(locale, theme);
          const zc = typeof userPos === "number" ? getZoneColor(userPos - 1, selectedLeague?.name || selectedClub?.league || "", leagueTotal) : null;
          const zoneLabel = zc === "#22c55e" ? dd.zoneCL : zc === "#3b82f6" ? dd.zoneEL : zc === "#ef4444" ? dd.zoneRel : dd.zoneMid;
          const totalMd = Math.max(1, ((selectedLeague?.clubs?.length ?? 20) - 1) * 2);
          return (
            <>
              <ClubHero theme={theme} locale={locale as "en" | "ru"} glowColor={glowColor}
                clubName={selectedClub?.name ?? ""} leagueName={selectedLeague?.name || selectedClub?.league || ""} seasonText={seasonLabel(seasonNum)}
                position={typeof userPos === "number" ? userPos : null} totalClubs={leagueTotal} zoneColor={zc} zoneLabel={zoneLabel}
                points={userRow?.points ?? 0} goalDiff={(userRow?.gf ?? 0) - (userRow?.ga ?? 0)} budget={userRow?.budget ?? null}
                matchday={matchday} totalMatchdays={totalMd} form={recentForm} />
              <QuickActions theme={theme} locale={locale as "en" | "ru"} lineupOk={lineupValid} lineupConfirmed={lineupConfirmed} tacticConfirmed={tacticConfirmed}
                tacticName={tactic || "—"} windowOpen={isTransferWindowOpenForDate(getLeagueMatchdayDate(matchday))}
                expiring={clubContracts.filter((c: any) => c.years_left <= 1).length} />
              <SeasonStrip theme={theme} locale={locale as "en" | "ru"} calendar={calendar} userClub={userClub} onOpen={setReportFix} />
            </>
          );
        })()}

        {/* Предупреждение о скором конце сезона, если есть непродлённые
            контракты в последнем году — раньше игроки просто пропадали в
            свободные агенты без единого предупреждения. */}
        {(() => {
          const totalMatchdays = Math.max(1, ((selectedLeague?.clubs?.length ?? 20) - 1) * 2);
          const nearSeasonEnd = matchday >= totalMatchdays - 5;
          const expiring = clubContracts.filter((c: any) => c.years_left <= 1);
          if (!nearSeasonEnd || !expiring.length) return null;
          return (
            <div className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap animate-fade-in-up" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚠️</span>
                <div>
                  <div className="text-xs font-black" style={{ color: "#f59e0b" }}>
                    {locale === "ru" ? `Сезон скоро закончится — ${expiring.length} контракт(ов) истекает` : `Season ending soon — ${expiring.length} contract(s) expiring`}
                  </div>
                  <div className={`text-[11px] ${ui.muted}`}>
                    {locale === "ru" ? "Непродлённые игроки уйдут бесплатно в свободные агенты" : "Unrenewed players leave for free as free agents"}: {expiring.map((c: any) => c.player_name).join(", ")}
                  </div>
                </div>
              </div>
              <Link href="/squad" className="px-3 py-2 rounded-xl text-xs font-black shrink-0" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                {locale === "ru" ? "К составу →" : "Go to Squad →"}
              </Link>
            </div>
          );
        })()}

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
                  <div className="space-y-4">
                    <MatchHero theme={theme} locale={locale as "en" | "ru"} glowColor={glowColor} userClub={userClub}
                      home={nextMatch.home_club} away={nextMatch.away_club}
                      competition={nextMatch.competition_name} competitionType={(nextMatch.competition_type as any) ?? "domestic_cup"} round={nextMatch.round_name}
                      dateLabel={formatGameDate(nextMatch.match_date ?? careerDate, seasonNum, locale as "en" | "ru")}
                      playLabel={copy.dashPlayMatch} playingLabel={copy.dashSimulating} playing={simulatingCup}
                      playDisabled={simulatingCup || !lineupValid} onPlay={advanceCupRound} />
                    {!lineupValid && (
                      <div className="mt-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                        ⚠️ {locale === "ru"
                          ? `Нужно ${MIN_LINEUP_SIZE} доступных игроков для матча (доступно ${lineupCount}/${MIN_LINEUP_SIZE}).`
                          : `You need ${MIN_LINEUP_SIZE} available players to play (${lineupCount}/${MIN_LINEUP_SIZE} available).`}
                    {unavailableInLineup.length > 0 && <> {locale === "ru" ? "Недоступны" : "Unavailable"}: <b>{unavailableInLineup.join(", ")}</b>.</>}
                    {" "}<Link href="/squad" className="underline">{locale === "ru" ? "Настроить состав →" : "Set up your Squad →"}</Link>
                      </div>
                    )}
                  </div>
                );
              }

              if (!seasonId) {
                return (
                  <div className={`p-6 ${ui.card} animate-fade-in-up text-center`}>
                    <p className={`${ui.muted} mb-4 text-sm`}>{copy.dashNoSeason}</p>
                    <Link href="/leagues"><button className={`px-6 py-3 ${ui.btnPrimary}`}>{copy.dashStartCareer}</button></Link>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {(() => {
                    const myMatch = currentFixtures.find(f => f.home_club === userClub || f.away_club === userClub);
                    const date = getLeagueMatchdayDate(matchday);
                    const seasonBtn = {
                      label: simulatingSeason ? `${copy.dashSimulating} (${seasonSimProgress?.done ?? 0})` : (locale === "ru" ? "Весь сезон" : "Sim Season"),
                      disabled: simulating || simulatingSeason || seasonFinished || !readyForSeasonSim,
                      onClick: simulateWholeSeason,
                      title: !readyForSeasonSim
                        ? (locale === "ru" ? "Сначала подтверди состав (/squad) и тактику (/tactics)" : "Confirm your lineup (/squad) and tactic (/tactics) first")
                        : (locale === "ru" ? "ИИ доигрывает все оставшиеся матчи сезона, включая твои" : "AI plays every remaining match this season, including yours"),
                    };
                    const playDisabled = simulating || simulatingSeason || currentFixtures.every(f => f.played) || !lineupValid;
                    const help = (
                      <HelpHint id="dash-simulate" theme={theme as any}
                        title={locale === "ru" ? "Симуляция" : "Simulation"}
                        text={locale === "ru"
                          ? "«Симулировать тур» играет матч твоего клуба по выбранной тактике/составу. «Весь сезон» доигрывает ИИ все оставшиеся туры сразу, включая твои — используй, чтобы перемотать до конца сезона."
                          : "\"Simulate\" plays your club's match with your chosen tactic/lineup. \"Sim Season\" has the AI play out every remaining round at once, including yours — use it to fast-forward to season's end."} />
                    );
                    return myMatch ? (
                      <MatchHero theme={theme} locale={locale as "en" | "ru"} glowColor={glowColor} userClub={userClub}
                        home={myMatch.home_club} away={myMatch.away_club}
                        competition={selectedLeague?.name || selectedClub?.league || "League"} competitionType="league"
                        round={`${locale === "ru" ? "Тур" : "Matchday"} ${matchday}`}
                        dateLabel={formatGameDate(date, seasonNum, locale as "en" | "ru")}
                        playLabel={copy.dashSimulate} playingLabel={copy.dashSimulating} playing={simulating}
                        playDisabled={playDisabled} onPlay={advanceMatchday} seasonBtn={seasonBtn} help={help} />
                    ) : (
                      <div className={`p-6 ${ui.card} flex items-center justify-between gap-4 flex-wrap`}>
                        <div className={`text-lg font-black ${ui.text}`}>{currentFixtures.length} {copy.dashMatchesToPlay}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={advanceMatchday} disabled={playDisabled} className={`px-6 py-3 font-black text-sm flex items-center gap-2 disabled:opacity-40 ${ui.btnPrimary}`}>
                            <Zap size={16} />{simulating ? copy.dashSimulating : copy.dashSimulate}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                  {!readyForSeasonSim && !simulatingSeason && !seasonFinished && (
                    <div className="mb-3 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 flex-wrap"
                      style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>
                      ⚠️ {locale === "ru"
                        ? "Автопрокрутка всего сезона недоступна, пока не подтверждены:"
                        : "Whole-season autoplay is locked until you confirm:"}
                      {!lineupConfirmed && <Link href="/squad" className="underline">{locale === "ru" ? "состав" : "lineup"}</Link>}
                      {!lineupConfirmed && !tacticConfirmed && <span>·</span>}
                      {!tacticConfirmed && <Link href="/tactics" className="underline">{locale === "ru" ? "тактику" : "tactic"}</Link>}
                    </div>
                  )}
                  {simulatingSeason && (
                    <div className="mb-3 p-4 rounded-2xl animate-fade-in-up" style={{ background: `${glowColor}12`, border: `1px solid ${glowColor}30` }}>
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${simPaused ? "" : "animate-soft-pulse"}`} style={{ background: simPaused ? "#f59e0b" : glowColor }} />
                          <div className="min-w-0">
                            <div className="text-xs font-black" style={{ color: glowColor }}>
                              {simPaused
                                ? (locale === "ru" ? "На паузе" : "Paused")
                                : (locale === "ru" ? "Автосимуляция" : "Auto-simulating")}
                            </div>
                            <div className={`text-[11px] font-bold ${ui.muted}`}>
                              {locale === "ru" ? "Тур" : "Matchday"} {seasonSimProgress?.matchday ?? matchday}
                              {" · "}{new Date(getLeagueMatchdayDate(seasonSimProgress?.matchday ?? matchday) + "T00:00:00").toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={toggleSimPause}
                            className="px-3 py-2 rounded-xl text-xs font-black transition-transform hover:scale-105"
                            style={{ background: `${glowColor}20`, color: glowColor }}>
                            {simPaused ? "▶" : "⏸"}
                          </button>
                          <button onClick={stopSim}
                            className="px-3 py-2 rounded-xl text-xs font-black transition-transform hover:scale-105"
                            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                            ⏹ {locale === "ru" ? "Стоп" : "Stop"}
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${glowColor}18` }}>
                        <div className="h-1.5 rounded-full animate-shimmer" style={{
                          width: `${Math.min(100, Math.round(((seasonSimProgress?.matchday ?? matchday) / Math.max(1, ((selectedLeague?.clubs?.length ?? 20) - 1) * 2)) * 100))}%`,
                          background: `linear-gradient(90deg, ${glowColor}, ${glowColor}cc, ${glowColor})`,
                        }} />
                      </div>
                    </div>
                  )}
                  {!lineupValid && (
                    <div className="mb-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                      ⚠️ {locale === "ru"
                        ? `Нужно ${MIN_LINEUP_SIZE} доступных игроков для матча (доступно ${lineupCount}/${MIN_LINEUP_SIZE}).`
                        : `You need ${MIN_LINEUP_SIZE} available players to play (${lineupCount}/${MIN_LINEUP_SIZE} available).`}
                    {unavailableInLineup.length > 0 && <> {locale === "ru" ? "Недоступны" : "Unavailable"}: <b>{unavailableInLineup.join(", ")}</b>.</>}
                    {" "}<Link href="/squad" className="underline">{locale === "ru" ? "Настроить состав →" : "Set up your Squad →"}</Link>
                    </div>
                  )}
                {/* Choose lineup for this matchday */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t" style={{ borderColor: theme === "classic" ? "rgba(255,255,255,0.05)" : theme === "aurora" ? "#fce7f3" : "rgba(139,92,246,0.15)" }}>
                  <span className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>{copy.dashLineupLabel}</span>
                  {Object.keys(lineupsByFormation || {}).map(f => (
                    <button key={f} onClick={() => {
                        setFormation(f);
                        useCareerStore.getState().setLineup(lineupsByFormation[f]);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={{ background: formation === f ? `${glowColor}30` : "rgba(255,255,255,0.05)", color: formation === f ? glowColor : undefined }}>
                      {f}
                    </button>
                  ))}
                  {Object.keys(customFormationsStore || {}).map(f => (
                    <button key={f} onClick={() => {
                        setFormation(f);
                        useCareerStore.getState().setLineup(customFormationsStore[f].lineup);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={{ background: formation === f ? `${glowColor}30` : "rgba(255,255,255,0.05)", color: formation === f ? glowColor : undefined }}>
                      📐 {f}
                    </button>
                  ))}
                  <Link href="/squad" className="text-[10px] underline opacity-50 hover:opacity-100">{copy.dashManageSquad}</Link>
                </div>
              </div>
              </div>
              );
            })()}

            {/* Last results + upcoming — раньше шли друг под другом на всю
                ширину даже на широких экранах; места хватает на 2 колонки.
                Если сейчас идёт другой турнир (не лига) — показываем ЕГО
                полный раунд вместо тура лиги, той же версткой. */}
            {(showResults && (lastPlayedWasCup ? (justPlayedCupRound?.results.length ?? 0) > 0 : lastResults.length > 0)) ||
             (upcomingCupRound?.fixtures.length ?? currentFixtures.length) > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {showResults && lastPlayedWasCup && justPlayedCupRound && justPlayedCupRound.results.length > 0 && (
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                    <div className={`${ui.subLabel} mb-3`}>{justPlayedCupRound.info.name} — {justPlayedCupRound.info.round}</div>
                    <div className="space-y-1">
                      {justPlayedCupRound.results.map((r, i) => (
                        <MatchRow key={i} fix={{ ...r, home_club: r.home, away_club: r.away, played: true, home_goals: r.homeGoals, away_goals: r.awayGoals, events: r.events, penalties: r.penalties }} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                      ))}
                    </div>
                  </div>
                )}
                {showResults && !lastPlayedWasCup && lastResults.length > 0 && (
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                    <div className={`${ui.subLabel} mb-3`}>{locale === "ru" ? `Тур ${matchday - 1} — ${copy.dashMatchdayResults}` : `Matchday ${matchday - 1} ${copy.dashMatchdayResults}`}</div>
                    <div className="space-y-1">
                      {lastResults.map((r, i) => (
                        <MatchRow key={i} fix={{ ...r, home_club: r.home, away_club: r.away, played: true, home_goals: r.homeGoals, away_goals: r.awayGoals, events: r.events }} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                      ))}
                    </div>
                  </div>
                )}

                {upcomingCupRound && upcomingCupRound.fixtures.length > 0 ? (
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                    <div className={`${ui.subLabel} mb-3`}>{upcomingCupRound.info.name} — {upcomingCupRound.info.round}</div>
                    <div className="space-y-1">
                      {upcomingCupRound.fixtures.map((f, i) => (
                        <MatchRow key={i} fix={f} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                      ))}
                    </div>
                  </div>
                ) : currentFixtures.length > 0 && (
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                    <div className={`${ui.subLabel} mb-3`}>{locale === "ru" ? `Тур ${matchday} — ${copy.dashUpcoming}` : `Matchday ${matchday} — ${copy.dashUpcoming}`}</div>
                    <div className="space-y-1">
                      {currentFixtures.map((f, i) => (
                        <MatchRow key={i} fix={f} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* RIGHT: таблица лиги / таблица или сетка текущего турнира */}
          <div className="xl:col-span-2 fade-in min-w-0">
            {!seasonId ? (
              <div className={`p-5 ${ui.card} ${ui.muted} text-sm text-center py-4`}>{locale === "ru" ? "Начни карьеру, чтобы увидеть таблицу" : "Start a career to see standings"}</div>
            ) : (
              <LiveCompetitionPanel
                ui={ui} theme={theme as any} userClub={userClub} locale={locale as "en" | "ru"}
                leagueName={selectedLeague?.name || selectedClub?.league || ""}
                leagueLogo={<img src={getLeagueLogo(selectedLeague?.name || selectedClub?.league || "")} alt="" className="w-6 h-6 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />}
                standings={standings} competitions={competitions} fixturesByComp={fixturesByComp} standingsByComp={standingsByComp}
                activeId={panelCompId} onSelect={setPanelCompId} live={liveMode}
                onClubClick={(c) => router.push(`/clubs/${encodeURIComponent(c)}`)}
              />
            )}

            {seasonId && userClub && (
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                <BoardWidget seasonId={seasonId} clubId={userClub} theme={theme} locale={locale as "en" | "ru"} refreshKey={matchday} compact />
                <NewsWidget seasonId={seasonId} clubId={userClub} theme={theme} locale={locale as "en" | "ru"} refreshKey={matchday} />
              </div>
            )}

            {/* Top performer этого сезона — раньше на дашборде вообще не
                было ни одной сводки по игрокам, только таблица клубов. */}
            {(() => {
              // Только игроки, которые СЕЙЧАС в клубе — проданный игрок не должен
              // оставаться лучшим бомбардиром/рейтингом (его статистика
              // записана на клуб, пока он там играл).
              const currentIds = new Set(clubContracts.map((c: any) => c.player_id));
              const eligible = seasonPlayerStats.filter((p: any) => p.matches_played >= 2 && (currentIds.size === 0 || currentIds.has(p.player_id)));
              const topScorer = [...eligible].sort((a, b) => b.goals - a.goals)[0];
              const topRated = [...eligible].sort((a, b) => (b.total_rating / b.matches_played) - (a.total_rating / a.matches_played))[0];
              if (!topScorer && !topRated) return null;
              const fxl = getFx(locale, theme); const icl = icons(theme);
              const starOf = (r: number) => Math.max(0, Math.min(5, (r - 5) * 1.25));
              return (
                <div className={`p-5 mt-5 shadow-lg ${ui.card} animate-fade-in-up`}>
                  <SectionTitle theme={theme} icon={icl.awards}>{fxl.lbEyebrow}</SectionTitle>
                  <div className="space-y-3">
                    {topScorer && topScorer.goals > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0" style={theme === "maleficent" ? { color: "#e879f9" } : undefined}>{icl.scorer}</span>
                          <span className={`text-sm font-bold truncate ${ui.text}`}>{topScorer.player_name}</span>
                        </div>
                        <span className={`text-sm font-display font-black shrink-0 ${ui.muted}`}>{topScorer.goals} {locale === "ru" ? "гол." : "G"}</span>
                      </div>
                    )}
                    {topRated && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0" style={theme === "maleficent" ? { color: "#e879f9" } : undefined}>{icl.rating}</span>
                          <span className={`text-sm font-bold truncate ${ui.text}`}>{topRated.player_name}</span>
                        </div>
                        <span className="shrink-0 text-right">
                          <Stars value={starOf(topRated.total_rating / topRated.matches_played)} theme={theme} size={10} />
                          <span className="block text-sm font-display font-black leading-tight" style={{ color: getRatingColorDash(topRated.total_rating / topRated.matches_played) }}>
                            {(topRated.total_rating / topRated.matches_played).toFixed(2)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {reportFix && (
        <MatchReportModal fix={reportFix} ui={ui} theme={theme} copy={copy} locale={locale} onClose={() => setReportFix(null)} />
      )}
      {drawQueue.length > 0 && (
        <DrawModal draw={drawQueue[0]} theme={theme as any} locale={locale as "en" | "ru"} userClub={userClub}
          remaining={drawQueue.length - 1}
          onClose={() => {
            setDrawQueue(q => {
              const next = q.slice(1);
              // Если автопромотку поставила на паузу жеребьёвка — продолжаем после закрытия последнего окна
              if (next.length === 0 && drawPausedRef.current) { drawPausedRef.current = false; simPausedRef.current = false; setSimPaused(false); }
              return next;
            });
          }} />
      )}
    </main>
    </DashboardLayout>
  );
}
