// components/MatchReportModal.tsx
// Куда ставить: fc26_career_mode/components/MatchReportModal.tsx
//
// Вынесено из app/dashboard/page.tsx в общий компонент — раньше отчёт о
// матче (события + рейтинги игроков) можно было открыть только для
// последнего сыгранного тура ЛИГИ прямо на дашборде. Матчи кубков и
// еврокубков нигде не давали посмотреть статистику, только результат.
// Теперь компонент общий и подключается и на /fixtures.
"use client";
import { useState } from "react";
import { getClubLogo } from "@/data/clublogos";

const EVENT_ICON: Record<string, string> = {
  goal: "⚽", yellow: "🟨", red: "🟥", substitution: "🔁", injury: "🩹",
};

// did-not-finish — короткая метка для тех, кто ушёл с поля раньше 90-й минуты
function dnfBadge(stats: any) {
  if (!stats) return null;
  if (stats.minutesPlayed != null && stats.minutesPlayed < 90 && !stats.subbedIn) {
    return stats.redCard ? "🟥" : "↩";
  }
  return null;
}

export function MatchReportModal({ fix, ui, theme, onClose, copy }: { fix: any; ui: any; theme: string; onClose: () => void; copy: any }) {
  const events = fix.events ?? [];
  const ratings = fix.ratings ?? { home: [], away: [] };
  const [tab, setTab] = useState<"events" | "ratings">("events");
  const [selectedRatingPlayer, setSelectedRatingPlayer] = useState<any>(null);

  const ratingColor = (r: number) => {
    if (theme === "aurora") {
      return r >= 8.5 ? "#16a34a" : r >= 7.0 ? "#65a30d" : r >= 6.0 ? "#b45309" : r >= 5.0 ? "#c2410c" : "#dc2626";
    }
    return r >= 8.5 ? "#22c55e" : r >= 7.0 ? "#84cc16" : r >= 6.0 ? "#eab308" : r >= 5.0 ? "#f97316" : "#ef4444";
  };

  const overlayBg = theme === "aurora" ? "rgba(168,85,247,0.18)" : theme === "maleficent" ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.7)";

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: overlayBg, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className={`w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto ${ui.card} animate-fade-in`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>
            {fix.competition_name ?? copy.dashMatchReport}
          </div>
          <button onClick={onClose} className={`text-lg ${ui.muted} hover:opacity-70 transition`}>✕</button>
        </div>
        {fix.round_name && <div className={`text-[10px] ${ui.muted} mb-3`}>{fix.round_name}</div>}

        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="flex flex-col items-center gap-1 w-20">
            <img src={getClubLogo(fix.home_club)} alt="" className="w-10 h-10 object-contain" />
            <span className={`text-xs font-bold text-center ${ui.text}`}>{fix.home_club}</span>
          </div>
          <div className={`text-3xl font-display font-black ${ui.text}`}>{fix.home_goals} – {fix.away_goals}</div>
          <div className="flex flex-col items-center gap-1 w-20">
            <img src={getClubLogo(fix.away_club)} alt="" className="w-10 h-10 object-contain" />
            <span className={`text-xs font-bold text-center ${ui.text}`}>{fix.away_club}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("events")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "events" ? ui.tabActive : ui.tabIdle}`}>
            {copy.dashEvents}
          </button>
          <button onClick={() => setTab("ratings")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "ratings" ? ui.tabActive : ui.tabIdle}`}>
            {copy.dashPlayerRatings}
          </button>
        </div>

        {tab === "events" && (
          <div className="space-y-2">
            {events.length === 0 && <div className={`text-center text-sm ${ui.muted} py-4`}>No events recorded</div>}
            {events.map((e: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 py-2 px-3 rounded-xl animate-fade-in-up ${ui.tableRow}`} style={{ animationDelay: `${Math.min(i * 25, 400)}ms` }}>
                <span className={`text-xs font-black w-8 ${ui.muted}`}>{e.minute}'</span>
                <span className="text-base">{EVENT_ICON[e.type] ?? "•"}</span>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${ui.text}`}>
                    {e.type === "substitution" ? `${e.player2} ↔ ${e.player}` : e.player}
                  </div>
                  <div className={`text-[10px] ${ui.muted} capitalize`}>
                    {e.team === "home" ? fix.home_club : fix.away_club} · {e.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "ratings" && (
          <div className="space-y-5">
            {[{ label: fix.home_club, list: ratings.home ?? [] }, { label: fix.away_club, list: ratings.away ?? [] }].map(({ label, list }) => {
              const starters = list.filter((p: any) => !p.subbedIn);
              const subs = list.filter((p: any) => p.subbedIn);
              return (
                <div key={label}>
                  <div className={`text-[10px] uppercase tracking-widest font-black mb-2 flex items-center gap-1.5 ${ui.muted}`}>
                    <img src={getClubLogo(label)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {label}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {starters.length === 0 && <div className={`text-xs col-span-3 ${ui.muted}`}>No data</div>}
                    {starters.map((p: any, i: number) => {
                      const dnf = dnfBadge(p.stats);
                      return (
                        <button key={i} onClick={() => setSelectedRatingPlayer(p)}
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors card-lift ${ui.tableRow}`}>
                          <span className={`text-[11px] font-bold truncate ${ui.text} flex items-center gap-1`}>
                            {p.name}
                            {dnf && <span className="text-[9px] opacity-70" title={p.stats?.minutesPlayed ? `${p.stats.minutesPlayed}'` : ""}>{dnf}</span>}
                          </span>
                          <span className="text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1" style={{ color: ratingColor(p.rating), background: `${ratingColor(p.rating)}18` }}>
                            {p.rating.toFixed(1)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {subs.length > 0 && (
                    <div>
                      <div className={`text-[9px] uppercase tracking-widest mb-1 ${ui.muted}`}>Substitutes</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {subs.map((p: any, i: number) => (
                          <button key={i} onClick={() => setSelectedRatingPlayer(p)}
                            className={`flex items-center justify-between py-1.5 px-2 rounded-lg opacity-80 transition-colors card-lift ${ui.tableRow}`}>
                            <span className={`text-[11px] font-bold truncate ${ui.text}`}>{p.name}</span>
                            <span className="text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ml-1" style={{ color: ratingColor(p.rating), background: `${ratingColor(p.rating)}18` }}>
                              {p.rating.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedRatingPlayer && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedRatingPlayer(null)}>
            <div className={`w-full max-w-xs rounded-2xl p-5 ${ui.card} animate-fade-in-up`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-black ${ui.text}`}>{selectedRatingPlayer.name}</span>
                <span className="text-lg font-black px-2 py-0.5 rounded-md" style={{ color: ratingColor(selectedRatingPlayer.rating), background: `${ratingColor(selectedRatingPlayer.rating)}18` }}>
                  {selectedRatingPlayer.rating.toFixed(1)}
                </span>
              </div>
              {selectedRatingPlayer.stats?.minutesPlayed != null && selectedRatingPlayer.stats.minutesPlayed < 90 && (
                <div className={`text-[10px] mb-2 ${ui.muted}`}>
                  {selectedRatingPlayer.stats.redCard ? "🟥 Sent off" : "↩ Substituted"} · {selectedRatingPlayer.stats.minutesPlayed}' played
                </div>
              )}
              <div className="space-y-1.5">
                {[
                  ["Goals", selectedRatingPlayer.stats?.goals],
                  ["Assists", selectedRatingPlayer.stats?.assists],
                  ["Key Passes", selectedRatingPlayer.stats?.keyPasses],
                  ["Saves", selectedRatingPlayer.stats?.saves],
                  ["Tackles", selectedRatingPlayer.stats?.tackles],
                  ["Interceptions", selectedRatingPlayer.stats?.interceptions],
                  ["Mistakes", selectedRatingPlayer.stats?.mistakes],
                  ["Minutes", selectedRatingPlayer.stats?.minutesPlayed],
                ].filter(([, v]) => v !== undefined).map(([label, value]) => (
                  <div key={label as string} className={`flex items-center justify-between text-xs ${ui.muted}`}>
                    <span>{label}</span>
                    <span className={`font-bold ${ui.text}`}>{value as any}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
