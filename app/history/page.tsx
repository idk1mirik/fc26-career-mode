"use client";
import { useEffect, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { pageTheme } from "@/lib/pageTheme";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";
import { PageHeader, SectionTitle, Stars } from "@/components/ThemeBits";
import { getClubLogo } from "@/data/clublogos";

// Архив карьеры: сезон за сезоном + рекорды клуба за всё время (3 темы).
export default function HistoryPage() {
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId = useCareerStore(s => s.seasonId);
  const club = useCareerStore(s => s.selectedClub);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  useEffect(() => {
    if (!hydrated || !seasonId || !club?.name) { setLoading(false); return; }
    fetch(`/api/history?seasonId=${seasonId}&clubId=${encodeURIComponent(club.name)}`)
      .then(r => r.ok ? r.json() : null).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, [hydrated, seasonId, club?.name]);

  if (!hydrated) return null;
  const theme = (themeRaw ?? "classic") as string;
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const rec = data?.records;
  const seasons: any[] = [...(data?.seasons ?? [])].reverse();
  const match = (m: any) => m ? `${m.home ? "" : "@ "}${m.opp} ${m.mine}:${m.theirs}` : "—";
  const compIcon = (type: string) => type === "continental" ? ic.continental : type === "super_cup" ? ic.super : ic.cup;

  const cards = rec ? [
    { icon: ic.titles, label: fx.rTitles, v: String(rec.leagueTitles), stars: Math.min(5, rec.leagueTitles) },
    { icon: ic.best, label: fx.rBest, v: rec.bestFinish ? `#${rec.bestFinish}` : "—" },
    { icon: ic.bigwin, label: fx.rBigWin, v: match(rec.biggestWin) },
    { icon: ic.loss, label: fx.rHeavyLoss, v: match(rec.heaviestLoss) },
    { icon: ic.thriller, label: fx.rThriller, v: match(rec.highestScoring) },
    { icon: ic.scorer, label: fx.rTopScorer, v: rec.topScorerAllTime ? `${rec.topScorerAllTime.name} (${rec.topScorerAllTime.goals})` : "—" },
    { icon: ic.assist, label: fx.rTopAssister, v: rec.topAssisterAllTime ? `${rec.topAssisterAllTime.name} (${rec.topAssisterAllTime.assists})` : "—" },
    { icon: ic.apps, label: fx.rMostApps, v: rec.mostApps ? `${rec.mostApps.name} (${rec.mostApps.apps})` : "—" },
  ] : [];

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <PageHeader theme={theme} eyebrow={fx.histEyebrow} title={club?.name ?? ""}
          icon={club?.name ? <img src={getClubLogo(club.name)} alt="" className="w-11 h-11 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} /> : undefined} />

        {loading ? <div className={`py-16 text-center text-sm ${t.muted}`}>{fx.lbLoading}</div> : !data ? (
          <div className={`py-16 text-center text-sm ${t.card} ${t.muted}`}>{fx.noData}</div>
        ) : (
          <>
            {rec && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {cards.map(c => (
                  <div key={c.label} className={`p-3.5 min-w-0 ${t.card} ${t.shadow} transition-transform hover:-translate-y-0.5`}>
                    <div className="text-xl mb-1" style={isM ? { color: t.accent, textShadow: `0 0 10px ${t.accent}88` } : undefined}>{c.icon}</div>
                    <div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>{c.label}</div>
                    <div className={`text-sm font-black leading-snug break-words mt-0.5 ${isA ? "italic" : ""}`}>{c.v}</div>
                    {"stars" in c && c.stars! > 0 && <Stars value={c.stars!} theme={theme} size={11} className="mt-1" />}
                  </div>
                ))}
              </div>
            )}

            {rec?.trophies?.length > 0 && (
              <div className={`p-4 mb-6 ${t.card} ${t.shadow}`}>
                <SectionTitle theme={theme} icon={ic.trophy}>{fx.histTrophies}</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {rec.trophies.map((tr: any, i: number) => (
                    <span key={i} className={`px-2.5 py-1.5 text-xs font-bold flex items-center gap-1.5 ${t.cardAlt}`}>
                      <span style={{ color: t.star }}>★</span>{tr.season} · {tr.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`text-[10px] mb-2 ${t.eyebrow} ${t.muted}`}>{isA && "✦ "}{fx.histSeasons}</div>
            <div className="space-y-3">
              {seasons.map(s => (
                <div key={s.seasonId} className={`p-4 ${t.card} ${t.shadow}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-lg ${t.title}`}>{s.label}</span>
                    {s.status !== "finished" && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${isM ? "border" : "rounded-full"}`} style={{ color: t.good, background: `${t.good}1f`, borderColor: `${t.good}66` }}>{fx.inProgress}</span>
                    )}
                    <span className={`text-xs ${t.muted} truncate`}>{s.league}</span>
                    <span className="ml-auto flex items-center gap-2 text-sm font-black" style={{ color: s.position === 1 ? t.gold : undefined }}>
                      {s.position === 1 && <Stars value={1} max={1} theme={theme} size={13} />}
                      {s.position ? fx.posOf(s.position, s.leagueSize) : "—"}{s.points != null ? ` · ${s.points} ${fx.pts}` : ""}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {s.champion && (
                      <div className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span style={isM ? { color: t.accent } : undefined}>{ic.champion}</span><span className={t.muted}>{fx.champion}</span>
                        <img src={getClubLogo(s.champion)} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                        <b className="truncate">{s.champion}</b>
                      </div>
                    )}
                    {s.competitions.map((c: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span style={isM ? { color: t.accent } : undefined}>{compIcon(c.type)}</span>
                        <span className={`truncate ${t.muted}`}>{c.name}:</span>
                        <b className="truncate">{c.winner ?? "—"}</b>
                      </div>
                    ))}
                    {s.topScorer && (
                      <div className={`flex items-center gap-2 p-2 min-w-0 ${t.cardAlt}`}>
                        <span style={isM ? { color: t.accent } : undefined}>{ic.scorer}</span><span className={t.muted}>{fx.topScorerLabel}</span>
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
