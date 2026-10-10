"use client";
// components/CalendarModal.tsx — календарь сезона и «промотка до даты».
//
// Система:
//  • «Сегодня» — дата БЛИЖАЙШЕГО события (тур лиги или раунд любого кубка), поэтому
//    можно выбрать и день прямо перед кубковым матчем;
//  • единая хронология лиги и кубков (lib/simClient.ts → runTimeline), в том числе
//    после окончания лиги (кубки доигрываются до конца);
//  • выбор даты показывает превью: какие матчи будут сыграны до неё;
//  • быстрые переходы: ближайший матч, +неделя, +месяц, смена трансферного окна, конец сезона;
//  • жеребьёвки, составленные по ходу промотки, не теряются при перезагрузке:
//    кладутся в sessionStorage и показываются на дашборде.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Play, Pause, Square, CalendarClock } from "lucide-react";
import { useCareerStore } from "@/app/store/careerStore";
import { getLeagueMatchdayDate, totalLeagueMatchdays } from "@/lib/seasonCalendar";
import { isTransferWindowOpenForDate } from "@/lib/transferWindow";
import { runTimeline, getNextEventDate, fetchDue, type DueCup, type DrawInfo } from "@/lib/simClient";
import { displayYear, formatGameDate } from "@/lib/seasonLabel";
import { pageTheme } from "@/lib/pageTheme";
import { getCal } from "@/lib/i18nCal";
import { icons } from "@/lib/themeFlavor";
import { getClubLogo } from "@/data/clublogos";
import { getMatchReadiness } from "@/lib/matchReadiness";
import Link from "next/link";

export const PENDING_DRAWS_KEY = "fc26-pending-draws";

const SEASON_START = "2025-08-01";
const SEASON_END = "2026-06-15";
const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
} as const;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fromIso = (s: string) => new Date(`${s}T00:00:00Z`);
const addDays = (s: string, n: number) => { const d = fromIso(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Kind = "league" | "cup" | "euro" | "super";
const kindOf = (m: any): Kind => m.source !== "cup" ? "league" : m.competition_type === "continental" ? "euro" : m.competition_type === "super_cup" ? "super" : "cup";

export default function CalendarModal({ theme, locale, glowColor, onClose }: {
  theme: "classic" | "aurora" | "maleficent"; locale: "en" | "ru"; glowColor: string; onClose: () => void;
}) {
  const t = pageTheme(theme); const c = getCal(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : glowColor;

  const seasonId = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const matchday = useCareerStore(s => s.matchday);
  const seasonNum = useCareerStore(s => s.seasonNum);
  const tactic = useCareerStore(s => s.tactic);
  const customTactic = useCareerStore(s => s.customTactic);
  const lineup = useCareerStore(s => s.lineup);
  const setMatchday = useCareerStore(s => s.setMatchday);
  const lineupConfirmed = useCareerStore(s => s.lineupConfirmed);
  const tacticConfirmed = useCareerStore(s => s.tacticConfirmed);
  // Матчи не стартуют, пока состав и тактика не подтверждены (в календаре — тоже)
  const readiness = getMatchReadiness({ lineupValid: Object.values(lineup || {}).filter(Boolean).length > 0, lineupConfirmed, tacticConfirmed });
  const userClub = selectedClub?.name || "";
  const leagueClubCount = selectedLeague?.clubs?.length ?? 20;
  const totalMd = totalLeagueMatchdays(leagueClubCount);

  // ── данные ──
  const [leagueDone, setLeagueDone] = useState(false);
  const [calendarMatches, setCalendarMatches] = useState<any[]>([]);
  const [due, setDue] = useState<DueCup[]>([]);
  const [nextEvent, setNextEvent] = useState<string>(() => getLeagueMatchdayDate(matchday));

  useEffect(() => {
    if (!seasonId || !userClub) return;
    let cancelled = false;
    (async () => {
      const [seasonRes, calRes, dueList] = await Promise.all([
        fetch(`/api/season?id=${seasonId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/calendar?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetchDue(seasonId, userClub),
      ]);
      if (cancelled) return;
      const done = seasonRes?.status === "finished";
      setLeagueDone(done);
      setCalendarMatches(calRes?.matches ?? []);
      setDue(dueList);
      setNextEvent(await getNextEventDate(seasonId, userClub, matchday, done));
    })();
    return () => { cancelled = true; };
  }, [seasonId, userClub, matchday]);

  // ── события по датам (матчи клуба) ──
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const m of calendarMatches) {
      const d = m.match_date ?? (m.matchday ? getLeagueMatchdayDate(m.matchday) : null);
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push({ ...m, _date: d });
    }
    return map;
  }, [calendarMatches]);
  const otherRoundDates = useMemo(() => new Set(due.filter(d => !d.userInvolved && d.matchDate).map(d => d.matchDate as string)), [due]);

  const today = nextEvent;
  const [viewMonth, setViewMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setViewMonth(nextEvent.slice(0, 7)); }, [nextEvent]);

  // ── превью: что будет сыграно до выбранной даты ──
  const preview = useMemo(() => {
    if (!selected || selected < today) return null;
    const mine = calendarMatches.filter(m => !m.played).map(m => ({ ...m, _date: m.match_date ?? (m.matchday ? getLeagueMatchdayDate(m.matchday) : "9999") })).filter(m => m._date <= selected);
    let leagueRounds = 0;
    if (!leagueDone) for (let md = matchday; md <= totalMd; md++) if (getLeagueMatchdayDate(md) <= selected) leagueRounds++;
    const others = due.filter(d => !d.userInvolved && d.matchDate && d.matchDate <= selected).length;
    return { mine, leagueRounds, others };
  }, [selected, today, calendarMatches, due, leagueDone, matchday, totalMd]);

  // ── симуляция ──
  const [simulating, setSimulating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<{ played: number; matchday: number; date?: string } | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  const simulateToDate = async () => {
    if (!selected || selected < today || !seasonId || !userClub || simulating || !readiness.ok) return;
    setSimulating(true); setDoneMsg(null); pausedRef.current = false; stopRef.current = false; setPaused(false);
    let played = 0; const allDraws: DrawInfo[] = [];
    try {
      const result = await runTimeline(
        { seasonId, userClubId: userClub, tactic: tactic || "Balanced", customTactic, lineup: Object.values(lineup || {}).filter(Boolean) },
        matchday, selected,
        {
          shouldStop: () => stopRef.current,
          waitIfPaused: async () => { while (pausedRef.current && !stopRef.current) await sleep(200); },
          stepDelayMs: 200,
          onDraw: d => allDraws.push(d),
          onEvent: e => { played++; if (e.kind === "league") setMatchday(e.matchday); setProgress({ played, matchday: e.matchday, date: e.date }); },
        },
        leagueDone,
      );
      played = result.leaguePlayed + result.cupRoundsPlayed;
    } catch (e) { console.error("simulateToDate failed", e); }

    setDoneMsg(c.done(played)); setSimulating(false);
    if (allDraws.length) { try { sessionStorage.setItem(PENDING_DRAWS_KEY, JSON.stringify(allDraws)); } catch { /* не критично */ } }
    // Перезагрузка — чтобы дашборд, таблицы, состав и трансферы подхватили новое состояние.
    // Если по ходу были жеребьёвки — ведём на дашборд, где их покажет окно жеребьёвки.
    if (played > 0) { await sleep(800); if (allDraws.length) window.location.assign("/dashboard"); else window.location.reload(); }
  };

  // ── быстрые переходы ──
  const clampDate = (d: string) => d < today ? today : d > SEASON_END ? SEASON_END : d;
  const nextWindowChange = () => {
    const open = isTransferWindowOpenForDate(today);
    for (let d = addDays(today, 1); d <= SEASON_END; d = addDays(d, 1)) if (isTransferWindowOpenForDate(d) !== open) return d;
    return SEASON_END;
  };
  const jumps: { key: string; label: string; date: string }[] = [
    { key: "next", label: c.qNext, date: today },
    { key: "week", label: c.qWeek, date: clampDate(addDays(today, 7)) },
    { key: "month", label: c.qMonth, date: clampDate(addDays(today, 30)) },
    { key: "window", label: c.qWindow, date: clampDate(nextWindowChange()) },
    { key: "end", label: c.qEnd, date: getLeagueMatchdayDate(totalMd) > SEASON_END ? SEASON_END : getLeagueMatchdayDate(totalMd) },
  ];
  const pickDate = (d: string) => { if (d < today || d > SEASON_END) return; setSelected(d); setViewMonth(d.slice(0, 7)); };

  // ── клавиатура ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (simulating) return;
      const cur = selected ?? today;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") { e.preventDefault(); pickDate(addDays(cur, 1)); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); pickDate(addDays(cur, -1)); }
      else if (e.key === "ArrowDown") { e.preventDefault(); pickDate(addDays(cur, 7)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); pickDate(addDays(cur, -7)); }
      else if (e.key === "Enter" && selected && readiness.ok) simulateToDate();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, today, simulating, onClose]);

  // ── сетка месяца ──
  const [vy, vm] = viewMonth.split("-").map(Number);
  const monthStart = fromIso(`${viewMonth}-01`);
  const daysInMonth = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
  const lead = (monthStart.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${viewMonth}-${String(i + 1).padStart(2, "0")}`)];
  const prevMonth = iso(new Date(Date.UTC(vy, vm - 2, 1))).slice(0, 7), nextMonth = iso(new Date(Date.UTC(vy, vm, 1))).slice(0, 7);
  const canPrev = prevMonth >= SEASON_START.slice(0, 7), canNext = nextMonth <= SEASON_END.slice(0, 7);

  const kindColor = (k: Kind) => k === "league" ? accent : k === "euro" ? "#3b82f6" : k === "super" ? "#a855f7" : t.warn;
  const kindIcon = (k: Kind) => k === "league" ? ic.league : k === "euro" ? ic.continental : k === "super" ? ic.super : ic.cup;
  const resOf = (m: any): "W" | "D" | "L" | null => {
    if (!m.played) return null;
    const mine = m.home_club === userClub ? m.home_goals : m.away_goals, theirs = m.home_club === userClub ? m.away_goals : m.home_goals;
    if (mine == null || theirs == null) return null;
    return mine > theirs ? "W" : mine < theirs ? "L" : "D";
  };
  const resColor = (r: "W" | "D" | "L" | null) => r === "W" ? t.good : r === "L" ? t.bad : "#94a3b8";

  // лента сезона: прогресс по датам + окна
  const seasonSpan = (fromIso(SEASON_END).getTime() - fromIso(SEASON_START).getTime());
  const pct = (d: string) => Math.max(0, Math.min(100, ((fromIso(d).getTime() - fromIso(SEASON_START).getTime()) / seasonSpan) * 100));
  const windowSegs = useMemo(() => {
    const segs: { from: string; to: string }[] = []; let start: string | null = null;
    for (let d = SEASON_START; d <= SEASON_END; d = addDays(d, 3)) {
      const open = isTransferWindowOpenForDate(d);
      if (open && !start) start = d; if (!open && start) { segs.push({ from: start, to: d }); start = null; }
    }
    if (start) segs.push({ from: start, to: SEASON_END });
    return segs;
  }, []);

  const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : [];
  const windowOpen = (d: string) => isTransferWindowOpenForDate(d);
  const compLabel = (m: any) => m.source === "cup" ? (m.competition_name ?? c.lgCup) : c.lgLeague;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 ${t.overlay}`} onClick={onClose}>
      <div className={`w-full max-w-5xl max-h-[94vh] overflow-y-auto ${t.panel} ${t.shadow} animate-fade-in ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`}
        style={{ backdropFilter: "blur(20px)", ...t.font }} onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="relative px-5 sm:px-7 pt-5 pb-4">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(90% 140% at 0% 0%, ${accent}1c, transparent 60%)` }} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <CalendarClock size={22} color={accent} />
                <h2 className={`text-xl sm:text-2xl leading-tight ${t.title}`} style={{ color: isM ? "#f5d0fe" : undefined }}>{c.title}</h2>
              </div>
              <p className={`text-xs mt-1.5 max-w-2xl ${t.muted}`}>{c.subtitle}</p>
            </div>
            <button onClick={onClose} aria-label={c.close} className={`w-9 h-9 shrink-0 flex items-center justify-center ${t.btnGhost}`}><X size={16} /></button>
          </div>

          {/* лента сезона */}
          <div className="relative mt-4">
            <div className={`flex items-center justify-between text-[9px] mb-1 ${t.eyebrow} ${t.muted}`}>
              <span>{c.progress}</span><span>{formatGameDate(today, seasonNum, locale)}</span>
            </div>
            <div className={`relative h-2.5 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}>
              {windowSegs.map((w, i) => <div key={i} className="absolute inset-y-0" style={{ left: `${pct(w.from)}%`, width: `${pct(w.to) - pct(w.from)}%`, background: `${t.good}33` }} />)}
              <div className="absolute inset-y-0 left-0" style={{ width: `${pct(today)}%`, background: accent, boxShadow: `0 0 12px ${accent}` }} />
              {selected && selected >= today && <div className="absolute inset-y-0" style={{ left: `${pct(today)}%`, width: `${Math.max(0, pct(selected) - pct(today))}%`, background: `${accent}55` }} />}
            </div>
          </div>
        </div>

        {simulating ? (
          <div className="px-5 sm:px-7 pb-7 pt-2">
            <div className={`p-6 text-center ${t.cardAlt}`}>
              <div className="text-4xl mb-3 animate-floaty-sm" style={{ color: accent }}>{isM ? "◈" : isA ? "✦" : "⚽"}</div>
              <div className={`text-[11px] font-black ${t.eyebrow}`} style={{ color: accent }}>{paused ? c.pause : c.playing}…</div>
              <div className="text-3xl font-black mt-2" style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined }}>
                {progress ? `${progress.played}` : "…"} <span className={`text-sm ${t.muted}`}>{progress?.date ? `· ${formatGameDate(progress.date, seasonNum, locale)}` : ""}</span>
              </div>
              <div className={`h-2 mt-4 mx-auto max-w-md ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}>
                <div className="h-full transition-all duration-300" style={{ width: `${progress?.date ? Math.max(3, ((fromIso(progress.date).getTime() - fromIso(today).getTime()) / Math.max(1, fromIso(selected ?? today).getTime() - fromIso(today).getTime())) * 100) : 3}%`, background: accent }} />
              </div>
              <div className="flex items-center justify-center gap-2 mt-5">
                <button onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }} className={`px-4 py-2.5 text-xs font-black flex items-center gap-1.5 ${t.btnGhost}`}>
                  {paused ? <Play size={13} /> : <Pause size={13} />}{paused ? c.resume : c.pause}
                </button>
                <button onClick={() => { stopRef.current = true; }} className={`px-4 py-2.5 text-xs font-black flex items-center gap-1.5 ${t.btnGhost}`} style={{ color: t.bad }}>
                  <Square size={13} />{c.stop}
                </button>
              </div>
              {doneMsg && <div className="mt-4 text-sm font-bold" style={{ color: t.good }}>{doneMsg}</div>}
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-7 pb-6 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
            {/* Календарь */}
            <div className={`p-4 ${t.card}`}>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => canPrev && setViewMonth(prevMonth)} disabled={!canPrev} className={`w-9 h-9 flex items-center justify-center disabled:opacity-20 ${t.btnGhost}`}><ChevronLeft size={16} /></button>
                <span className={`text-base font-black ${isA ? "italic" : ""}`}>{MONTH_NAMES[locale][vm - 1]} {displayYear(vy, seasonNum)}</span>
                <button onClick={() => canNext && setViewMonth(nextMonth)} disabled={!canNext} className={`w-9 h-9 flex items-center justify-center disabled:opacity-20 ${t.btnGhost}`}><ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {c.weekdays.map(w => <div key={w} className={`text-center text-[9px] font-black py-1 ${t.eyebrow} ${t.muted}`}>{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const evs = eventsByDate.get(d) ?? [];
                  const past = d < today, isToday = d === today, isSel = d === selected;
                  const win = windowOpen(d); const other = otherRoundDates.has(d);
                  return (
                    <button key={d} onClick={() => pickDate(d)} disabled={past || d > SEASON_END}
                      title={evs.map(m => `${m.home_club} ${m.played ? `${m.home_goals}:${m.away_goals}` : "–"} ${m.away_club} · ${compLabel(m)}`).join("\n") || undefined}
                      className={`relative min-h-[58px] sm:min-h-[66px] p-1 flex flex-col items-center justify-start transition-all ${isM ? "" : "rounded-xl"} ${past ? "opacity-45" : t.hover} disabled:cursor-not-allowed`}
                      style={{
                        background: isSel ? `${accent}30` : win ? `${t.good}0d` : "transparent",
                        boxShadow: isSel ? `0 0 0 2px ${accent}, 0 0 18px ${accent}55` : isToday ? `0 0 0 1.5px ${accent}` : undefined,
                        border: `1px solid ${isSel ? "transparent" : theme === "aurora" ? "rgba(244,114,182,0.18)" : "rgba(148,163,184,0.12)"}`,
                      }}>
                      <span className={`text-[11px] font-black leading-none ${isToday ? "" : ""}`} style={{ color: isToday || isSel ? accent : undefined }}>{Number(d.slice(8))}</span>
                      <div className="flex flex-col items-center gap-0.5 mt-1 w-full">
                        {evs.slice(0, 2).map((m, k) => {
                          const kd = kindOf(m); const r = resOf(m);
                          return (
                            <span key={k} className={`w-full flex items-center justify-center gap-0.5 text-[8px] font-black leading-none py-0.5 px-0.5 ${isM ? "" : "rounded-md"}`}
                              style={{ background: `${r ? resColor(r) : kindColor(kd)}22`, color: r ? resColor(r) : kindColor(kd) }}>
                              <img src={getClubLogo(m.home_club === userClub ? m.away_club : m.home_club)} alt="" className="w-3 h-3 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                              {r ? `${m.home_goals}:${m.away_goals}` : kindIcon(kd)}
                            </span>
                          );
                        })}
                        {evs.length === 0 && other && <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: "#94a3b8" }} />}
                      </div>
                      {isToday && <span className="absolute -top-1 -right-1 text-[7px] font-black px-1 rounded-full" style={{ background: accent, color: isM ? "#000" : "#fff" }}>▶</span>}
                    </button>
                  );
                })}
              </div>
              {/* легенда */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[10px]">
                {([["league", c.lgLeague], ["cup", c.lgCup], ["euro", c.lgEuro], ["super", c.lgSuper]] as [Kind, string][]).map(([k, label]) => (
                  <span key={k} className="flex items-center gap-1.5" style={{ color: kindColor(k) }}><span>{kindIcon(k)}</span><span className={t.muted}>{label}</span></span>
                ))}
                <span className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ background: `${t.good}33`, border: `1px solid ${t.good}66` }} /><span className={t.muted}>{c.lgWindow}</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3" style={{ boxShadow: `0 0 0 1.5px ${accent}` }} /><span className={t.muted}>{c.lgToday}</span></span>
              </div>
            </div>

            {/* Правая панель */}
            <div className="flex flex-col gap-4 min-w-0">
              {/* Быстрые переходы */}
              <div className={`p-4 ${t.card}`}>
                <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{isA && "✦ "}{c.simulate.replace(" ✦", "")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {jumps.map(j => (
                    <button key={j.key} onClick={() => pickDate(j.date)}
                      className={`px-3 py-2 text-[11px] font-black ${isM ? "" : isA ? "rounded-full" : "rounded-lg"} ${selected === j.date ? t.btn : t.btnGhost}`}>{j.label}</button>
                  ))}
                </div>
              </div>

              {/* Выбранный день + превью */}
              <div className={`p-4 flex-1 ${t.card}`}>
                <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{c.selectedDay}</div>
                {!selected ? (
                  <div className={`text-sm py-6 text-center ${t.muted}`}>{c.pickDate}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`text-lg font-black ${isA ? "italic" : ""}`} style={{ color: accent }}>{formatGameDate(selected, seasonNum, locale)}</div>
                      <span className="text-[10px] font-black px-2 py-1" style={{ background: `${windowOpen(selected) ? t.good : "#94a3b8"}22`, color: windowOpen(selected) ? t.good : "#94a3b8" }}>
                        {windowOpen(selected) ? c.windowOpen : c.windowClosed}
                      </span>
                    </div>

                    {selectedEvents.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        {selectedEvents.map((m, i) => {
                          const kd = kindOf(m); const r = resOf(m); const home = m.home_club === userClub; const opp = home ? m.away_club : m.home_club;
                          return (
                            <div key={i} className={`flex items-center gap-2.5 p-2 ${t.cardAlt}`} style={{ borderLeft: `3px solid ${r ? resColor(r) : kindColor(kd)}` }}>
                              <img src={getClubLogo(opp)} alt="" className="w-7 h-7 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-black truncate">{opp}</div>
                                <div className={`text-[10px] truncate ${t.muted}`}><span style={{ color: kindColor(kd) }}>{kindIcon(kd)}</span> {compLabel(m)}{m.round_name ? ` · ${m.round_name}` : ""} · {home ? c.home : c.away}</div>
                              </div>
                              {r ? <span className="text-sm font-black" style={{ color: resColor(r) }}>{m.home_goals}:{m.away_goals}</span> : <span className={`text-[10px] ${t.muted}`}>{c.vs}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : <div className={`text-xs mt-3 ${t.muted}`}>{c.nothingThatDay}</div>}

                    <div className={`mt-4 pt-3 border-t ${t.divider}`}>
                      <div className={`text-[10px] font-black mb-1.5 ${t.eyebrow} ${t.muted}`}>{c.willPlay}</div>
                      {selected < today ? (
                        <div className="text-xs" style={{ color: t.warn }}>{c.alreadyPast}</div>
                      ) : preview && (preview.mine.length + preview.leagueRounds + preview.others > 0) ? (
                        <ul className="text-[12px] space-y-1 font-bold">
                          {preview.mine.length > 0 && <li>• {c.yourMatches(preview.mine.length)}</li>}
                          {preview.leagueRounds > 0 && <li>• {c.leagueRounds(preview.leagueRounds)}</li>}
                          {preview.others > 0 && <li className={t.muted}>• {c.otherRounds(preview.others)}</li>}
                        </ul>
                      ) : <div className={`text-xs ${t.muted}`}>{c.nothingToPlay}</div>}
                    </div>
                  </>
                )}
                {!readiness.ok && (
                  <div className={`mt-4 p-3 text-xs font-bold flex items-center gap-2 flex-wrap ${isM ? "" : "rounded-xl"}`} style={{ background: `${t.warn}14`, border: `1px solid ${t.warn}55`, color: t.warn }}>
                    <span>{isM ? "[!]" : "🔒"} {c.locked}</span>
                    <span className="flex gap-1.5 ml-auto">
                      {readiness.lineupMissing && <Link href="/squad" onClick={onClose} className={`px-2.5 py-1.5 text-[10px] font-black ${t.btn}`}>{c.goLineup} →</Link>}
                      {readiness.tacticMissing && <Link href="/tactics" onClick={onClose} className={`px-2.5 py-1.5 text-[10px] font-black ${t.btn}`}>{c.goTactic} →</Link>}
                    </span>
                  </div>
                )}
                <button onClick={simulateToDate} disabled={!selected || selected < today || !readiness.ok}
                  className={`mt-4 w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed transition-transform enabled:hover:scale-[1.01] ${t.btn}`}
                  style={selected && selected >= today ? { boxShadow: `0 10px 28px ${accent}55` } : undefined}>
                  <Play size={15} />{selected ? `${c.simulate.replace(" ✦", "")} — ${formatGameDate(selected, seasonNum, locale)}` : c.simulate}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
