"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getLeagueTheme } from "@/constants/themes";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { isLineupValid, getLineupCount, MIN_LINEUP_SIZE } from "@/lib/lineupValidation";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";
import { getThemeCopy } from "@/lib/i18n";
import { MatchReportModal } from "@/components/MatchReportModal";
import { HelpHint } from "@/components/HelpHint";
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

  const [hydrated, setHydrated]     = useState(false);
  const [standings, setStandings]   = useState<any[]>([]);
  const [fixtures, setFixtures]     = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seasonFinished, setSeasonFinished] = useState(false);
  const [seasonTrophies, setSeasonTrophies] = useState<any[]>([]);
  const [allCompetitionResults, setAllCompetitionResults] = useState<any[]>([]);
  const [reportFix, setReportFix] = useState<any>(null);
  const [activeNav, setActiveNav]   = useState("/dashboard");
  const [calendar, setCalendar]     = useState<any[]>([]);
  const [seasonPlayerStats, setSeasonPlayerStats] = useState<any[]>([]);
  const [unavailableNames, setUnavailableNames] = useState<Set<string>>(new Set());
  const [simulatingCup, setSimulatingCup] = useState(false);

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
  const glowColor   = leagueTheme?.rawColor || "#ffffff";
  const userClub    = selectedClub?.name || "";

  useEffect(() => {
    if (!seasonId || !userClub) return;
    fetch(`/api/season-stats?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSeasonPlayerStats(data.stats ?? []); }).catch(() => {});
  }, [seasonId, userClub]);

  useEffect(() => {
    if (!seasonFinished || !seasonId) return;
    fetch(`/api/competitions?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const finished = (data.competitions ?? []).filter((c: any) => c.status === "finished" && c.winner_club);
        setSeasonTrophies(finished.filter((c: any) => c.winner_club === userClub));
        setAllCompetitionResults(finished);
      }).catch(() => {});
  }, [seasonFinished, seasonId, userClub]);

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

  // Промотка сезона целиком — тур за туром, каждый матч (включая матчи
  // пользователя) играет ИИ по рейтингу состава, без ручного состава/тактики.
  // Гоняем циклом с клиента, а не одним огромным запросом на сервере —
  // так не упираемся в таймаут serverless-функции на Vercel, и заодно видно
  // прогресс по ходу дела.
  const [simulatingSeason, setSimulatingSeason] = useState(false);
  const [seasonSimProgress, setSeasonSimProgress] = useState<{ done: number; matchday: number } | null>(null);

  // При автопромотке лиги кубки раньше вообще не трогались — их fixtures
  // просто копились неигранными. Теперь после каждого лигового тура ещё
  // проверяем все активные турниры: если дата текущего раунда уже наступила
  // (или прошла) по игровому календарю — доигрываем его тоже, в автопилоте.
  const advanceDueCups = async (currentDateStr: string, ignoreDate = false) => {
    // Раньше тут дёргался полный /api/competitions (все fixtures + таблица
    // лиг-фазы) на КАЖДОЙ проверке — при промотке всего сезона это тысячи
    // тяжёлых запросов и заметные тормоза. Теперь — лёгкая проверка "у кого
    // вообще есть неигранный тур и когда он датирован", без лишних данных.
    //
    // ignoreDate=true — используется ПОСЛЕ завершения лигового сезона: раз
    // календарь игры двигается только через туры лиги, а лига уже закончилась,
    // дальше ждать больше нечего — доигрываем оставшиеся раунды кубков как есть.
    let safety = ignoreDate ? 20 : 6;
    while (safety-- > 0) {
      const dueRes = await fetch(`/api/competitions/due?seasonId=${seasonId}`);
      if (!dueRes.ok) return;
      const { due } = await dueRes.json();
      let advancedAny = false;

      for (const d of due as { competitionId: string; matchDate: string | null }[]) {
        if (!ignoreDate && d.matchDate && d.matchDate > currentDateStr) continue; // дата ещё не наступила
        await fetch("/api/cup/advance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitionId: d.competitionId, userClubId: userClub, userTactic: tactic,
            userLineup: Object.values(lineup || {}).filter(Boolean),
          }),
        });
        advancedAny = true;
      }
      if (!advancedAny) break;
    }
  };

  const simulateWholeSeason = async () => {
    if (!seasonId || simulating || simulatingSeason) return;
    setSimulatingSeason(true);
    setApiError(null);
    setSeasonSimProgress({ done: 0, matchday });
    try {
      let finished = false;
      let iterations = 0;
      const SAFETY_CAP = 80; // больше, чем матчей в самом длинном реалистичном календаре
      while (!finished && iterations < SAFETY_CAP) {
        const res = await fetch("/api/season/advance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // Раньше здесь ничего не передавалось ("автопилот"), и сервер на
          // КАЖДЫЙ матч заново собирал "топ-11 по общему рейтингу" вместо
          // реального сохранённого состава — из-за этого статистика при
          // авто-прокрутке была совсем не похожа на то, что получилось бы
          // при ручной игре (другой стартовый состав, другая логика матча).
          // Теперь передаём тот же lineup/tactic, что и при ручной игре —
          // сервер сам подставит замены только на недоступные позиции.
          body: JSON.stringify({
            seasonId, userClubId: userClub, userTactic: tactic,
            userCustomTactic: tactic === "Custom" ? customTactic : undefined,
            userLineup: Object.values(lineup || {}).filter(Boolean),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setApiError(data.error || "Season sim stopped early."); break; }
        iterations++;
        finished = !!data.finished;
        setSeasonSimProgress({ done: iterations, matchday: data.nextMatchday });

        await advanceDueCups(getLeagueMatchdayDate(data.nextMatchday));

        if (finished) setSeasonFinished(true);
      }
      // Лига закончилась, но у кубков (особенно еврокубков — их плей-офф
      // может ещё продолжаться) могли остаться недоигранные раунды с датами
      // ПОСЛЕ последнего тура лиги. Дальше календарь всё равно не двигается
      // сам по себе — доигрываем всё, что осталось, не дожидаясь дат.
      await advanceDueCups("9999-12-31", true);
      await loadData(seasonId);
      await loadCalendar(seasonId, userClub);
    } catch (e) { console.error(e); setApiError("Network error during season simulation."); }
    setSimulatingSeason(false);
    setSeasonSimProgress(null);
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

  const recentForm = useMemo(() => {
    return fixtures
      .filter(f => f.played && (f.home_club === userClub || f.away_club === userClub))
      .sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0))
      .slice(-5)
      .map(f => {
        const isHome = f.home_club === userClub;
        const gf = isHome ? f.home_goals : f.away_goals;
        const ga = isHome ? f.away_goals : f.home_goals;
        return gf > ga ? "W" : gf < ga ? "L" : "D";
      });
  }, [fixtures, userClub]);

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
          <div className={`w-full max-w-lg p-8 rounded-3xl text-center ${ui.card} animate-fade-in-up`}>
            <div className="text-5xl mb-3 animate-floaty-sm inline-block">🏁</div>
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.subLabel}`}>Season Complete</div>
            <h1 className={`text-2xl font-display font-black mb-1 ${ui.text}`}>{selectedClub.name}</h1>
            <div className={`text-sm mb-5 ${ui.muted}`}>Final league position: #{userPos} of {sortedStandings.length}</div>

            {/* Трофеи сезона — раньше здесь был виден только результат в лиге,
                выигранные кубки/еврокубки нигде явно не отображались. */}
            {seasonTrophies.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {seasonTrophies.map((t: any) => (
                  <div key={t.id} className={`flex flex-col items-center gap-1 px-4 py-3 rounded-2xl animate-fade-in-up ${ui.card}`} style={{ borderTop: "2px solid #eab308" }}>
                    <span className="text-2xl">🏆</span>
                    <span className={`text-[11px] font-bold ${ui.text}`}>{t.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-xs mb-6 ${ui.muted}`}>
                {locale === "ru" ? "В этом сезоне без трофеев — в следующем получится." : "No trophies this season — next time."}
              </div>
            )}

            <div className="flex justify-center gap-2 mb-4">
              <img src={getClubLogo(sortedStandings[0]?.club_id || "")} className="w-10 h-10 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
              <div className="text-left">
                <div className={`text-[10px] uppercase ${ui.muted}`}>{locale === "ru" ? "Чемпион лиги" : "League Champion"}</div>
                <div className={`text-sm font-black ${ui.text}`}>{sortedStandings[0]?.club_id}</div>
              </div>
            </div>

            {/* Победители ВСЕХ турниров сезона — раньше тут был виден только
                результат своей лиги и трофеи, выигранные лично пользователем. */}
            {allCompetitionResults.length > 0 && (
              <div className={`text-left rounded-2xl p-4 mb-6 ${ui.card}`}>
                <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>
                  {locale === "ru" ? "Победители сезона" : "Season winners"}
                </div>
                <div className="space-y-2">
                  {allCompetitionResults.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className={ui.muted}>{c.name}</span>
                      <span className={`font-bold flex items-center gap-1.5 ${c.winner_club === userClub ? "text-emerald-400" : ui.text}`}>
                        <img src={getClubLogo(c.winner_club)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                        {c.winner_club}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleStartNewSeason} disabled={startingNewSeason}
              className={`w-full py-4 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-transform hover:scale-[1.02] ${ui.btnPrimary}`}>
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
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] animate-floaty"
          style={{ backgroundColor: `${glowColor}10` }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[120px] animate-floaty"
          style={{ backgroundColor: `${glowColor}08`, animationDelay: "-2s", animationDuration: "6s" }} />
      </div>

      {/* Main */}
      <div className={`relative z-10 p-6 md:p-8 pt-16 lg:pt-8 ${ui.text}`}>
        {/* Top bar — герб + название + быстрые статы в одну строку */}
        <div className={`flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 mb-8 p-5 rounded-3xl animate-fade-in-up ${ui.card}`}
          style={{ borderLeft: `3px solid ${glowColor}` }}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-floaty-sm" style={{ background: glowColor }} />
              <img src={getClubLogo(selectedClub?.name || "")} alt="" className="relative w-14 h-14 object-contain"
                onError={e => (e.currentTarget.style.display = "none")} />
            </div>
            <div className="min-w-0">
              <div className={`${ui.subLabel} mb-1`}>{copy.dashTitle}</div>
              <h2 className="text-xl sm:text-2xl font-display font-black truncate"
                style={theme === "classic" ? { fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem" } : theme === "maleficent" ? { fontFamily: "'Share Tech Mono',monospace" } : {}}>
                {selectedClub?.name} — Season 2025/26
              </h2>
              {recentForm.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className={`text-[9px] uppercase tracking-widest font-black mr-1 ${ui.muted}`}>{locale === "ru" ? "Форма" : "Form"}</span>
                  {recentForm.map((r, i) => (
                    <span key={i}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white animate-fade-in-up"
                      style={{
                        background: r === "W" ? "#22c55e" : r === "L" ? "#ef4444" : "#94a3b8",
                        animationDelay: `${i * 60}ms`,
                      }}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Быстрые статы — раньше их не было видно нигде, кроме отдельных страниц */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <HelpHint id="dash-quickstats" theme={theme as any}
              title={locale === "ru" ? "Быстрые статы" : "Quick stats"}
              text={locale === "ru"
                ? "Место и очки — из турнирной таблицы лиги. Бюджет — сколько денег осталось на трансферы после вычета зарплат. Тур — какой матчдей лиги сейчас."
                : "Position and points come from the league table. Budget is what's left for transfers after wages. Matchday is the current league round."} />
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${ui.badge}`}>
              <span className="text-base font-display font-black" style={{ color: glowColor }}>{userPos}</span>
              <span className={`text-[8px] uppercase tracking-widest font-black ${ui.muted}`}>{locale === "ru" ? "Место" : "Position"}</span>
            </div>
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${ui.badge}`}>
              <span className="text-base font-display font-black">{userRow?.points ?? 0}</span>
              <span className={`text-[8px] uppercase tracking-widest font-black ${ui.muted}`}>{locale === "ru" ? "Очки" : "Points"}</span>
            </div>
            {userRow?.budget != null && (
              <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${ui.badge}`}>
                <span className="text-base font-display font-black text-emerald-500">
                  {userRow.budget >= 1_000_000 ? `€${(userRow.budget / 1_000_000).toFixed(1)}M` : `€${Math.round(userRow.budget / 1000)}K`}
                </span>
                <span className={`text-[8px] uppercase tracking-widest font-black ${ui.muted}`}>{locale === "ru" ? "Бюджет" : "Budget"}</span>
              </div>
            )}
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${ui.badge}`}>
              <span className="text-base font-display font-black">⚽ {matchday}</span>
              <span className={`text-[8px] uppercase tracking-widest font-black ${ui.muted}`}>{locale === "ru" ? "Тур" : "Matchday"}</span>
            </div>
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
                  <div className={`p-6 ${ui.card} animate-fade-in-up`} style={{ borderLeft: `3px solid ${glowColor}` }}>
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
                        {simulatingCup ? copy.dashSimulating : copy.dashPlayMatch}
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
                  <div className={`p-6 ${ui.card} animate-fade-in-up text-center`}>
                    <p className={`${ui.muted} mb-4 text-sm`}>{copy.dashNoSeason}</p>
                    <Link href="/leagues"><button className={`px-6 py-3 ${ui.btnPrimary}`}>{copy.dashStartCareer}</button></Link>
                  </div>
                );
              }

              return (
                <div className={`p-6 ${ui.card} animate-fade-in-up`}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const myMatch = currentFixtures.find(f => f.home_club === userClub || f.away_club === userClub);
                        const opponent = myMatch ? (myMatch.home_club === userClub ? myMatch.away_club : myMatch.home_club) : null;
                        const isHome = myMatch?.home_club === userClub;
                        return opponent ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <img src={getClubLogo(opponent)} className="w-11 h-11 object-contain" alt=""
                              onError={e => (e.currentTarget.style.display = "none")} />
                          </div>
                        ) : null;
                      })()}
                      <div className="min-w-0">
                        <div className={`${ui.subLabel} mb-1 flex items-center gap-1.5`}>
                          Matchday {matchday}
                          <HelpHint id="dash-simulate" theme={theme as any}
                            title={locale === "ru" ? "Симуляция" : "Simulation"}
                            text={locale === "ru"
                              ? "«Симулировать тур» играет матч твоего клуба по выбранной тактике/составу. «Весь сезон» доигрывает ИИ все оставшиеся туры разом, включая твои — используй, если просто хочешь долистать до конца сезона."
                              : "\"Simulate\" plays your club's match with your chosen tactic/lineup. \"Sim Season\" has the AI play out every remaining round at once, including yours — use it to fast-forward to season's end."} />
                        </div>
                        {(() => {
                          const myMatch = currentFixtures.find(f => f.home_club === userClub || f.away_club === userClub);
                          const opponent = myMatch ? (myMatch.home_club === userClub ? myMatch.away_club : myMatch.home_club) : null;
                          const isHome = myMatch?.home_club === userClub;
                          return opponent ? (
                            <div className={`text-lg font-display font-black truncate ${ui.text}`}>
                              {isHome ? locale === "ru" ? "дома против" : "vs" : locale === "ru" ? "в гостях у" : "at"} {opponent}
                            </div>
                          ) : (
                            <div className={`text-lg font-black ${ui.text}`}>{currentFixtures.length} {copy.dashMatchesToPlay}</div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={advanceMatchday} disabled={simulating || simulatingSeason || currentFixtures.every(f => f.played) || !lineupValid}
                        className={`px-6 py-3 font-black text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${ui.btnPrimary}`}>
                        <Zap size={16} />
                        {simulating ? copy.dashSimulating : copy.dashSimulate}
                      </button>
                      <button onClick={simulateWholeSeason} disabled={simulating || simulatingSeason || seasonFinished}
                        title={locale === "ru" ? "ИИ доигрывает все оставшиеся матчи сезона, включая твои" : "AI plays every remaining match this season, including yours"}
                        className="px-4 py-3 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl border transition-transform hover:scale-[1.03]"
                        style={{ borderColor: `${glowColor}40`, color: glowColor, background: `${glowColor}0d` }}>
                        ⏩ {simulatingSeason ? `${copy.dashSimulating} (${seasonSimProgress?.done ?? 0})` : (locale === "ru" ? "Весь сезон" : "Sim Season")}
                      </button>
                    </div>
                  </div>
                  {simulatingSeason && (
                    <div className="mb-3 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(59,130,246,0.10)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                      ⏳ {locale === "ru" ? `Автосимуляция остатка сезона — ИИ играет все матчи, включая твои. Тур ${seasonSimProgress?.matchday ?? matchday}… не закрывай вкладку.` : `Auto-simulating the rest of the season — AI is playing every match, including yours. Matchday ${seasonSimProgress?.matchday ?? matchday}… this can take a bit, don't close the tab.`}
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
                  <Link href="/squad" className="text-[10px] underline opacity-50 hover:opacity-100">{copy.dashManageSquad}</Link>
                </div>
              </div>
              );
            })()}

            {/* Last results + upcoming — раньше шли друг под другом на всю
                ширину даже на широких экранах; места хватает на 2 колонки. */}
            {(showResults && lastResults.length > 0) || currentFixtures.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {showResults && lastResults.length > 0 && (
                  <div className={`p-5 ${ui.card} animate-fade-in-up`}>
                    <div className={`${ui.subLabel} mb-3`}>{locale === "ru" ? `Тур ${matchday - 1} — ${copy.dashMatchdayResults}` : `Matchday ${matchday - 1} ${copy.dashMatchdayResults}`}</div>
                    <div className="space-y-1">
                      {lastResults.map((r, i) => (
                        <MatchRow key={i} fix={{ ...r, home_club: r.home, away_club: r.away, played: true, home_goals: r.homeGoals, away_goals: r.awayGoals, events: r.events }} userClub={userClub} ui={ui} theme={theme} onOpenReport={setReportFix} />
                      ))}
                    </div>
                  </div>
                )}

                {currentFixtures.length > 0 && (
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

          {/* RIGHT: standings */}
          <div className="xl:col-span-2 fade-in">
            <div className={`p-5 ${ui.card} animate-fade-in-up`}>
              <div className="flex items-center gap-2 mb-4">
                <img src={getLeagueLogo(selectedLeague?.name || selectedClub?.league || "")} alt="" className="w-6 h-6 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                <div className={`${ui.subLabel}`}>{selectedLeague?.name || selectedClub?.league || "League Table"}</div>
              </div>
              {!seasonId ? (
                <div className={`${ui.muted} text-sm text-center py-4`}>Start a career to see standings</div>
              ) : (
                <StandingsTable standings={standings} userClub={userClub} ui={ui} theme={theme} glowColor={glowColor} leagueName={selectedLeague?.name || selectedClub?.league} />
              )}
            </div>

            {/* Top performer этого сезона — раньше на дашборде вообще не
                было ни одной сводки по игрокам, только таблица клубов. */}
            {(() => {
              const eligible = seasonPlayerStats.filter((p: any) => p.matches_played >= 2);
              const topScorer = [...eligible].sort((a, b) => b.goals - a.goals)[0];
              const topRated = [...eligible].sort((a, b) => (b.total_rating / b.matches_played) - (a.total_rating / a.matches_played))[0];
              if (!topScorer && !topRated) return null;
              return (
                <div className={`p-5 mt-5 ${ui.card} animate-fade-in-up`}>
                  <div className={`${ui.subLabel} mb-3`}>{locale === "ru" ? "Лидеры сезона" : "Season leaders"}</div>
                  <div className="space-y-3">
                    {topScorer && topScorer.goals > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">⚽</span>
                          <span className={`text-sm font-bold truncate ${ui.text}`}>{topScorer.player_name}</span>
                        </div>
                        <span className={`text-sm font-display font-black shrink-0 ${ui.muted}`}>{topScorer.goals} {locale === "ru" ? "гол." : "G"}</span>
                      </div>
                    )}
                    {topRated && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">⭐</span>
                          <span className={`text-sm font-bold truncate ${ui.text}`}>{topRated.player_name}</span>
                        </div>
                        <span className="text-sm font-display font-black shrink-0" style={{ color: getRatingColorDash(topRated.total_rating / topRated.matches_played) }}>
                          {(topRated.total_rating / topRated.matches_played).toFixed(2)}
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
        <MatchReportModal fix={reportFix} ui={ui} theme={theme} copy={copy} onClose={() => setReportFix(null)} />
      )}
    </main>
    </DashboardLayout>
  );
}
