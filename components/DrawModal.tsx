"use client";
// components/DrawModal.tsx
// Окно жеребьёвки: показывает только что составленные пары стадии турнира
// (плей-офф ЛЧ/ЛЕ/ЛК после лиг-фазы, 1/8, 1/4, полуфинал, финал, раунды кубка
// страны). Пара клуба пользователя подсвечивается.
import { useEffect } from "react";
import { getClubLogo } from "@/data/clublogos";
import type { DrawInfo } from "@/lib/simClient";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";

const STYLES = {
  classic: { overlay: "bg-black/75", panel: "bg-[#0a0c16] border border-white/10 text-white rounded-3xl", muted: "text-white/40", row: "bg-white/[0.04] border border-white/[0.07]", mine: "bg-emerald-500/15 border border-emerald-500/50", btn: "bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl", accent: "text-emerald-400" },
  aurora: { overlay: "bg-pink-950/40", panel: "bg-white border-2 border-pink-100 text-pink-950 rounded-3xl", muted: "text-pink-900/45", row: "bg-pink-50/60 border border-pink-100", mine: "bg-violet-100 border border-violet-300", btn: "bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:opacity-90 rounded-2xl", accent: "text-violet-600" },
  maleficent: { overlay: "bg-black/85", panel: "bg-black border border-purple-900/60 text-purple-100 font-mono rounded-none", muted: "text-purple-500/60", row: "bg-purple-950/20 border border-purple-900/40", mine: "bg-fuchsia-950/40 border border-fuchsia-600", btn: "border border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-950/60 uppercase tracking-widest rounded-none", accent: "text-fuchsia-400" },
} as const;

const STAGE_RU: Record<string, string> = {
  "Playoff Round": "Стыковые матчи", "Round of 16": "1/8 финала", "Quarter-final": "1/4 финала", "Semi-final": "1/2 финала", "Final": "Финал",
  "Round of 32": "1/16 финала", "Round of 64": "1/32 финала", "League Phase": "Лига-фаза: твои соперники", "Round 1": "1-й раунд", "First Round": "1-й раунд",
};

export function DrawModal({
  draw, theme, locale, userClub, remaining, onClose,
}: { draw: DrawInfo; theme: "classic" | "aurora" | "maleficent"; locale: "en" | "ru"; userClub: string; remaining: number; onClose: () => void }) {
  const ru = locale === "ru";
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const s = STYLES[theme] ?? STYLES.classic;
  const stage = ru ? (STAGE_RU[draw.stage] ?? draw.stage) : draw.stage;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-[1200] flex items-center justify-center p-4 ${s.overlay}`} onClick={onClose}>
      <div className={`w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 shadow-2xl animate-modal-pop ${s.panel}`} onClick={e => e.stopPropagation()}>
        <div className={`text-[10px] ${isA ? "tracking-[0.25em]" : "uppercase tracking-[0.3em]"} font-black mb-1 ${s.accent}`}>{ic.draw} {fx.drawEyebrow}</div>
        <h2 className={`text-xl font-black leading-tight mb-0.5 ${isA ? "italic" : isM ? "uppercase tracking-wide" : ""}`}>{draw.competitionName}</h2>
        <div className={`text-sm font-bold mb-4 ${s.accent}`}>{stage}</div>

        <div className="space-y-2">
          {draw.pairs.map((p, i) => {
            const mine = p.home === userClub || p.away === userClub;
            return (
              <div key={i} className={`flex items-center gap-2 px-3 py-2.5 ${isM ? "" : "rounded-xl"} ${mine ? s.mine : s.row}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className={`text-sm font-bold truncate text-right ${p.home === userClub ? s.accent : ""}`}>{p.home}</span>
                  <img src={getClubLogo(p.home)} alt="" className="w-6 h-6 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
                <span className={`text-[10px] font-black uppercase shrink-0 ${mine ? s.accent : s.muted}`}>{fx.vs}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img src={getClubLogo(p.away)} alt="" className="w-6 h-6 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className={`text-sm font-bold truncate ${p.away === userClub ? s.accent : ""}`}>{p.away}</span>
                </div>
              </div>
            );
          })}
        </div>

        {draw.byes.length > 0 && (
          <div className="mt-4">
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${s.muted}`}>{ic.bye} {fx.drawDirect}</div>
            <div className="flex flex-wrap gap-1.5">
              {draw.byes.map(b => (
                <span key={b} className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold ${isM ? "" : "rounded-lg"} ${b === userClub ? s.mine : s.row}`}>
                  <img src={getClubLogo(b)} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className="truncate max-w-[130px]">{b}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className={`mt-6 w-full py-3 text-sm font-black transition-all ${s.btn}`}>
          {remaining > 0 ? fx.drawNext(remaining) : fx.drawGotIt}
        </button>
      </div>
    </div>
  );
}

export default DrawModal;
