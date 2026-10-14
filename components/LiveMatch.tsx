"use client";
// components/LiveMatch.tsx — матч по минутам: первый тайм идёт на глазах (счёт, события), на перерыве
// пользователь меняет тактику и делает замены, затем второй тайм — и результат записывается как обычный матч.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Pause, Play, FastForward } from "lucide-react";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { pageTheme } from "@/lib/pageTheme";
import { getLive } from "@/lib/i18nLive";
import { icons } from "@/lib/themeFlavor";
import { TACTICS } from "@/lib/tactics";
import { MAX_TOTAL_SUBS, lineupAfterEvents, entryMinutes, inMatchDrain, subsUsed } from "@/lib/liveMatch";

type Phase = "loading" | "h1" | "ht" | "h2" | "ft" | "error";
const MS_PER_MINUTE = [520, 170, 50];       // скорости 1× / 3× / 10×
const fitColor = (f: number) => f >= 85 ? "#22c55e" : f >= 70 ? "#eab308" : f >= 50 ? "#f97316" : "#ef4444";

export interface LiveResult { override: { home: string; away: string; homeGoals: number; awayGoals: number; events: any[] }; lineup: any[] }

function Face({ name, size = 36 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-black/30" style={{ width: size, height: size }}>
    {err ? <span className="text-[9px] font-black text-white/60">?</span> : <img src={getPlayerPhoto(name)} alt="" className="w-full h-full object-cover object-top" onError={() => setErr(true)} />}
  </div>;
}

export function LiveMatch({ seasonId, userClub, kind, competitionId, lineup, tactic, theme, locale, glowColor, onClose, onComplete }: {
  seasonId: string; userClub: string; kind: "league" | "cup"; competitionId?: string; lineup: any[]; tactic: string;
  theme: string; locale: "en" | "ru"; glowColor: string; onClose: () => void; onComplete: (r: LiveResult) => void;
}) {
  const t = pageTheme(theme); const c = getLive(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : glowColor;

  const [phase, setPhase] = useState<Phase>("loading");
  const [a, setA] = useState<any>(null);          // ответ первого тайма
  const [evAll, setEvAll] = useState<any[]>([]);  // ВСЕ события матча (показанные и «будущие» — их пересчитывает пауза)
  const [ms, setMs] = useState<any>(null);        // состояние матча на сервере (обновляется после каждого изменения)
  const [curTactic, setCurTactic] = useState(tactic);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tactic2, setTactic2] = useState(tactic);
  const [subs, setSubs] = useState<{ outId: string; inId: string }[]>([]);
  const [selOut, setSelOut] = useState<string | null>(null);
  const feedEnd = useRef<HTMLDivElement>(null);

  const start = useCallback(async () => {
    setPhase("loading"); setErr(null);
    try {
      const r = await fetch("/api/match/live/first-half", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId, userClubId: userClub, kind, competitionId, lineup: lineup.filter(Boolean), tactic }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? c.error); setPhase("error"); return; }
      setA(d); setEvAll(d.events1 ?? []); setMs(d.state); setCurTactic(tactic); setMinute(0); setPhase("h1");
    } catch { setErr(c.error); setPhase("error"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, userClub, kind, competitionId]);
  useEffect(() => { start(); }, [start]);

  // ход времени
  useEffect(() => {
    if ((phase !== "h1" && phase !== "h2") || paused) return;
    const end = phase === "h1" ? 45 : 90;
    if (minute >= end) { setPhase(phase === "h1" ? "ht" : "ft"); return; }
    const id = setTimeout(() => setMinute(m => m + 1), MS_PER_MINUTE[speed]);
    return () => clearTimeout(id);
  }, [phase, minute, speed, paused]);
  useEffect(() => { feedEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [minute, phase]);

  const mine = a?.userSide as "home" | "away" | undefined;
  const effMinute = phase === "ht" ? 45 : minute;                       // на какую минуту смотрим составы
  const known = useMemo(() => evAll.filter(e => e.minute <= effMinute), [evAll, effMinute]);
  const shown = phase === "ft" ? evAll : known;
  const score = useMemo(() => ({
    home: shown.filter(e => e.type === "goal" && e.team === "home").length, away: shown.filter(e => e.type === "goal" && e.team === "away").length,
  }), [shown]);
  const skip = () => { setPaused(false); setMinute(phase === "h1" ? 45 : 90); };

  // кто на поле и на скамейке в текущую минуту (с учётом красных, травм и замен по ходу матча)
  const startXI: any[] = a?.startXI ?? a?.onPitch ?? [];
  const benchAll: any[] = a?.benchAll ?? a?.bench ?? [];
  const squadNow = useMemo(() => (a && mine) ? lineupAfterEvents(startXI, benchAll, known, mine) : { on: [] as any[], bench: [] as any[] }, [a, mine, known, startXI, benchAll]);
  const entry = useMemo(() => mine ? entryMinutes(known, mine, startXI.map((p: any) => p.id)) : new Map<string, number>(), [known, mine, startXI]);
  const fitNow = (p: any) => Math.max(0, Math.min(100, (p.fitness ?? 100) - inMatchDrain(Math.max(0, effMinute - (entry.get(p.id) ?? 0)))));
  const used = new Set(subs.flatMap(x => [x.outId, x.inId]));        // игроки, уже занятые в запланированных заменах
  const usedSubs = mine ? subsUsed(known, mine) : 0;
  const subsLeft = MAX_TOTAL_SUBS - usedSubs - subs.length;
  const showPanel = phase === "ht" || ((phase === "h1" || phase === "h2") && paused);
  const planned = subs.length > 0 || tactic2 !== curTactic;

  const pickBench = (inId: string) => {
    if (!selOut || subsLeft <= 0) return;
    const out = squadNow.on.find((p: any) => p.id === selOut), inn = squadNow.bench.find((p: any) => p.id === inId);
    if (!out || !inn || (out.position === "GK") !== (inn.position === "GK")) return;
    setSubs(x => [...x.filter(y => y.outId !== selOut && y.inId !== inId), { outId: selOut, inId }]); setSelOut(null);
  };

  /** Отправляет изменения на сервер: остаток тайма (на перерыве — весь второй тайм) считается заново. */
  const applyChanges = async () => {
    const atHalftime = phase === "ht";
    if (!atHalftime && !planned) { setPaused(false); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/match/live/change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: ms, minute: effMinute, tactic: tactic2, subs }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error === "No substitutions left" ? c.noSubsLeft : (d.error ?? c.error)); setBusy(false); return; }
      setEvAll(d.events); setMs(d.state); setCurTactic(tactic2); setSubs([]); setSelOut(null);
      if (atHalftime) { setMinute(45); setPhase("h2"); } else setPaused(false);
    } catch { setErr(c.error); }
    setBusy(false);
  };
  const finalGoals = { home: evAll.filter(e => e.type === "goal" && e.team === "home").length, away: evAll.filter(e => e.type === "goal" && e.team === "away").length };
  const finish = () => a && onComplete({ override: { home: a.home, away: a.away, homeGoals: finalGoals.home, awayGoals: finalGoals.away, events: evAll }, lineup: a.lineupUsed });

  // ── подписи ──
  const evView = (e: any) => {
    const team = e.team === "home" ? a?.home : a?.away;
    if (e.type === "goal") return { icon: ic.scorer, title: `${c.goal}! ${e.player}`, sub: e.assistPlayer ? `${ic.assist} ${c.assist}: ${e.assistPlayer}` : team, color: accent };
    if (e.type === "yellow") return { icon: "🟨", title: `${c.yellow}: ${e.player}`, sub: team, color: "#eab308" };
    if (e.type === "red") return { icon: "🟥", title: `${c.red}: ${e.player}`, sub: team, color: "#ef4444" };
    if (e.type === "injury") return { icon: "✚", title: `${c.injury}: ${e.player}`, sub: team, color: "#ef4444" };
    return { icon: "⇄", title: `${c.subIn}: ${e.player2}`, sub: `${c.subOut}: ${e.player} · ${team}`, color: "#22c55e" };
  };
  const resultText = !a ? "" : score.home === score.away ? c.draw : c.winner(score.home > score.away ? a.home : a.away);
  const clock = phase === "ht" ? c.halftime : phase === "ft" ? c.fulltime : phase === "loading" ? "…" : c.minute(minute);
  const headerLabel = phase === "h1" ? c.half1 : phase === "h2" ? c.half2 : phase === "ht" ? c.halftime : "";

  return (
    <div className={`fixed inset-0 z-[1300] flex items-center justify-center p-2 sm:p-4 ${t.overlay}`} style={{ backdropFilter: "blur(8px)" }}>
      <div className={`w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden ${t.panel} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`} style={t.font}>
        {/* Табло */}
        <div className="relative px-5 sm:px-8 pt-4 pb-5 shrink-0">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(80% 140% at 50% 0%, ${accent}26, transparent 70%)` }} />
          <div className="relative flex items-center justify-between mb-3">
            <div className={`text-[10px] font-black ${t.eyebrow}`} style={{ color: accent }}>{c.title}{a ? ` · ${a.competitionName}${a.roundName ? ` · ${a.roundName}` : ""}` : ""}</div>
            {(phase === "ft" || phase === "error" || phase === "ht") && <button onClick={onClose} aria-label={c.close} className={`w-8 h-8 flex items-center justify-center ${t.btnGhost}`}><X size={15} /></button>}
          </div>
          {a ? (
            <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <div className="flex flex-col items-center text-center min-w-0">
                <img src={getClubLogo(a.home)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-xl" onError={e => (e.currentTarget.style.display = "none")} />
                <div className={`mt-1.5 text-sm font-black leading-tight break-words max-w-full ${isM ? "uppercase tracking-wide" : ""}`} style={{ color: mine === "home" ? accent : undefined }}>{a.home}</div>
              </div>
              <div className="text-center">
                <div className={`text-4xl sm:text-6xl leading-none font-black tabular-nums ${isM ? "font-mono" : ""}`} style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, letterSpacing: "0.04em", textShadow: isM ? `0 0 22px ${accent}88` : undefined }}>{score.home} – {score.away}</div>
                <div className="mt-2 inline-flex items-center gap-2 text-[11px] font-black px-3 py-1" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 999 }}>
                  {(phase === "h1" || phase === "h2") && !paused && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-soft-pulse" />}{clock}
                </div>
                {headerLabel && <div className={`text-[10px] mt-1 ${t.muted}`}>{headerLabel}</div>}
              </div>
              <div className="flex flex-col items-center text-center min-w-0">
                <img src={getClubLogo(a.away)} alt="" className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-xl" onError={e => (e.currentTarget.style.display = "none")} />
                <div className={`mt-1.5 text-sm font-black leading-tight break-words max-w-full ${isM ? "uppercase tracking-wide" : ""}`} style={{ color: mine === "away" ? accent : undefined }}>{a.away}</div>
              </div>
            </div>
          ) : null}
          {(phase === "h1" || phase === "h2") && (
            <div className="relative mt-4">
              <div className={`h-1.5 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}><div className="h-full transition-all" style={{ width: `${(minute / 90) * 100}%`, background: accent }} /></div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-5">
          {phase === "loading" ? <div className={`py-16 text-center text-sm ${t.muted}`}>{c.preparing}</div> : null}
          {phase === "error" && (
            <div className="py-12 text-center">
              <div className="text-sm font-black mb-3" style={{ color: t.bad }}>{err ?? c.error}</div>
              <button onClick={start} className={`px-5 py-2.5 text-xs font-black ${t.btn}`}>{c.retry}</button>
            </div>
          )}

          {/* Ход матча */}
          {(phase === "h1" || phase === "h2" || phase === "ht" || phase === "ft") && (
            <div className="space-y-1.5 mt-1">
              {shown.length === 0 && <div className={`text-center text-xs py-6 ${t.muted}`}>{c.quiet}</div>}
              {shown.map((e, i) => {
                const v = evView(e); const isMine = e.team === mine;
                return (
                  <div key={i} className={`flex items-center gap-3 p-2.5 animate-fade-in-up ${t.cardAlt} ${isM ? "" : "rounded-xl"}`} style={{ borderLeft: `3px solid ${v.color}` }}>
                    <span className="text-[11px] font-black tabular-nums w-9 shrink-0" style={{ color: v.color }}>{e.minute}&apos;</span>
                    <span className="text-lg shrink-0">{v.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-black truncate ${e.type === "goal" ? "" : ""}`} style={e.type === "goal" ? { color: v.color } : undefined}>{v.title}</div>
                      <div className={`text-[10px] truncate ${t.muted}`}>{v.sub}</div>
                    </div>
                    {isMine && <span className="text-[8px] font-black px-1.5 py-0.5 shrink-0" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 4 }}>{userClub}</span>}
                  </div>
                );
              })}
              <div ref={feedEnd} />
            </div>
          )}

          {/* Панель изменений: перерыв ИЛИ пауза посреди матча */}
          {showPanel && a && (
            <div className="mt-5 space-y-4">
              <div className={`p-4 ${t.card}`} style={{ borderLeft: `3px solid ${accent}` }}>
                <div className="text-sm font-black" style={{ color: accent }}>{phase === "ht" ? c.htTitle : c.pauseTitle}{phase !== "ht" ? ` · ${c.minute(effMinute)}` : ""}</div>
                <div className={`text-[11px] mt-1 ${t.muted}`}>{phase === "ht" ? c.htHint : c.pauseHint}</div>
                {err && <div className="text-[11px] font-bold mt-2" style={{ color: t.bad }}>{err}</div>}
              </div>

              <div className={`p-4 ${t.card}`}>
                <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{c.tacticTitle} · {c.tacticNow}: {curTactic}</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(TACTICS).filter(k => k !== "Custom").map(k => (
                    <button key={k} onClick={() => setTactic2(k)} className={`px-3 py-2 text-[11px] font-black ${isM ? "" : isA ? "rounded-full" : "rounded-lg"} ${tactic2 === k ? t.btn : t.btnGhost}`}>{k}{k === curTactic ? " ✓" : ""}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${t.card} overflow-hidden`}>
                  <div className={`px-4 py-2.5 text-[10px] font-black border-b ${t.divider} ${t.eyebrow}`} style={{ color: accent }}>{c.onPitch} · {c.pickOut}</div>
                  {squadNow.on.map((p: any) => {
                    const sel = selOut === p.id; const out = subs.some(x => x.outId === p.id); const f = fitNow(p);
                    return (
                      <button key={p.id} onClick={() => !out && setSelOut(sel ? null : p.id)} disabled={out}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${t.hover} ${out ? "opacity-40" : ""}`} style={sel ? { background: `${accent}22` } : undefined}>
                        <Face name={p.name} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5"><span className={`text-[10px] ${t.muted}`}>{p.position} · {p.overall}</span>
                            <div className={`h-1 w-14 ${t.bar} rounded-full overflow-hidden`}><div className="h-full" style={{ width: `${f}%`, background: fitColor(f) }} /></div>
                            <span className="text-[9px] font-black tabular-nums" style={{ color: fitColor(f) }}>{f}%</span></div>
                        </div>
                        {out && <span className="text-[9px] font-black text-red-400">{c.subOut}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className={`${t.card} overflow-hidden`}>
                  <div className={`px-4 py-2.5 text-[10px] font-black border-b ${t.divider} ${t.eyebrow}`} style={{ color: accent }}>{c.bench} · {c.pickIn}</div>
                  {squadNow.bench.map((p: any) => {
                    const gkMismatch = !!selOut && (squadNow.on.find((x: any) => x.id === selOut)?.position === "GK") !== (p.position === "GK");
                    const inn = used.has(p.id);
                    return (
                      <button key={p.id} onClick={() => pickBench(p.id)} disabled={!selOut || inn || gkMismatch || subsLeft <= 0}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${t.hover} disabled:opacity-40`}>
                        <Face name={p.name} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black truncate">{p.name}</div>
                          <div className="flex items-center gap-1.5"><span className={`text-[10px] ${t.muted}`}>{p.position} · {p.overall}</span>
                            <div className={`h-1 w-14 ${t.bar} rounded-full overflow-hidden`}><div className="h-full" style={{ width: `${p.fitness ?? 100}%`, background: fitColor(p.fitness ?? 100) }} /></div>
                            <span className="text-[9px] font-black tabular-nums" style={{ color: fitColor(p.fitness ?? 100) }}>{p.fitness ?? 100}%</span></div>
                        </div>
                        {inn && <span className="text-[9px] font-black text-emerald-400">{c.subIn}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 ${t.card}`}>
                <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{c.subsTitle} · {subsLeft > 0 ? c.subsLeft(subsLeft) : c.noSubsLeft}</div>
                {subs.length === 0 ? <div className={`text-xs ${t.muted}`}>{c.subsEmpty}</div> : (
                  <div className="space-y-1.5">
                    {subs.map(x => {
                      const o = squadNow.on.find((p: any) => p.id === x.outId), i = squadNow.bench.find((p: any) => p.id === x.inId);
                      return (
                        <div key={x.outId} className={`flex items-center gap-2 p-2 ${t.cardAlt} ${isM ? "" : "rounded-lg"}`}>
                          <span className="text-red-400 text-[11px] font-black">↓ {o?.name}</span><span className={t.muted}>→</span><span className="text-emerald-400 text-[11px] font-black">↑ {i?.name}</span>
                          <button onClick={() => setSubs(y => y.filter(z => z.outId !== x.outId))} className={`ml-auto px-2 py-1 text-[10px] font-black ${t.btnGhost}`}>{c.remove}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selOut && <div className="text-[10px] mt-2" style={{ color: accent }}>{c.subsHint} {squadNow.on.find((p: any) => p.id === selOut)?.position === "GK" ? c.gkRule : ""}</div>}
              </div>

              <button onClick={applyChanges} disabled={busy} className={`w-full py-3.5 text-sm font-black disabled:opacity-60 ${t.btn}`} style={{ boxShadow: `0 10px 28px ${accent}55` }}>
                {busy ? c.applying : phase === "ht" ? `${c.startSecond} →` : planned ? `${c.applyResume} →` : `${c.resumeNoChange} →`}
              </button>
            </div>
          )}

          {phase === "ft" && a && (
            <div className="mt-5 text-center space-y-3">
              {ms?.oppTactic && ms.oppTactic !== a.oppTactic && <div className={`text-[11px] ${t.muted}`}>{c.oppAdapted(ms.oppTactic)}</div>}
              <div className="text-lg font-black" style={{ color: accent }}>{resultText}</div>
              <div className={`text-[11px] ${t.muted}`}>{c.ftHint}</div>
              <button onClick={finish} className={`px-8 py-3.5 text-sm font-black ${t.btn}`} style={{ boxShadow: `0 10px 28px ${accent}55` }}>{c.ftFinish} →</button>
            </div>
          )}
        </div>

        {/* Управление ходом матча */}
        {(phase === "h1" || phase === "h2") && (
          <div className={`shrink-0 flex items-center justify-center gap-2 px-4 py-3 border-t ${t.divider}`}>
            <button onClick={() => setPaused(p => !p)} className={`px-4 py-2 text-[11px] font-black flex items-center gap-1.5 ${t.btnGhost}`}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? c.resume : c.pause}</button>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] mr-1 ${t.muted}`}>{c.speed}</span>
              {["1×", "3×", "10×"].map((s, i) => <button key={s} onClick={() => setSpeed(i)} className={`px-2.5 py-2 text-[11px] font-black ${speed === i ? t.btn : t.btnGhost}`}>{s}</button>)}
            </div>
            <button onClick={skip} className={`px-4 py-2 text-[11px] font-black flex items-center gap-1.5 ${t.btnGhost}`}><FastForward size={13} />{c.skip}</button>
          </div>
        )}
      </div>
    </div>
  );
}
export default LiveMatch;
