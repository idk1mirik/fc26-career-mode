"use client";
import { useEffect, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";

// Архив карьеры: сезон за сезоном + рекорды клуба за всё время.
export default function HistoryPage() {
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId = useCareerStore(s => s.seasonId);
  const club = useCareerStore(s => s.selectedClub);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const ru = locale === "ru";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated || !seasonId || !club?.name) { setLoading(false); return; }
    fetch(`/api/history?seasonId=${seasonId}&clubId=${encodeURIComponent(club.name)}`)
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [hydrated, seasonId, club?.name]);

  if (!hydrated) return null;
  const t = pageTheme(themeRaw);
  const rec = data?.records;
  const seasons: any[] = [...(data?.seasons ?? [])].reverse();
  const match = (m: any) => m ? `${m.home ? "" : "@ "}${m.opp} ${m.mine}:${m.theirs}` : "—";

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <div className={`text-[10px] uppercase tracking-widest mb-1 ${t.muted}`}>{ru ? "Архив карьеры" : "Career archive"}</div>
        <h1 className="text-2xl md:text-3xl font-display font-black mb-6 truncate">{club?.name}</h1>

        {loading ? <div className={`py-16 text-center text-sm ${t.muted}`}>{ru ? "Загрузка…" : "Loading…"}</div> : !data ? (
          <div className={`py-16 text-center text-sm ${t.card} ${t.muted}`}>{ru ? "Нет данных" : "No data"}</div>
        ) : (
          <>
            {rec && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: "🏆", label: ru ? "Титулы лиги" : "League titles", v: String(rec.leagueTitles) },
                  { icon: "🥇", label: ru ? "Лучшее место" : "Best finish", v: rec.bestFinish ? `#${rec.bestFinish}` : "—" },
                  { icon: "💥", label: ru ? "Крупнейшая победа" : "Biggest win", v: match(rec.biggestWin) },
                  { icon: "😖", label: ru ? "Крупнейшее поражение" : "Heaviest loss", v: match(rec.heaviestLoss) },
                  { icon: "🎢", label: ru ? "Самый результативный матч" : "Highest-scoring game", v: match(rec.highestScoring) },
                  { icon: "⚽", label: ru ? "Лучший бомбардир всех времён" : "All-time top scorer", v: rec.topScorerAllTime ? `${rec.topScorerAllTime.name} (${rec.topScorerAllTime.goals})` : "—" },
                  { icon: "🎯", label: ru ? "Лучший ассистент всех времён" : "All-time top assister", v: rec.topAssisterAllTime ? `${rec.topAssisterAllTime.name} (${rec.topAssisterAllTime.assists})` : "—" },
                  { icon: "🏃", label: ru ? "Больше всех матчей" : "Most appearances", v: rec.mostApps ? `${rec.mostApps.name} (${rec.mostApps.apps})` : "—" },
                ].map(c => (
                  <div key={c.label} className={`p-3.5 min-w-0 ${t.card}`}>
                    <div className="text-xl mb-1">{c.icon}</div>
                    <div className={`text-[9px] uppercase tracking-widest ${t.muted}`}>{c.label}</div>
                    <div className="text-sm font-black leading-snug break-words mt-0.5">{c.v}</div>
                  </div>
                ))}
              </div>
            )}

            {rec?.trophies?.length > 0 && (
              <div className={`p-4 mb-6 ${t.card}`}>
                <div className={`text-[10px] uppercase tracking-widest mb-2 ${t.muted}`}>🏆 {ru ? "Витрина трофеев" : "Trophy cabinet"}</div>
                <div className="flex flex-wrap gap-2">
                  {rec.trophies.map((tr: any, i: number) => (
                    <span key={i} className={`px-2.5 py-1.5 text-xs font-bold ${t.cardAlt}`}>{tr.season} · {tr.name}</span>
                  ))}
                </div>
              </div>
            )}

            <div className={`text-[10px] uppercase tracking-widest mb-2 ${t.muted}`}>{ru ? "Сезоны" : "Seasons"}</div>
            <div className="space-y-3">
              {seasons.map(s => (
                <div key={s.seasonId} className={`p-4 ${t.card}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-display font-black">{s.label}</span>
                    {s.status !== "finished" && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{ru ? "идёт" : "in progress"}</span>}
                    <span className={`text-xs ${t.muted} truncate`}>{s.league}</span>
                    <span className="ml-auto text-sm font-black" style={{ color: s.position === 1 ? t.warn : undefined }}>
                      {s.position ? (ru ? `${s.position}-е из ${s.leagueSize}` : `#${s.position} of ${s.leagueSize}`) : "—"}{s.points != null ? ` · ${s.points} ${ru ? "очк." : "pts"}` : ""}
                    </span>
                  </div>
                  <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs`}>
                    {s.champion && (
                      <div className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span>🏟️</span><span className={t.muted}>{ru ? "Чемпион:" : "Champion:"}</span>
                        <img src={getClubLogo(s.champion)} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                        <b className="truncate">{s.champion}</b>
                      </div>
                    )}
                    {s.competitions.map((c: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span>{c.type === "continental" ? "🌍" : c.type === "super_cup" ? "⚡" : "🏆"}</span>
                        <span className={`truncate ${t.muted}`}>{c.name}:</span>
                        <b className="truncate">{c.winner ?? "—"}</b>
                      </div>
                    ))}
                    {s.topScorer && (
                      <div className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span>⚽</span><span className={t.muted}>{ru ? "Бомбардир:" : "Top scorer:"}</span>
                        <b className="truncate">{s.topScorer.name} ({s.topScorer.goals})</b>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
