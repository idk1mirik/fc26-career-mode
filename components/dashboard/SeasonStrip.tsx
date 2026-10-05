"use client";
// components/dashboard/SeasonStrip.tsx — лента матчей клуба по датам (лига + кубки):
// результат (В/Н/П) у сыгранных, ближайший выделен, дальше — будущие.
import { useEffect, useMemo, useRef } from "react";
import { getClubLogo } from "@/data/clublogos";
import { getDash } from "@/lib/i18nDash";
import { pageTheme } from "@/lib/pageTheme";
import { icons } from "@/lib/themeFlavor";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";

export function SeasonStrip({ theme, locale, calendar, userClub, onOpen }: {
  theme: string; locale: "en" | "ru"; calendar: any[]; userClub: string; onOpen?: (fix: any) => void;
}) {
  const t = pageTheme(theme); const d = getDash(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const nextRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => calendar
    .filter(m => m.home_club === userClub || m.away_club === userClub)
    .map(m => ({ ...m, _date: m.match_date ?? (m.matchday ? getLeagueMatchdayDate(m.matchday) : "9999-99-99") }))
    .sort((a, b) => a._date.localeCompare(b._date)), [calendar, userClub]);
  const nextIdx = items.findIndex(m => !m.played);

  // Лента сама прокручивается к ближайшему матчу
  // (двигаем только саму ленту, а не всю страницу — поэтому не scrollIntoView)
  useEffect(() => {
    const box = boxRef.current, el = nextRef.current;
    if (!box || !el) return;
    box.scrollTo({ left: Math.max(0, el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2), behavior: "smooth" });
  }, [nextIdx, items.length]);

  if (items.length === 0) return null;

  const resultOf = (m: any): "W" | "D" | "L" | null => {
    if (!m.played) return null;
    const mine = m.home_club === userClub ? m.home_goals : m.away_goals;
    const theirs = m.home_club === userClub ? m.away_goals : m.home_goals;
    if (mine == null || theirs == null) return null;
    return mine > theirs ? "W" : mine < theirs ? "L" : "D";
  };
  const compIcon = (m: any) => m.source !== "cup" ? ic.league : m.competition_type === "continental" ? ic.continental : m.competition_type === "super_cup" ? ic.super : ic.cup;

  return (
    <div className={`mb-6 p-4 animate-fade-in-up ${t.card} ${t.shadow}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className={`text-[10px] font-black ${t.eyebrow} ${t.muted}`}>{isA && "✦ "}{d.stripTitle}</div>
        <div className="flex items-center gap-2.5 text-[9px] font-black">
          {(["W", "D", "L"] as const).map(r => (
            <span key={r} className="flex items-center gap-1" style={{ color: r === "W" ? t.good : r === "L" ? t.bad : "#94a3b8" }}>
              <span className={`w-2 h-2 ${isM ? "" : "rounded-full"}`} style={{ background: "currentColor" }} />{r === "W" ? d.stripWin : r === "D" ? d.stripDraw : d.stripLoss}
            </span>
          ))}
        </div>
      </div>
      <div ref={boxRef} className="relative flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
        {items.map((m, i) => {
          const res = resultOf(m); const isNext = i === nextIdx;
          const opp = m.home_club === userClub ? m.away_club : m.home_club; const home = m.home_club === userClub;
          const col = res === "W" ? t.good : res === "L" ? t.bad : res === "D" ? "#94a3b8" : t.accent;
          const date = new Date(`${m._date}T00:00:00Z`);
          return (
            <div key={m.id ?? i} ref={isNext ? nextRef : undefined}
              onClick={() => m.played && onOpen?.(m)}
              className={`shrink-0 w-[78px] p-2 text-center transition-all ${m.played && onOpen ? "cursor-pointer" : ""} ${t.cardAlt} ${isM ? "" : "rounded-xl"} ${t.hover}`}
              style={{ opacity: m.played || isNext ? 1 : 0.55, boxShadow: isNext ? `0 0 0 1.5px ${t.accent}, 0 0 18px ${t.accent}44` : undefined, borderTop: res ? `2px solid ${col}` : undefined }}>
              <div className="text-[9px] leading-none mb-1.5 flex items-center justify-center gap-1" style={{ color: isNext ? t.accent : undefined }}>
                {isNext ? <b>{d.stripNext}</b> : <span className={t.muted}>{date.getUTCDate()}.{String(date.getUTCMonth() + 1).padStart(2, "0")}</span>}
              </div>
              <img src={getClubLogo(opp)} alt="" className="w-8 h-8 object-contain mx-auto" onError={e => (e.currentTarget.style.display = "none")} />
              <div className={`text-[9px] mt-1.5 truncate ${t.muted}`}>{home ? "" : "@ "}{opp}</div>
              <div className="mt-1 text-[11px] font-black leading-none flex items-center justify-center gap-1" style={{ color: res ? col : undefined }}>
                {res ? <><span>{m.home_goals}:{m.away_goals}</span></> : <span className={t.muted}>{compIcon(m)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default SeasonStrip;
