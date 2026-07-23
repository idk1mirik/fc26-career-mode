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
import { getPlayerPhoto } from "@/lib/images";

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

// Разбор рейтинга по категориям — считается из РЕАЛЬНЫХ полей статистики
// игрока (голы/ассисты+пасы/защитные действия/дисциплина), в отличие от
// декоративных значений "как бы похоже на SofaScore" — тут за каждым
// делением реально стоит цифра из lib/playerRatings.ts.
function buildRatingBreakdown(stats: any): { label: string; value: number; color: string }[] {
  if (!stats) return [];
  const clamp = (v: number) => Math.max(4, Math.min(100, v));
  const attack = clamp((stats.goals ?? 0) * 45 + 15);
  const creativity = clamp((stats.assists ?? 0) * 35 + (stats.keyPasses ?? 0) * 15 + 10);
  const defense = clamp((stats.tackles ?? 0) * 12 + (stats.interceptions ?? 0) * 12 + (stats.saves ?? 0) * 18 + 10);
  const discipline = clamp(100 - (stats.mistakes ?? 0) * 30);
  return [
    { label: "Attack", value: attack, color: "#ef4444" },
    { label: "Creativity", value: creativity, color: "#3b82f6" },
    { label: "Defense", value: defense, color: "#22c55e" },
    { label: "Discipline", value: discipline, color: "#eab308" },
  ];
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
                    {e.type === "goal" && e.assistPlayer && (
                      <span className={`font-normal ${ui.muted}`}> ({e.assistPlayer})</span>
                    )}
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={() => setSelectedRatingPlayer(null)}>
            <div className={`w-full max-w-sm rounded-3xl p-6 max-h-[85vh] overflow-y-auto ${ui.card} animate-modal-pop`} onClick={e => e.stopPropagation()}>
              {/* Header — фото, имя, крупный рейтинг */}
              <div className="flex items-center gap-3 mb-5">
                <img src={getPlayerPhoto(selectedRatingPlayer.name)} alt="" className="w-14 h-14 object-contain rounded-full shrink-0"
                  style={{ background: `${ratingColor(selectedRatingPlayer.rating)}12`, border: `2px solid ${ratingColor(selectedRatingPlayer.rating)}40` }}
                  onError={e => (e.currentTarget.style.display = "none")} />
                <div className="flex-1 min-w-0">
                  <div className={`text-base font-black truncate ${ui.text}`}>{selectedRatingPlayer.name}</div>
                  {selectedRatingPlayer.stats?.minutesPlayed != null && selectedRatingPlayer.stats.minutesPlayed < 90 && (
                    <div className={`text-[11px] ${ui.muted}`}>
                      {selectedRatingPlayer.stats.redCard ? "🟥" : "↩"} {selectedRatingPlayer.stats.redCard ? "Sent off" : "Substituted"} · {selectedRatingPlayer.stats.minutesPlayed}'
                    </div>
                  )}
                </div>
                <span className="text-xl font-display font-black px-3 py-1.5 rounded-xl shrink-0" style={{ color: ratingColor(selectedRatingPlayer.rating), background: `${ratingColor(selectedRatingPlayer.rating)}18` }}>
                  {selectedRatingPlayer.rating.toFixed(1)}
                </span>
              </div>

              {/* Минуты — отдельной строкой, как в SofaScore */}
              <div className={`flex items-center gap-2.5 mb-5 pb-5 border-b ${ui.divider}`}>
                <span className="text-base">⏱</span>
                <span className={`text-sm flex-1 ${ui.muted}`}>{copy.dashMinutesPlayed ?? "Minutes played"}</span>
                <span className={`text-sm font-black ${ui.text}`}>{selectedRatingPlayer.stats?.minutesPlayed ?? 90}'</span>
              </div>

              {/* Разбор рейтинга — реальные категории на основе фактических статов
                  (голы/ассисты+пасы/защита/дисциплина), не выдуманные значения */}
              <div className="mb-5">
                <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${ui.muted}`}>
                  {copy.dashRatingBreakdown ?? "Rating breakdown"}
                </div>
                <div className="space-y-3">
                  {buildRatingBreakdown(selectedRatingPlayer.stats).map(({ label, value, color }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${ui.text}`}>{label}</span>
                      </div>
                      <div className={`h-1.5 rounded-full ${ui.badge}`}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Компактные плашки статистики */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: "goals", label: "G", icon: "⚽" },
                  { key: "assists", label: "A", icon: "🎯" },
                  { key: "keyPasses", label: "KP", icon: "🔑" },
                  { key: "saves", label: "SV", icon: "🧤" },
                  { key: "tackles", label: "TK", icon: "🛡" },
                  { key: "interceptions", label: "INT", icon: "✋" },
                  { key: "mistakes", label: "MIS", icon: "⚠️" },
                ].filter(s => (selectedRatingPlayer.stats?.[s.key] ?? undefined) !== undefined && !(s.key === "saves" && !selectedRatingPlayer.stats?.saves) && !(s.key === "mistakes" && !selectedRatingPlayer.stats?.mistakes))
                  .map(s => (
                    <div key={s.key} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl ${ui.tableRow}`}>
                      <span className="text-sm">{s.icon}</span>
                      <span className={`text-base font-display font-black ${ui.text}`}>{selectedRatingPlayer.stats[s.key]}</span>
                      <span className={`text-[8px] uppercase font-black tracking-widest ${ui.muted}`}>{s.label}</span>
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
