"use client";
// components/dashboard/MatchHero.tsx — главная карточка «Ближайший матч»:
// два герба лицом к лицу, турнир/раунд, дом/гости, дата, большие кнопки.
import { getClubLogo } from "@/data/clublogos";
import { getDash } from "@/lib/i18nDash";
import { pageTheme } from "@/lib/pageTheme";
import { icons } from "@/lib/themeFlavor";
import { Zap } from "lucide-react";
import type { ReactNode } from "react";

export interface MatchHeroProps {
  theme: string; locale: "en" | "ru"; glowColor: string; userClub: string;
  home: string; away: string;
  competition: string; competitionType: "league" | "domestic_cup" | "continental" | "super_cup";
  round?: string; dateLabel?: string;
  playLabel: string; playingLabel: string; playing: boolean; playDisabled: boolean; onPlay: () => void;
  seasonBtn?: { label: string; disabled: boolean; onClick: () => void; title?: string };
  help?: ReactNode;
}

export function MatchHero(p: MatchHeroProps) {
  const t = pageTheme(p.theme); const d = getDash(p.locale, p.theme); const ic = icons(p.theme);
  const isA = p.theme === "aurora", isM = p.theme === "maleficent";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : p.glowColor;
  const userHome = p.home === p.userClub;
  const compIcon = p.competitionType === "league" ? ic.league : p.competitionType === "continental" ? ic.continental : p.competitionType === "super_cup" ? ic.super : ic.cup;

  const side = (club: string, mine: boolean, tag: string) => (
    <div className="flex flex-col items-center text-center min-w-0 flex-1 gap-2">
      <div className="relative">
        <div className={`absolute inset-0 blur-2xl ${mine ? "opacity-60" : "opacity-20"} ${isM ? "" : "rounded-full"}`} style={{ background: mine ? accent : "#94a3b8" }} />
        <div className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center ${isM ? "" : isA ? "rounded-full" : "rounded-3xl"}`}
          style={{ background: mine ? `${accent}18` : "rgba(148,163,184,0.08)", border: `${isM ? 1 : 2}px solid ${mine ? accent + "66" : "rgba(148,163,184,0.25)"}`, boxShadow: mine ? `0 8px 30px ${accent}33` : undefined }}>
          <img src={getClubLogo(club)} alt="" className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg" onError={e => (e.currentTarget.style.display = "none")} />
        </div>
      </div>
      <div className={`text-sm sm:text-base font-black leading-tight break-words max-w-full ${isM ? "uppercase tracking-wide" : ""} ${isA ? "italic" : ""}`} style={{ color: mine ? accent : undefined }}>{club}</div>
      <div className={`text-[9px] font-black ${t.eyebrow} ${t.muted}`}>{tag}</div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden p-5 sm:p-7 animate-fade-in-up ${t.hero} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${accent}1f, transparent 70%)` }} />
      {isM && ["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map(c => (
        <span key={c} className={`absolute w-4 h-4 ${c} pointer-events-none`} style={{ borderColor: accent }} />
      ))}

      {/* Шапка: турнир · раунд · дата */}
      <div className="relative flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black min-w-0 ${t.eyebrow} ${isM ? "border" : "rounded-full"}`} style={{ background: `${accent}18`, color: accent, borderColor: `${accent}55` }}>
          <span>{compIcon}</span><span className="truncate max-w-[220px]">{p.competition}{p.round ? ` · ${p.round}` : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          {p.dateLabel && <span className={`text-[11px] font-bold ${t.muted}`}>{d.kickoff}: <b className={t.text}>{p.dateLabel}</b></span>}
          {p.help}
        </div>
      </div>

      {/* Герб против герба */}
      <div className="relative flex items-center gap-3 sm:gap-6">
        {side(p.home, userHome, d.home)}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className={`text-2xl sm:text-3xl font-black ${isM ? "font-mono" : ""} ${isA ? "italic" : ""}`}
            style={{ color: accent, fontFamily: p.theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, textShadow: `0 0 20px ${accent}77` }}>{d.vs}</div>
          <div className={`h-10 w-px`} style={{ background: `linear-gradient(${accent}, transparent)` }} />
        </div>
        {side(p.away, !userHome, d.away)}
      </div>

      {/* Действия */}
      <div className="relative mt-6 flex items-center gap-2.5 flex-wrap justify-center">
        <button onClick={p.onPlay} disabled={p.playDisabled}
          className={`px-8 py-3.5 font-black text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-[1.03] active:scale-[0.98] ${t.btn}`}
          style={{ boxShadow: p.playDisabled ? undefined : `0 10px 30px ${accent}55` }}>
          <Zap size={16} />{p.playing ? p.playingLabel : p.playLabel}
        </button>
        {p.seasonBtn && (
          <button onClick={p.seasonBtn.onClick} disabled={p.seasonBtn.disabled} title={p.seasonBtn.title}
            className={`px-5 py-3.5 font-black text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-[1.03] border ${isM ? "" : "rounded-xl"}`}
            style={{ borderColor: `${accent}55`, color: accent, background: `${accent}10` }}>
            ⏩ {p.seasonBtn.label}
          </button>
        )}
      </div>
    </div>
  );
}
export default MatchHero;
