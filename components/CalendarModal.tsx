"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Play, Pause, Square, CalendarClock } from "lucide-react";
import { useCareerStore } from "@/app/store/careerStore";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { isTransferWindowOpenForDate } from "@/lib/transferWindow";

// Тот же диапазон, что и в lib/seasonCalendar.ts (старт сезона 16 августа,
// один тур в неделю) — используется только для отрисовки сетки календаря,
// сама логика дат по-прежнему целиком в lib/seasonCalendar.ts.
const SEASON_START = new Date("2025-08-16T00:00:00Z");
const SEASON_END = new Date("2026-06-15T00:00:00Z"); // с запасом дальше любого реалистичного числа туров

const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
} as const;
const WEEKDAYS = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
} as const;

const THEME_UI = {
  classic: {
    overlay: "bg-black/70",
    card: "bg-[#0a0c16] border border-white/10 text-white",
    subtle: "text-white/40",
    dayIdle: "hover:bg-white/[0.06] text-white/70",
    dayDisabled: "text-white/15",
    dayToday: "border border-white/30",
    daySelected: "bg-emerald-500 text-black font-black",
    dot: "bg-emerald-400",
    windowBg: "bg-emerald-500/10",
    btn: "bg-emerald-500 text-black hover:bg-emerald-400",
    btnGhost: "bg-white/[0.06] hover:bg-white/[0.1] text-white",
    pauseBtn: "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30",
    stopBtn: "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30",
  },
  aurora: {
    overlay: "bg-pink-950/40",
    card: "bg-white border border-pink-100 text-pink-950",
    subtle: "text-pink-900/40",
    dayIdle: "hover:bg-pink-50 text-pink-900/70",
    dayDisabled: "text-pink-900/15",
    dayToday: "border border-violet-300",
    daySelected: "bg-violet-500 text-white font-black",
    dot: "bg-violet-400",
    windowBg: "bg-violet-100",
    btn: "bg-violet-500 text-white hover:bg-violet-600",
    btnGhost: "bg-pink-50 hover:bg-pink-100 text-pink-900",
    pauseBtn: "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200",
    stopBtn: "bg-red-100 text-red-600 border border-red-300 hover:bg-red-200",
  },
  maleficent: {
    overlay: "bg-black/80",
    card: "bg-black border border-purple-900/50 text-purple-100 font-mono",
    subtle: "text-purple-500/50",
    dayIdle: "hover:bg-purple-950/40 text-purple-300/70",
    dayDisabled: "text-purple-900/30",
    dayToday: "border border-fuchsia-700",
    daySelected: "bg-fuchsia-700 text-white font-black",
    dot: "bg-fuchsia-500",
    windowBg: "bg-fuchsia-950/30",
    btn: "bg-fuchsia-700 text-white hover:bg-fuchsia-600",
    btnGhost: "bg-purple-950/30 hover:bg-purple-950/50 text-purple-200",
    pauseBtn: "bg-amber-950/30 text-amber-400 border border-amber-800/50 hover:bg-amber-950/50",
    stopBtn: "bg-red-950/30 text-red-400 border border-red-800/50 hover:bg-red-950/50",
  },
} as const;

function toISODate(d: Date) { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }
function sameDay(a: Date, b: Date) { return toISODate(a) === toISODate(b); }

// Раньше в сетке календаря были видны только матчи лиги (точками), даже
// если в этот день реально играется кубок страны, суперкубок или еврокубок
// — их не было видно вообще, хотя они там были. Теперь весь день красится
// цветом реального турнира (а не точкой) — сразу понятно, что за матч.
const COMPETITION_COLORS: Record<string, string> = {
  league: "", // особый цвет не нужен — это фон "по умолчанию"
  domestic_cup: "#f59e0b",
  super_cup: "#a855f7",
  continental: "#6366f1",
};
function competitionColor(m: { competition_type: string; competition_name?: string }): string {
  if (m.competition_type === "continental") {
    const name = m.competition_name ?? "";
    if (name.includes("Europa") && !name.includes("Conference")) return "#f97316";
    if (name.includes("Conference")) return "#22c55e";
    return "#6366f1"; // Champions League и общий случай
  }
  return COMPETITION_COLORS[m.competition_type] ?? "";
}

const simSleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function CalendarModal({
  theme, locale, glowColor, onClose,
}: {
  theme: "classic" | "aurora" | "maleficent"; locale: "en" | "ru"; glowColor: string; onClose: () => void;
}) {
  const ui = THEME_UI[theme];
  const seasonId = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const matchday = useCareerStore(s => s.matchday);
  const tactic = useCareerStore(s => s.tactic);
  const customTactic = useCareerStore(s => s.customTactic);
  const lineup = useCareerStore(s => s.lineup);
  const setMatchday = useCareerStore(s => s.setMatchday);
  const userClub = selectedClub?.name || "";

  const currentMatchdayDate = useMemo(() => new Date(`${getLeagueMatchdayDate(matchday)}T00:00:00Z`), [matchday]);

  // Единый календарь клуба — лига + все кубки, где он участвует (тот же
  // эндпоинт, что уже питает виджет "следующий матч" на дашборде).
  const [calendarMatches, setCalendarMatches] = useState<any[]>([]);
  useEffect(() => {
    if (!seasonId || !userClub) return;
    fetch(`/api/calendar?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.matches) setCalendarMatches(data.matches); })
      .catch(() => {});
  }, [seasonId, userClub]);

  const matchesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const m of calendarMatches) {
      if (!m.match_date) continue;
      if (!map.has(m.match_date)) map.set(m.match_date, []);
      map.get(m.match_date)!.push(m);
    }
    return map;
  }, [calendarMatches]);

  // Какие типы турниров вообще встречаются в этом сезоне клуба — для легенды
  const activeCompetitions = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    for (const m of calendarMatches) {
      const color = competitionColor(m);
      if (!color) continue;
      const key = m.competition_name ?? m.competition_type;
      if (!seen.has(key)) seen.set(key, { label: m.competition_name ?? key, color });
    }
    return [...seen.values()];
  }, [calendarMatches]);

  const [viewDate, setViewDate] = useState(() => new Date(currentMatchdayDate));
  const [selected, setSelected] = useState<Date | null>(null);

  const [simulating, setSimulating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState<{ played: number; matchday: number } | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  const t = {
    title: locale === "ru" ? "Календарь сезона" : "Season Calendar",
    subtitle: locale === "ru"
      ? "Выбери любую дату — все матчи до неё будут сыграны, и симуляция остановится"
      : "Pick any date — every match up to it will be played, then the sim stops",
    simulate: locale === "ru" ? "Промотать до этой даты" : "Simulate to this date",
    close: locale === "ru" ? "Закрыть" : "Close",
    pause: locale === "ru" ? "Пауза" : "Pause",
    resume: locale === "ru" ? "Продолжить" : "Resume",
    stop: locale === "ru" ? "Остановить" : "Stop",
    today: locale === "ru" ? "Текущий тур" : "Current matchday",
    windowOpen: locale === "ru" ? "Открыто трансферное окно" : "Transfer window open",
    playing: locale === "ru" ? "Играем тур" : "Playing matchday",
    noneSelected: locale === "ru" ? "Выбери дату в календаре" : "Pick a date on the calendar",
    alreadyPast: locale === "ru" ? "Эта дата уже позади" : "That date is already behind you",
    doneCount: (n: number) => locale === "ru" ? `Сыграно туров: ${n}. Обновляю…` : `${n} matchday${n === 1 ? "" : "s"} played. Refreshing…`,
  };

  const advanceDueCups = async (currentDateStr: string, ignoreDate = false) => {
    let safety = ignoreDate ? 20 : 6;
    while (safety-- > 0) {
      const dueRes = await fetch(`/api/competitions/due?seasonId=${seasonId}`);
      if (!dueRes.ok) return;
      const { due } = await dueRes.json();
      let advancedAny = false;
      for (const d of due as { competitionId: string; matchDate: string | null }[]) {
        if (!ignoreDate && d.matchDate && d.matchDate > currentDateStr) continue;
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

  const simulateToDate = async () => {
    if (!selected || !seasonId || !userClub || simulating) return;
    const targetIso = toISODate(selected);
    setSimulating(true);
    setDoneMsg(null);
    pausedRef.current = false;
    stopRef.current = false;
    setPaused(false);

    let played = 0;
    let currentMd = matchday;
    let finished = false;
    const SAFETY_CAP = 80;
    let iterations = 0;

    try {
      while (!finished && iterations < SAFETY_CAP) {
        if (getLeagueMatchdayDate(currentMd) > targetIso) break; // следующий тур уже после выбранной даты — стоп

        while (pausedRef.current && !stopRef.current) await simSleep(200);
        if (stopRef.current) break;

        const res = await fetch("/api/season/advance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonId, userClubId: userClub, userTactic: tactic,
            userCustomTactic: tactic === "Custom" ? customTactic : undefined,
            userLineup: Object.values(lineup || {}).filter(Boolean),
          }),
        });
        const data = await res.json();
        if (!res.ok) break;
        iterations++;
        played++;
        finished = !!data.finished;
        currentMd = data.nextMatchday;
        setMatchday(data.nextMatchday);
        setProgress({ played, matchday: data.nextMatchday });

        await advanceDueCups(getLeagueMatchdayDate(currentMd));
        if (!finished && !stopRef.current) await simSleep(250);
      }
      if (finished && !stopRef.current) await advanceDueCups("9999-12-31", true);
    } catch (e) {
      console.error("simulateToDate failed", e);
    }

    setDoneMsg(t.doneCount(played));
    setSimulating(false);
    // Не у всех страниц есть свой well-defined refetch для этого модального
    // окна (оно смонтировано глобально в DashboardLayout) — надёжнее всего
    // просто перезагрузить страницу, чтобы дашборд/таблица/состав/трансферы
    // гарантированно подхватили новый тур и все побочные эффекты (бюджет,
    // зарплаты, истёкшие контракты и т.д.)
    if (played > 0) {
      await simSleep(900);
      window.location.reload();
    }
  };

  // ── Сетка календаря ──
  const monthStart = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 0));
  const leadingBlanks = (monthStart.getUTCDay() + 6) % 7; // понедельник = 0
  const daysInMonth = monthEnd.getUTCDate();
  const cells: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), i + 1))),
  ];

  const canGoPrev = monthStart > SEASON_START;
  const canGoNext = monthEnd < SEASON_END;

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${ui.overlay}`} onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-fade-in ${ui.card}`}
        style={{ backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <CalendarClock size={20} color={glowColor} />
            <h2 className="text-lg font-black">{t.title}</h2>
          </div>
          <button onClick={onClose} className={`w-8 h-8 flex items-center justify-center rounded-lg ${ui.btnGhost}`}>
            <X size={16} />
          </button>
        </div>
        <p className={`text-xs mb-5 ${ui.subtle}`}>{t.subtitle}</p>

        {!simulating ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => canGoPrev && setViewDate(new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() - 1, 1)))}
                disabled={!canGoPrev} className={`w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-20 ${ui.btnGhost}`}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-black">{MONTH_NAMES[locale][viewDate.getUTCMonth()]} {viewDate.getUTCFullYear()}</span>
              <button onClick={() => canGoNext && setViewDate(new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 1)))}
                disabled={!canGoNext} className={`w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-20 ${ui.btnGhost}`}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS[locale].map(w => (
                <div key={w} className={`text-center text-[10px] font-bold uppercase py-1 ${ui.subtle}`}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = toISODate(d);
                const isPast = d < currentMatchdayDate && !sameDay(d, currentMatchdayDate);
                const isToday = sameDay(d, currentMatchdayDate);
                const isSelected = selected && sameDay(d, selected);
                const dayMatches = matchesByDate.get(iso) ?? [];
                const isLeagueDay = dayMatches.some((m: any) => m.competition_type === "league");
                const specialMatch = dayMatches.find((m: any) => competitionColor(m));
                const cellColor = specialMatch ? competitionColor(specialMatch) : "";
                const windowOpen = isTransferWindowOpenForDate(iso);
                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => setSelected(d)}
                    title={dayMatches.map((m: any) => `${m.competition_name}: ${m.home_club} vs ${m.away_club}`).join("\n")}
                    style={isSelected ? undefined : cellColor ? {
                      background: `${cellColor}${isPast ? "1c" : "30"}`,
                      boxShadow: `inset 0 0 0 1px ${cellColor}55`,
                    } : undefined}
                    className={`relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-all
                      ${isPast ? `cursor-not-allowed ${ui.dayDisabled}` : `cursor-pointer ${ui.dayIdle}`}
                      ${isSelected ? ui.daySelected : ""}
                      ${isToday && !isSelected ? ui.dayToday : ""}
                      ${!isSelected && !isPast && !cellColor && windowOpen ? ui.windowBg : ""}`}
                  >
                    <span>{d.getUTCDate()}</span>
                    {isLeagueDay && !cellColor && <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-black/50" : ui.dot}`} />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-4 text-[10px]">
              <span className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${ui.dot}`} /> {locale === "ru" ? "Тур лиги" : "League matchday"}</span>
              {activeCompetitions.map(c => (
                <span key={c.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: c.color }} /> {c.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded ${ui.windowBg}`} /> {t.windowOpen}</span>
            </div>

            {doneMsg && <div className={`text-xs mb-3 ${ui.subtle}`}>{doneMsg}</div>}

            <button
              onClick={simulateToDate}
              disabled={!selected}
              className={`w-full py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${ui.btn}`}
            >
              <Play size={14} />
              {selected ? `${t.simulate} — ${toISODate(selected)}` : t.noneSelected}
            </button>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="text-sm font-black mb-1">{t.playing} {progress?.matchday ?? matchday}…</div>
            <div className={`text-xs mb-5 ${ui.subtle}`}>{progress ? (locale === "ru" ? `Сыграно туров: ${progress.played}` : `${progress.played} played`) : ""}</div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${ui.pauseBtn}`}>
                {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? t.resume : t.pause}
              </button>
              <button
                onClick={() => { stopRef.current = true; pausedRef.current = false; }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${ui.stopBtn}`}>
                <Square size={13} /> {t.stop}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
