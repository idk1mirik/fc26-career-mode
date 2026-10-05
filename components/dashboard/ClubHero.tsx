"use client";
// components/dashboard/ClubHero.tsx — шапка дашборда: герб, название, кольцо
// прогресса сезона, анимированные цифры (место/очки/разница/бюджет), форма.
import { useEffect, useRef, useState } from "react";
import { getClubLogo } from "@/data/clublogos";
import { getDash } from "@/lib/i18nDash";
import { pageTheme } from "@/lib/pageTheme";

/** Плавный счётчик: число «докручивается» до нового значения. */
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = target;
    if (a === b) return;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(a + (b - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

function Ring({ pct, size = 92, stroke = 7, color, track, children }: { pct: number; size?: number; stroke?: number; color: string; track: string; children: React.ReactNode }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

const CornerBrackets = ({ color }: { color: string }) => (
  <>
    {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map(c => (
      <span key={c} className={`absolute w-3 h-3 ${c} pointer-events-none`} style={{ borderColor: color }} />
    ))}
  </>
);

export interface ClubHeroProps {
  theme: string; locale: "en" | "ru"; glowColor: string;
  clubName: string; leagueName: string; seasonText: string;
  position: number | null; totalClubs: number; zoneColor: string | null; zoneLabel: string;
  points: number; goalDiff: number; budget: number | null;
  matchday: number; totalMatchdays: number; form: string[];
}

export function ClubHero(p: ClubHeroProps) {
  const t = pageTheme(p.theme); const d = getDash(p.locale, p.theme);
  const isA = p.theme === "aurora", isM = p.theme === "maleficent";
  const pos = useCountUp(p.position ?? 0), pts = useCountUp(p.points), gd = useCountUp(p.goalDiff);
  const progress = p.totalMatchdays > 0 ? Math.min(1, (p.matchday - 1) / p.totalMatchdays) : 0;
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : p.glowColor;
  const bud = p.budget == null ? null : p.budget >= 1_000_000 ? `€${(p.budget / 1_000_000).toFixed(1)}M` : `€${Math.round(p.budget / 1000)}K`;

  const tile = (label: string, value: React.ReactNode, color?: string, sub?: React.ReactNode) => (
    <div className={`relative px-4 py-3 min-w-[84px] flex-1 ${isM ? "" : isA ? "rounded-3xl" : "rounded-2xl"} ${t.cardAlt}`}
      style={{ boxShadow: isA ? "0 6px 20px rgba(236,72,153,0.10)" : undefined }}>
      {isM && <CornerBrackets color="rgba(232,121,249,0.5)" />}
      <div className={`text-[9px] font-black ${t.eyebrow} ${t.muted}`}>{label}</div>
      <div className={`text-3xl leading-none mt-1.5 ${isM ? "font-mono font-black" : isA ? "font-black italic" : "font-black"}`}
        style={{ color: color ?? undefined, fontFamily: p.theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, textShadow: isM ? `0 0 14px ${color ?? accent}88` : undefined, fontSize: p.theme === "classic" ? "2.4rem" : undefined }}>
        {value}
      </div>
      {sub && <div className={`text-[10px] mt-1 truncate ${t.muted}`}>{sub}</div>}
    </div>
  );

  return (
    <div className={`relative overflow-hidden mb-6 p-5 sm:p-7 animate-fade-in-up ${t.hero} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`}
      style={{ borderLeft: isA ? undefined : `3px solid ${accent}` }}>
      {/* подсветка цветом клуба / темы */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: isA
        ? "radial-gradient(90% 120% at 0% 0%, rgba(244,114,182,0.18), transparent 60%), radial-gradient(70% 100% at 100% 100%, rgba(167,139,250,0.18), transparent 60%)"
        : `radial-gradient(110% 130% at 0% 0%, ${accent}22 0%, transparent 55%)` }} />
      {isM && <CornerBrackets color="rgba(232,121,249,0.55)" />}
      {isA && <span className="absolute right-6 top-4 text-lg animate-floaty-sm select-none" style={{ color: "#f9a8d4" }}>✦</span>}

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Герб + название */}
        <div className="flex items-center gap-5 min-w-0 lg:flex-[1.2]">
          <div className="relative shrink-0">
            <div className={`absolute inset-0 blur-2xl opacity-60 animate-floaty-sm ${isM ? "" : "rounded-full"}`} style={{ background: accent }} />
            <div className={`relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${isM ? "" : isA ? "rounded-full" : "rounded-3xl"}`}
              style={{ background: isA ? "linear-gradient(135deg,#fff,#fdf2f8)" : `${accent}14`, border: `${isM ? 1 : 2}px solid ${accent}${isA ? "88" : "55"}`, boxShadow: `0 0 0 6px ${accent}12, 0 10px 40px ${accent}33` }}>
              {isM && <CornerBrackets color={accent} />}
              <img src={getClubLogo(p.clubName)} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xl" onError={e => (e.currentTarget.style.display = "none")} />
            </div>
          </div>
          <div className="min-w-0">
            <div className={`text-[10px] font-black mb-1 ${t.eyebrow}`} style={{ color: accent }}>{isA && "✦ "}{p.leagueName} · {p.seasonText}</div>
            <h2 className={`leading-[0.95] break-words ${isM ? "uppercase tracking-wide font-mono font-black text-2xl sm:text-3xl" : isA ? "italic font-black text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}
              style={{
                fontFamily: p.theme === "classic" ? "'Bebas Neue',sans-serif" : isA ? "'Fraunces',serif" : undefined,
                letterSpacing: p.theme === "classic" ? "0.02em" : undefined,
                backgroundImage: isA ? "linear-gradient(90deg,#db2777,#7c3aed)" : undefined, WebkitBackgroundClip: isA ? "text" : undefined, color: isA ? "transparent" : isM ? "#f5d0fe" : undefined,
                textShadow: isM ? `0 0 20px ${accent}77` : undefined,
              }}>
              {p.clubName}{isM && <span className="animate-pulse" style={{ color: accent }}>_</span>}
            </h2>
            {p.form.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                <span className={`text-[9px] font-black mr-1 ${t.eyebrow} ${t.muted}`}>{d.form}</span>
                {p.form.map((r, i) => {
                  const col = r === "W" ? t.good : r === "L" ? t.bad : "#94a3b8";
                  return (
                    <span key={i} className={`w-6 h-6 flex items-center justify-center text-[10px] font-black animate-fade-in-up ${isM ? "" : "rounded-full"}`}
                      style={{ background: isM ? "transparent" : col, color: isM ? col : "#fff", border: isM ? `1px solid ${col}` : undefined, animationDelay: `${i * 60}ms`, boxShadow: `0 0 12px ${col}55` }}>
                      {r === "W" ? d.stripWin : r === "D" ? d.stripDraw : d.stripLoss}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Кольцо прогресса сезона */}
        <div className="flex items-center gap-4 lg:px-6 lg:border-l lg:border-r" style={{ borderColor: `${accent}22` }}>
          <Ring pct={progress} color={accent} track={isA ? "rgba(244,114,182,0.2)" : "rgba(255,255,255,0.08)"}>
            <div className={`text-2xl font-black leading-none ${isM ? "font-mono" : ""}`} style={{ color: accent }}>{Math.round(progress * 100)}%</div>
            <div className={`text-[8px] font-black mt-1 ${t.eyebrow} ${t.muted}`}>{d.matchday} {p.matchday}</div>
          </Ring>
          <div className="min-w-0 hidden sm:block">
            <div className={`text-[9px] font-black ${t.eyebrow} ${t.muted}`}>{d.seasonProgress}</div>
            <div className="text-sm font-bold mt-0.5">{Math.max(0, p.matchday - 1)} / {p.totalMatchdays}</div>
          </div>
        </div>

        {/* Плитки статистики */}
        <div className="grid grid-cols-2 gap-2.5 lg:flex-[1.3] min-w-0">
          {tile(d.position, p.position ? <>{pos}<span className={`text-xs ml-1 ${t.muted}`} style={{ fontFamily: "inherit" }}>{d.ofLeague(p.totalClubs)}</span></> : "—", p.zoneColor ?? undefined, p.zoneLabel)}
          {tile(d.points, pts, accent)}
          {tile(d.goalDiff, `${p.goalDiff > 0 ? "+" : ""}${gd}`, p.goalDiff > 0 ? t.good : p.goalDiff < 0 ? t.bad : undefined)}
          {bud != null && tile(d.budget, bud, t.good)}
        </div>
      </div>
    </div>
  );
}
export default ClubHero;
