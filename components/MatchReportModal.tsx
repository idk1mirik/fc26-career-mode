"use client";
/* eslint-disable react-hooks/static-components -- внутренние части окна не держат собственного состояния (состояние окна — только вкладка и сторона), пересоздание при смене вкладки безвредно */
// components/MatchReportModal.tsx — окно после матча «как на SofaScore»:
//   • шапка: турнир, дата, гербы, большой счёт, статус (FT/пенальти), бомбардиры по сторонам;
//   • вкладки: События / Составы / Статистика / Оценки игроков;
//   • «Составы» — поле с расстановкой в той же системе координат, что вкладка «Состав»
//     (формация подбирается по позициям, игроки встают на слоты), у каждого игрока
//     оценка-бейдж, значки голов/ассистов/карточек/замены, ниже — скамейка запасных;
//   • «Статистика» — полосы «хозяева — гости» (владение, xG, удары, …) в стиле SofaScore.
// Оформление и тексты — под три темы игры.
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { pageTheme } from "@/lib/pageTheme";
import { getMatchCopy } from "@/lib/i18nMatch";
import { icons } from "@/lib/themeFlavor";
import { Stars } from "@/components/ThemeBits";
import { ratingColor, layoutLineup, playerBadges, scorersOf, buildTimeline, derivedStats, playerOfTheMatch, teamAvgRating, type Side } from "@/lib/matchView";
import { formatGameDate } from "@/lib/seasonLabel";

type Tab = "details" | "lineups" | "stats" | "players";

function RatingBadge({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  if (!(value > 0)) return null;
  const cls = size === "lg" ? "text-base px-2.5 py-1" : size === "sm" ? "text-[9px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return <span className={`inline-block rounded-md font-black text-white leading-none shadow ${cls}`} style={{ background: ratingColor(value) }}>{value.toFixed(1)}</span>;
}

function Photo({ name, size, ring, fallback }: { name: string; size: number; ring: string; fallback: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ width: size, height: size, border: `2px solid ${ring}`, background: "rgba(15,23,42,0.75)" }}>
      {err ? <span className="text-[10px] font-black text-white/80">{fallback}</span>
        : <img src={getPlayerPhoto(name)} alt="" className="w-full h-full object-cover object-top" onError={() => setErr(true)} />}
    </div>
  );
}

export function MatchReportModal({ fix, theme, onClose, locale = "en" }: { fix: any; ui?: any; theme: string; onClose: () => void; copy?: any; locale?: string }) {
  const t = pageTheme(theme); const m = getMatchCopy(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : t.accent;
  const events: any[] = fix.events ?? [];
  const ratings = fix.ratings ?? { home: [], away: [] };
  const homeList: any[] = ratings.home ?? [], awayList: any[] = ratings.away ?? [];
  const hasLineup = homeList.length > 0 || awayList.length > 0;
  const [tab, setTab] = useState<Tab>("details");
  const [lineSide, setLineSide] = useState<Side>("home");

  const hadET = events.some(e => e.minute > 90);
  const timeline = useMemo(() => buildTimeline(events, hadET), [events, hadET]);
  const potm = useMemo(() => playerOfTheMatch(homeList, awayList), [homeList, awayList]);
  const teamStats = ratings.teamStats ?? null;
  const derived = useMemo(() => derivedStats(ratings, events), [ratings, events]);

  const clubOf = (s: Side) => s === "home" ? fix.home_club : fix.away_club;
  const sideColor = (s: Side) => s === "home" ? accent : "#38bdf8";
  const dateText = fix.match_date ? formatGameDate(fix.match_date, 1, (locale === "ru" ? "ru" : "en")) : null;

  const lineList = lineSide === "home" ? homeList : awayList;
  const starters = lineList.filter(p => p.subbedIn !== true);
  const bench = lineList.filter(p => p.subbedIn === true);
  const layout = useMemo(() => layoutLineup(starters), [starters]);

  // ── события: иконка и подпись ──
  const eventIcon = (e: any) => e.type === "goal" ? ic.scorer : e.type === "injury" ? "✚" : e.type === "substitution" ? "⇄" : null;
  const eventLabel = (e: any) => e.type === "goal" ? m.goal : e.type === "yellow" ? m.yellowCard : e.type === "red" ? m.redCard : e.type === "injury" ? m.injury : m.subIn;

  const Card = ({ color }: { color: string }) => <span className="inline-block w-2.5 h-3.5 rounded-[2px]" style={{ background: color }} />;

  // ── поле ──
  const pitchBg = isA ? "linear-gradient(180deg,#bbf7d0,#86efac 50%,#a7f3d0)" : isM ? "linear-gradient(180deg,#1a0b2e,#12071f 50%,#1a0b2e)" : "linear-gradient(180deg,#15803d,#166534 50%,#15803d)";
  const lineClr = isM ? "rgba(232,121,249,0.45)" : "rgba(255,255,255,0.55)";
  const Pitch = () => (
    <div className={`relative w-full max-w-[460px] mx-auto overflow-hidden ${isM ? "" : "rounded-2xl"}`} style={{ aspectRatio: "68 / 100", background: pitchBg, border: `1px solid ${isM ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.25)"}`, boxShadow: isM ? "0 0 30px rgba(168,85,247,0.2)" : "0 12px 40px rgba(0,0,0,0.3)" }}>
      {/* полосы газона */}
      {!isM && Array.from({ length: 10 }, (_, i) => <div key={i} className="absolute inset-x-0" style={{ top: `${i * 10}%`, height: "10%", background: i % 2 ? "rgba(255,255,255,0.045)" : "transparent" }} />)}
      <svg viewBox="0 0 68 100" className="absolute inset-0 w-full h-full" fill="none" stroke={lineClr} strokeWidth="0.35">
        <rect x="2" y="2" width="64" height="96" />
        <line x1="2" y1="50" x2="66" y2="50" /><circle cx="34" cy="50" r="8" /><circle cx="34" cy="50" r="0.5" fill={lineClr} />
        <rect x="14" y="2" width="40" height="16" /><rect x="24" y="2" width="20" height="6" />
        <rect x="14" y="82" width="40" height="16" /><rect x="24" y="92" width="20" height="6" />
        <path d="M 26 18 A 8 8 0 0 0 42 18" /><path d="M 26 82 A 8 8 0 0 1 42 82" />
      </svg>
      <div className="absolute top-2 left-3 text-[10px] font-black text-white/80 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }}>{layout.formation}</div>
      <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[10px] font-black text-white/90 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.35)" }}>
        <img src={getClubLogo(clubOf(lineSide))} alt="" className="w-3.5 h-3.5 object-contain" /> {clubOf(lineSide)}
      </div>
      {layout.slots.map((s, i) => {
        const p = s.player; if (!p) return null;
        const b = playerBadges(events, lineSide, p.name, p.playerId);
        return (
          <div key={i} className="absolute flex flex-col items-center" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)", width: 78 }}>
            <div className="relative">
              <Photo name={p.name} size={46} ring={sideColor(lineSide)} fallback={p.position ?? "?"} />
              <span className="absolute -bottom-1.5 -right-4"><RatingBadge value={p.rating} size="sm" /></span>
              {(b.goals > 0 || b.assists > 0) && (
                <span className="absolute -top-1.5 -right-3.5 flex items-center gap-0.5 text-[10px] text-white font-black rounded-full px-1 leading-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                  {b.goals > 0 && <span>{ic.scorer}{b.goals > 1 ? b.goals : ""}</span>}{b.assists > 0 && <span>{ic.assist}</span>}
                </span>
              )}
              {(b.yellow || b.red) && <span className="absolute -top-1 -left-2"><Card color={b.red ? "#ef4444" : "#facc15"} /></span>}
              {b.subOut != null && <span className="absolute -bottom-1.5 -left-4 text-[9px] font-black rounded px-1 leading-4 text-white" style={{ background: "#dc2626" }}>↓{b.subOut}&apos;</span>}
            </div>
            <span className="mt-1.5 text-[10px] font-bold text-white text-center leading-tight max-w-full truncate px-1 rounded" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{p.name.split(" ").slice(-1)[0]}</span>
          </div>
        );
      })}
    </div>
  );

  // ── полосы статистики ──
  const Bar = ({ label, h, a, fmt = (v: number) => String(v), pct = false }: { label: string; h: number; a: number; fmt?: (v: number) => string; pct?: boolean }) => {
    const total = h + a || 1; const hw = pct ? h : (h / total) * 100; const aw = pct ? a : (a / total) * 100;
    const hLead = h > a, aLead = a > h;
    return (
      <div className="py-2.5">
        <div className="flex items-center justify-between text-[13px] font-black mb-1.5">
          <span style={{ color: hLead ? accent : undefined }} className={hLead ? "" : t.muted}>{fmt(h)}</span>
          <span className={`text-[11px] font-bold ${t.muted}`}>{label}</span>
          <span style={{ color: aLead ? "#38bdf8" : undefined }} className={aLead ? "" : t.muted}>{fmt(a)}</span>
        </div>
        <div className="flex gap-1 h-1.5">
          <div className={`flex-1 flex justify-end ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}><div style={{ width: `${hw}%`, background: accent, opacity: hLead || h === a ? 1 : 0.55 }} /></div>
          <div className={`flex-1 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}><div style={{ width: `${aw}%`, background: "#38bdf8", opacity: aLead || h === a ? 1 : 0.55 }} /></div>
        </div>
      </div>
    );
  };

  const TabBtn = ({ k, label }: { k: Tab; label: string }) => (
    <button onClick={() => setTab(k)} className={`flex-1 py-3 text-[12px] font-black whitespace-nowrap px-3 transition-colors ${tab === k ? "" : t.muted}`}
      style={{ color: tab === k ? accent : undefined, borderBottom: `2.5px solid ${tab === k ? accent : "transparent"}` }}>{label}</button>
  );

  // ── ряд игрока (скамейка / оценки) ──
  const PlayerRow = ({ p, side, showStats }: { p: any; side: Side; showStats?: boolean }) => {
    const b = playerBadges(events, side, p.name, p.playerId); const st = p.stats ?? {};
    return (
      <div className={`flex items-center gap-2.5 py-2 px-2 ${t.hover}`}>
        <Photo name={p.name} size={34} ring={sideColor(side)} fallback={p.position ?? "?"} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold truncate flex items-center gap-1.5">
            {p.name}
            {b.goals > 0 && <span className="text-[11px]">{ic.scorer}{b.goals > 1 ? `×${b.goals}` : ""}</span>}
            {b.assists > 0 && <span className="text-[11px]">{ic.assist}</span>}
            {b.yellow && <Card color="#facc15" />}{b.red && <Card color="#ef4444" />}
          </div>
          <div className={`text-[10px] ${t.muted}`}>{p.position}{b.subIn != null ? ` · ↑ ${b.subIn}′` : ""}{b.subOut != null ? ` · ↓ ${b.subOut}′` : ""}</div>
        </div>
        {showStats && (
          <div className={`hidden sm:flex items-center gap-3 text-[11px] font-bold ${t.muted} tabular-nums`}>
            <span title={m.col.g}>{st.goals ?? 0}</span><span title={m.col.a}>{st.assists ?? 0}</span><span title={m.col.kp}>{st.keyPasses ?? 0}</span>
            <span title={m.col.tkl}>{st.tackles ?? 0}</span>{p.position === "GK" && <span title={m.col.sav}>{st.saves ?? 0}</span>}
            <span title={m.col.min}>{st.minutesPlayed ?? 0}&apos;</span>
          </div>
        )}
        <RatingBadge value={p.rating} />
      </div>
    );
  };

  const penalties = fix.penalties;
  const scorersHome = scorersOf(events, "home"), scorersAway = scorersOf(events, "away");
  const ScorerList = ({ list, align }: { list: ReturnType<typeof scorersOf>; align: "left" | "right" }) => (
    <div className={`text-[11px] space-y-0.5 mt-2 ${align === "right" ? "text-right" : "text-left"} ${t.muted}`}>
      {list.map(s => <div key={s.name} className="truncate">{ic.scorer} <span className={t.text}>{s.name.split(" ").slice(-1)[0]}</span> {s.minutes.map(x => `${x}'`).join(", ")}</div>)}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 ${t.overlay}`} style={{ backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className={`w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden ${t.panel} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`} style={t.font} onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="relative px-5 sm:px-8 pt-4 pb-5 shrink-0">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(80% 140% at 50% 0%, ${accent}22, transparent 70%)` }} />
          <div className="relative flex items-center justify-between gap-3 mb-4">
            <div className={`text-[10px] font-black truncate ${t.eyebrow} ${t.muted}`}>{fix.competition_name ?? "League"}{fix.round_name ? ` · ${fix.round_name}` : ""}{dateText ? ` · ${dateText}` : ""}</div>
            <button onClick={onClose} aria-label={m.close} className={`w-8 h-8 shrink-0 flex items-center justify-center ${t.btnGhost}`}><X size={15} /></button>
          </div>
          <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
            <div className="flex flex-col items-center text-center min-w-0">
              <img src={getClubLogo(fix.home_club)} alt="" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-xl" onError={e => (e.currentTarget.style.display = "none")} />
              <div className={`mt-2 text-sm sm:text-base font-black leading-tight break-words max-w-full ${isM ? "uppercase tracking-wide" : ""}`}>{fix.home_club}</div>
              <ScorerList list={scorersHome} align="right" />
            </div>
            <div className="text-center pt-1">
              <div className={`text-4xl sm:text-5xl leading-none font-black tabular-nums ${isM ? "font-mono" : ""}`} style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, letterSpacing: "0.04em", textShadow: isM ? `0 0 22px ${accent}88` : undefined }}>
                {fix.home_goals} – {fix.away_goals}
              </div>
              <div className="mt-2 inline-block text-[10px] font-black px-2.5 py-1" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 999 }}>{hadET ? m.et : m.ft}</div>
              {penalties && <div className={`text-[11px] font-black mt-1.5 ${t.muted}`}>{m.pens} {penalties.homeScore}–{penalties.awayScore}</div>}
            </div>
            <div className="flex flex-col items-center text-center min-w-0">
              <img src={getClubLogo(fix.away_club)} alt="" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-xl" onError={e => (e.currentTarget.style.display = "none")} />
              <div className={`mt-2 text-sm sm:text-base font-black leading-tight break-words max-w-full ${isM ? "uppercase tracking-wide" : ""}`}>{fix.away_club}</div>
              <ScorerList list={scorersAway} align="left" />
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className={`flex shrink-0 border-y ${t.divider} overflow-x-auto`}>
          <TabBtn k="details" label={m.details} /><TabBtn k="lineups" label={m.lineups} /><TabBtn k="stats" label={m.stats} /><TabBtn k="players" label={m.players} />
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5">
          {/* ── События ── */}
          {tab === "details" && (
            <div>
              {potm && (
                <div className={`flex items-center gap-3 p-3 mb-5 ${t.cardAlt}`} style={{ boxShadow: `0 0 0 1px ${ratingColor(potm.player.rating)}55` }}>
                  <Photo name={potm.player.name} size={48} ring={ratingColor(potm.player.rating)} fallback={potm.player.position ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[9px] font-black ${t.eyebrow} ${t.muted}`}>{ic.awards} {m.potm}</div>
                    <div className="text-sm font-black truncate">{potm.player.name}</div>
                    <div className={`text-[10px] flex items-center gap-1 ${t.muted}`}><img src={getClubLogo(clubOf(potm.side))} alt="" className="w-3.5 h-3.5 object-contain" />{clubOf(potm.side)}</div>
                  </div>
                  <div className="text-right"><RatingBadge value={potm.player.rating} size="lg" /><div className="mt-1"><Stars value={Math.max(0, (potm.player.rating - 5) * 1.25)} theme={theme} size={9} /></div></div>
                </div>
              )}

              {events.length === 0 ? <div className={`text-center text-sm py-8 ${t.muted}`}>{m.noEvents}</div> : (
                <div className="relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: `${accent}33` }} />
                  {timeline.map((it, i) => it.kind === "marker" ? (
                    <div key={i} className="relative flex justify-center py-2">
                      <span className="text-[10px] font-black px-3 py-1" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 999 }}>{it.label === "HT" ? m.ht : it.label === "ET" ? m.et : m.ft}</span>
                    </div>
                  ) : (
                    <div key={i} className="relative grid grid-cols-[1fr_44px_1fr] items-center py-1.5">
                      <div className={`pr-3 text-right ${it.e.team === "home" ? "" : "invisible"}`}><EventBody e={it.e} /></div>
                      <div className="flex justify-center"><span className="text-[10px] font-black px-1.5 py-0.5 tabular-nums" style={{ background: "var(--ev-bg, rgba(15,23,42,0.85))", color: "#fff", borderRadius: isM ? 0 : 6, border: `1px solid ${it.e.team === "home" ? accent : "#38bdf8"}` }}>{it.e.minute}&apos;</span></div>
                      <div className={`pl-3 text-left ${it.e.team === "away" ? "" : "invisible"}`}><EventBody e={it.e} /></div>
                    </div>
                  ))}
                </div>
              )}

              {penalties?.kicks?.length > 0 && (
                <div className={`mt-6 p-4 ${t.cardAlt}`}>
                  <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{m.shootout} · {penalties.homeScore}–{penalties.awayScore}</div>
                  <div className="space-y-1">
                    {penalties.kicks.map((k: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span style={{ color: k.scored ? t.good : t.bad }}>{k.scored ? "●" : "✕"}</span>
                        <span className="font-bold">{k.player}</span><span className={t.muted}>({k.team === "home" ? fix.home_club : fix.away_club})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Составы ── */}
          {tab === "lineups" && (!hasLineup ? <div className={`text-center text-sm py-10 ${t.muted}`}>{m.noLineup}</div> : (
            <div>
              <div className="flex gap-2 justify-center mb-4">
                {(["home", "away"] as Side[]).map(s => (
                  <button key={s} onClick={() => setLineSide(s)} className={`flex items-center gap-2 px-4 py-2 text-[12px] font-black ${isM ? "" : "rounded-full"} ${lineSide === s ? "" : t.btnGhost}`}
                    style={lineSide === s ? { background: `${sideColor(s)}22`, color: sideColor(s), border: `1px solid ${sideColor(s)}66`, boxShadow: `0 0 18px ${sideColor(s)}33` } : undefined}>
                    <img src={getClubLogo(clubOf(s))} alt="" className="w-4 h-4 object-contain" />{clubOf(s)}
                    <RatingBadge value={teamAvgRating(s === "home" ? homeList : awayList)} size="sm" />
                  </button>
                ))}
              </div>
              <Pitch />
              {bench.length > 0 && (
                <div className={`mt-5 ${t.card} overflow-hidden`}>
                  <div className={`px-4 py-2.5 text-[10px] font-black ${t.eyebrow} ${t.muted} border-b ${t.divider}`}>{m.substitutes}</div>
                  {bench.map((p, i) => <PlayerRow key={i} p={p} side={lineSide} />)}
                </div>
              )}
            </div>
          ))}

          {/* ── Статистика ── */}
          {tab === "stats" && (
            <div>
              <div className={`text-center text-[11px] font-black mb-1 ${t.eyebrow} ${t.muted}`}>{m.matchStats}</div>
              <div className={`flex items-center justify-between text-[11px] font-black mb-1`}>
                <span className="flex items-center gap-1.5" style={{ color: accent }}><img src={getClubLogo(fix.home_club)} alt="" className="w-4 h-4 object-contain" />{fix.home_club}</span>
                <span className="flex items-center gap-1.5" style={{ color: "#38bdf8" }}>{fix.away_club}<img src={getClubLogo(fix.away_club)} alt="" className="w-4 h-4 object-contain" /></span>
              </div>
              <div className={`divide-y ${t.divider}`}>
                {teamStats && <>
                  <Bar label={m.possession} h={teamStats.home.possession} a={teamStats.away.possession} fmt={v => `${v}%`} pct />
                  <Bar label={m.xg} h={teamStats.home.xg} a={teamStats.away.xg} fmt={v => v.toFixed(2)} />
                  <Bar label={m.shots} h={teamStats.home.shots} a={teamStats.away.shots} />
                  <Bar label={m.shotsOn} h={teamStats.home.shotsOnTarget} a={teamStats.away.shotsOnTarget} />
                  <Bar label={m.corners} h={teamStats.home.corners} a={teamStats.away.corners} />
                  <Bar label={m.passes} h={teamStats.home.passes} a={teamStats.away.passes} />
                  <Bar label={m.passAcc} h={teamStats.home.passAccuracy} a={teamStats.away.passAccuracy} fmt={v => `${v}%`} pct />
                  <Bar label={m.fouls} h={teamStats.home.fouls} a={teamStats.away.fouls} />
                </>}
                {!teamStats && <Bar label={m.shotsOn} h={derived.home.shotsOnTarget} a={derived.away.shotsOnTarget} />}
                <Bar label={m.keyPasses} h={derived.home.keyPasses} a={derived.away.keyPasses} />
                <Bar label={m.tackles} h={derived.home.tackles} a={derived.away.tackles} />
                <Bar label={m.interceptions} h={derived.home.interceptions} a={derived.away.interceptions} />
                <Bar label={m.saves} h={derived.home.saves} a={derived.away.saves} />
                <Bar label={m.yellow} h={derived.home.yellow} a={derived.away.yellow} />
                <Bar label={m.red} h={derived.home.red} a={derived.away.red} />
              </div>
              {!teamStats && <div className={`text-[10px] text-center mt-3 ${t.muted}`}>{m.derivedNote}</div>}
            </div>
          )}

          {/* ── Оценки ── */}
          {tab === "players" && (!hasLineup ? <div className={`text-center text-sm py-10 ${t.muted}`}>{m.noLineup}</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["home", "away"] as Side[]).map(s => {
                const list = [...(s === "home" ? homeList : awayList)].sort((a, b) => b.rating - a.rating);
                return (
                  <div key={s} className={`${t.card} overflow-hidden`}>
                    <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${t.divider}`} style={{ borderTop: `2px solid ${sideColor(s)}` }}>
                      <img src={getClubLogo(clubOf(s))} alt="" className="w-5 h-5 object-contain" />
                      <span className="text-[12px] font-black truncate flex-1">{clubOf(s)}</span>
                      <RatingBadge value={teamAvgRating(list)} size="sm" />
                    </div>
                    {list.map((p, i) => <PlayerRow key={i} p={p} side={s} showStats />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  function EventBody({ e }: { e: any }) {
    const side: Side = e.team;
    return (
      <div className="inline-flex flex-col leading-tight" style={{ alignItems: side === "home" ? "flex-end" : "flex-start" }}>
        <div className="text-[12px] font-black flex items-center gap-1.5">
          {e.type === "yellow" && <Card color="#facc15" />}{e.type === "red" && <Card color="#ef4444" />}
          {eventIcon(e) && <span style={{ color: e.type === "injury" ? t.bad : e.type === "substitution" ? t.good : undefined }}>{eventIcon(e)}</span>}
          <span>{e.type === "substitution" ? e.player2 : e.player}</span>
        </div>
        <div className={`text-[10px] ${t.muted}`}>
          {e.type === "goal" ? (e.assistPlayer ? `${ic.assist} ${e.assistPlayer}` : m.goal)
            : e.type === "substitution" ? `↓ ${e.player}` : eventLabel(e)}
        </div>
      </div>
    );
  }
}
export default MatchReportModal;
