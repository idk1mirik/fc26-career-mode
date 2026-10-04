"use client";
// components/BoardWidget.tsx — цели сезона от совета директоров и его доверие.
import { useEffect, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";

const STATUS: Record<string, { en: string; ru: string; tone: "good" | "warn" | "bad" | "muted"; icon: string }> = {
  achieved: { en: "Done", ru: "Выполнено", tone: "good", icon: "✅" },
  on_track: { en: "On track", ru: "Идём по плану", tone: "good", icon: "🟢" },
  at_risk: { en: "At risk", ru: "Под угрозой", tone: "warn", icon: "🟠" },
  failed: { en: "Failed", ru: "Провалено", tone: "bad", icon: "❌" },
  pending: { en: "Too early", ru: "Рано судить", tone: "muted", icon: "⏳" },
};
const VERDICT = {
  excellent: { en: "The board is delighted", ru: "Совет директоров в восторге" },
  satisfied: { en: "The board is satisfied", ru: "Совет директоров доволен" },
  concerned: { en: "The board is concerned", ru: "Совет директоров обеспокоен" },
  angry: { en: "The board is furious", ru: "Совет директоров в ярости" },
} as const;

export function BoardWidget({ seasonId, clubId, theme, locale, refreshKey = 0, compact = false }: {
  seasonId: string; clubId: string; theme: string; locale: "en" | "ru"; refreshKey?: number; compact?: boolean;
}) {
  const t = pageTheme(theme);
  const ru = locale === "ru";
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
  const tone = (k: string) => k === "good" ? t.good : k === "warn" ? t.warn : k === "bad" ? t.bad : undefined;

  return (
    <div className={`p-5 ${t.card} ${t.text} text-left`} style={t.font}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <div className={`text-[10px] uppercase tracking-widest font-black flex-1 ${t.muted}`}>{ru ? "Цели от совета директоров" : "Board objectives"}</div>
      </div>
      <div className="space-y-2">
        {data.objectives.map((o: any) => {
          const st = STATUS[o.status] ?? STATUS.pending;
          return (
            <div key={o.id} className={`flex items-start gap-2.5 p-2.5 ${t.cardAlt}`}>
              <span className="shrink-0 text-sm mt-0.5">{st.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold leading-snug break-words">{ru ? o.title.ru : o.title.en}</div>
                {!compact && <div className={`text-[11px] mt-0.5 ${t.muted}`}>{ru ? o.detail.ru : o.detail.en}</div>}
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide mt-0.5" style={{ color: tone(st.tone) }}>{ru ? st.ru : st.en}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] uppercase tracking-widest ${t.muted}`}>{ru ? "Доверие руководства" : "Board confidence"}</span>
          <span className="text-sm font-black" style={{ color: confColor }}>{conf}%</span>
        </div>
        <div className={`h-2 overflow-hidden ${t.bar} ${theme === "maleficent" ? "" : "rounded-full"}`}>
          <div className="h-full transition-all duration-700" style={{ width: `${conf}%`, background: confColor }} />
        </div>
        {data.verdict && (
          <div className="mt-2 text-sm font-black" style={{ color: confColor }}>
            {VERDICT[data.verdict as keyof typeof VERDICT]?.[ru ? "ru" : "en"]}
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardWidget;
