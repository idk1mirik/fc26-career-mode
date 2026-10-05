"use client";
// components/BoardWidget.tsx — цели сезона от совета директоров и его доверие (3 темы).
import { useEffect, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";
import { Stars, SectionTitle, percentToStars } from "@/components/ThemeBits";

export function BoardWidget({ seasonId, clubId, theme, locale, refreshKey = 0, compact = false }: {
  seasonId: string; clubId: string; theme: string; locale: "en" | "ru"; refreshKey?: number; compact?: boolean;
}) {
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/board?seasonId=${seasonId}&clubId=${encodeURIComponent(clubId)}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (!cancelled && d) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [seasonId, clubId, refreshKey]);

  if (!data || !data.objectives?.length) return null;
  const conf: number = data.confidence ?? 60;
  const confColor = conf >= 65 ? t.good : conf >= 40 ? t.warn : t.bad;

  const STATUS: Record<string, { label: string; tone: string | undefined; icon: string }> = {
    achieved: { label: fx.stAchieved, tone: t.good, icon: ic.ok },
    on_track: { label: fx.stOnTrack, tone: t.good, icon: ic.track },
    at_risk: { label: fx.stAtRisk, tone: t.warn, icon: ic.risk },
    failed: { label: fx.stFailed, tone: t.bad, icon: ic.fail },
    pending: { label: fx.stPending, tone: undefined, icon: ic.pending },
  };
  const VERDICT: Record<string, string> = { excellent: fx.vExcellent, satisfied: fx.vSatisfied, concerned: fx.vConcerned, angry: fx.vAngry };

  return (
    <div className={`p-5 ${t.card} ${t.shadow} ${t.text} text-left`} style={t.font}>
      <SectionTitle theme={theme} icon={ic.board}>{fx.boardTitle}</SectionTitle>
      <div className="space-y-2">
        {data.objectives.map((o: any) => {
          const st = STATUS[o.status] ?? STATUS.pending;
          return (
            <div key={o.id} className={`flex items-start gap-2.5 p-2.5 ${t.cardAlt}`}>
              <span className="shrink-0 text-sm mt-0.5" style={isM ? { color: st.tone ?? t.accent } : undefined}>{st.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-[13px] font-bold leading-snug break-words ${isM ? "uppercase tracking-wide text-[12px]" : ""}`}>{locale === "ru" ? o.title.ru : o.title.en}</div>
                {!compact && <div className={`text-[11px] mt-0.5 ${t.muted}`}>{locale === "ru" ? o.detail.ru : o.detail.en}</div>}
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide mt-0.5 text-right max-w-[40%]" style={{ color: st.tone }}>{st.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className={`text-[10px] ${t.eyebrow} ${t.muted}`}>{fx.boardConfidence}</span>
          <span className="flex items-center gap-2 shrink-0">
            <Stars value={percentToStars(conf)} theme={theme} size={13} />
            <span className="text-sm font-black" style={{ color: confColor }}>{conf}%</span>
          </span>
        </div>
        <div className={`h-2 overflow-hidden ${t.bar} ${isM ? "" : "rounded-full"}`}>
          <div className="h-full transition-all duration-700" style={{ width: `${conf}%`, background: confColor, boxShadow: theme !== "classic" ? `0 0 12px ${confColor}88` : undefined }} />
        </div>
        {data.verdict && (
          <div className={`mt-2.5 text-sm font-black ${theme === "aurora" ? "italic" : ""}`} style={{ color: confColor }}>
            {VERDICT[data.verdict]}
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardWidget;
