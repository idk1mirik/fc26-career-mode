"use client";
// components/NewsWidget.tsx — слухи об интересе к твоим игрокам и трансферы ИИ-клубов.
import { useEffect, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";

const fmt = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `€${Math.round(n / 1000)}K` : `€${n}`;

export function NewsWidget({ seasonId, clubId, theme, locale, refreshKey = 0 }: {
  seasonId: string; clubId: string; theme: string; locale: "en" | "ru"; refreshKey?: number;
}) {
  const t = pageTheme(theme);
  const ru = locale === "ru";
  const [data, setData] = useState<{ transfers: any[]; rumors: any[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news?seasonId=${seasonId}&clubId=${encodeURIComponent(clubId)}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (!cancelled && d) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [seasonId, clubId, refreshKey]);

  if (!data || (data.rumors.length === 0 && data.transfers.length === 0)) return null;
  const heat = (n: number) => "🔥".repeat(n);

  return (
    <div className={`p-5 ${t.card} ${t.text} text-left`} style={t.font}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📰</span>
        <div className={`text-[10px] uppercase tracking-widest font-black ${t.muted}`}>{ru ? "Новости рынка" : "Market news"}</div>
      </div>

      {data.rumors.length > 0 && (
        <div className="mb-4">
          <div className={`text-[10px] uppercase tracking-widest mb-2 ${t.muted}`}>{ru ? "Слухи" : "Rumours"}</div>
          <div className="space-y-2">
            {data.rumors.map((r: any) => (
              <div key={r.playerId} className={`flex items-center gap-2.5 p-2.5 ${t.cardAlt}`}>
                <img src={getClubLogo(r.club)} alt="" className="w-7 h-7 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                <div className="min-w-0 flex-1 text-[12px] leading-snug">
                  <b className="break-words">{r.club}</b>{" "}
                  <span className={t.muted}>{ru ? "интересуется" : "is reportedly interested in"}</span>{" "}
                  <b className="break-words">{r.playerName}</b>
                  <span className={`block text-[10px] ${t.muted}`}>OVR {r.overall} · {fmt(r.value)}</span>
                </div>
                <span className="shrink-0 text-xs">{heat(r.heat)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.transfers.length > 0 && (
        <div>
          <div className={`text-[10px] uppercase tracking-widest mb-2 ${t.muted}`}>{ru ? "Последние трансферы" : "Latest transfers"}</div>
          <div className="space-y-1.5">
            {data.transfers.slice(0, 6).map((tr: any, i: number) => (
              <div key={i} className={`flex items-center gap-2 text-[12px] py-1.5 ${i > 0 ? `border-t ${t.divider}` : ""}`}>
                <img src={getClubLogo(tr.to_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                <div className="min-w-0 flex-1 break-words leading-snug">
                  <b>{tr.player_name}</b>{" "}
                  <span className={t.muted}>→ {tr.to_club}{tr.type === "ai_free_agent" ? (ru ? " (свободный агент)" : " (free agent)") : ""}</span>
                </div>
                <span className={`shrink-0 text-[11px] font-bold ${t.muted}`}>{tr.fee > 0 ? fmt(tr.fee) : (ru ? "бесплатно" : "free")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NewsWidget;
