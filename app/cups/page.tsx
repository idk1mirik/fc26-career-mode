"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { Trophy, Zap, Lock } from "lucide-react";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { getStageInfo, getStageDisplayName } from "@/lib/continentalKnockout";
import { isLineupValid, getLineupCount, MIN_LINEUP_SIZE } from "@/lib/lineupValidation";
import { getThemeCopy } from "@/lib/i18n";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { HelpHint } from "@/components/HelpHint";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    divider: "border-white/[0.05]",
    btnPrimary: "bg-emerald-500 text-black hover:bg-emerald-400",
    badge: "bg-white/[0.05]",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    divider: "border-pink-50",
    btnPrimary: "bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:opacity-90",
    badge: "bg-pink-50",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    divider: "border-purple-900/20",
    btnPrimary: "border border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-950/60",
    badge: "bg-purple-950/30",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

const COMP_ICON: Record<string, string> = {
  domestic_cup: "🏆", super_cup: "⚡", continental: "🌍",
};

function formatMoney(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

export default function CupsPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId       = useCareerStore(s => s.seasonId);
  const userClub        = useCareerStore(s => s.selectedClub)?.name || "";
  const tactic          = useCareerStore(s => s.tactic) || "Balanced";
  const currentMatchday = useCareerStore(s => s.matchday) || 1;
  const lineup           = useCareerStore(s => s.lineup);
  const lineupValid       = isLineupValid(lineup);
  const lineupCount       = getLineupCount(lineup);
  const [hydrated, setHydrated] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [fixturesByComp, setFixturesByComp] = useState<Record<string, any[]>>({});
  const [standingsByComp, setStandingsByComp] = useState<Record<string, any[]>>({});
  const [simulating, setSimulating] = useState<string | null>(null);
  const [cupError, setCupError] = useState<string | null>(null);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);

  const loadData = async () => {
    if (!seasonId) return;
    const res = await fetch(`/api/competitions?seasonId=${seasonId}`);
    if (res.ok) {
      const data = await res.json();
      setCompetitions(data.competitions ?? []);
      setFixturesByComp(data.fixturesByComp ?? {});
      setStandingsByComp(data.standingsByComp ?? {});
    }
  };

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    loadData();
  }, [hydrated, seasonId]);

  const advanceCup = async (competitionId: string) => {
    if (!lineupValid) return;
    setSimulating(competitionId);
    setCupError(null);
    try {
      const res = await fetch("/api/cup/advance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId, userClubId: userClub, userTactic: tactic, userLineup: Object.values(lineup || {}).filter(Boolean) }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await loadData();
      } else {
        // Раньше при ошибке сервера (500/400) код просто молчал — раунд
        // "зависал" без единого матча и без объяснения. Теперь показываем,
        // что реально сказал сервер.
        setCupError(data?.error ?? `Request failed (${res.status})`);
      }
    } catch (e: any) {
      setCupError(e?.message ?? "Network error");
    }
    setSimulating(null);
  };

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>{copy.cupsHeaderLabel}</div>
            <h1 className="text-2xl font-black">{copy.cupsTitle}</h1>
          </div>
        </div>

        {!lineupValid && (
          <div className="mb-5 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            ⚠️ {locale === "ru" ? `Нужно ${MIN_LINEUP_SIZE} ${copy.cupsLineupWarning}` : `You need ${MIN_LINEUP_SIZE} ${copy.cupsLineupWarning}`} ({lineupCount}/{MIN_LINEUP_SIZE})
          </div>
        )}

        {cupError && (
          <div className="mb-5 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            <span>⚠️ {cupError}</span>
            <button onClick={() => setCupError(null)} className="opacity-60 hover:opacity-100 px-2">✕</button>
          </div>
        )}

        {!seasonId ? (
          <div className={`p-6 rounded-2xl text-center ${ui.card}`}>
            <p className={ui.muted}>{copy.cupsNoSeason}</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className={`p-6 rounded-2xl text-center ${ui.card}`}>
            <p className={ui.muted}>{copy.cupsNoCompetitions}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {competitions.map(comp => {
              const fixtures = fixturesByComp[comp.id] ?? [];
              const currentRoundFixtures = fixtures.filter((f: any) => f.round === comp.current_round);
              const isUserInComp = fixtures.some((f: any) => f.home_club === userClub || f.away_club === userClub);
              const isNewFormat = comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0;
              const standings = standingsByComp[comp.id] ?? [];

              let roundLabel: string;
              if (isNewFormat && comp.phase === "league_phase") {
                roundLabel = locale === "ru"
                  ? `Лиг-фаза — тур ${comp.current_round}/${comp.league_phase_rounds}`
                  : `League Phase — MD ${comp.current_round}/${comp.league_phase_rounds}`;
              } else if (isNewFormat && comp.phase === "knockout") {
                const info = getStageInfo(comp.name, comp.league_phase_rounds, comp.current_round);
                roundLabel = info
                  ? `${getStageDisplayName(info.stage)}${info.leg ? ` — Leg ${info.leg}/2` : ""}`
                  : `${copy.cupsRoundPrefix} ${comp.current_round}`;
              } else {
                roundLabel = `${copy.cupsRoundPrefix} ${comp.current_round}`;
              }
              if (comp.status !== "finished" && isUserInComp) roundLabel += ` · ${copy.cupsYoureIn}`;

              return (
                <div key={comp.id} className={`rounded-2xl overflow-hidden card-lift animate-fade-in-up ${ui.card}`}>
                  <div className={`flex items-center justify-between px-5 py-4 border-b ${ui.divider}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{COMP_ICON[comp.type] ?? "🏆"}</span>
                      <div>
                        <div className="font-black text-sm flex items-center gap-1.5">
                          {comp.name}
                          <HelpHint id={`cup-round-${comp.type}`} theme={theme as any}
                            title={comp.name}
                            text={locale === "ru"
                              ? (comp.type === "continental"
                                ? "Групповой этап (лиг-фаза) → плей-офф на вылет с раундами по 2 матча (кроме финала). Раунд открывается для симуляции только когда календарь лиги дойдёт до его даты."
                                : "Раунды на вылет. Раунд открывается для симуляции только когда календарь лиги дойдёт до его даты — играть его раньше времени нельзя.")
                              : (comp.type === "continental"
                                ? "Group (league) phase → knockout with two-legged ties (except the final). A round only unlocks once the league calendar reaches its date."
                                : "Single-elimination rounds. A round only unlocks once the league calendar reaches its date.")} />
                        </div>
                        <div className={`text-[10px] ${ui.muted}`}>
                          {comp.status === "finished" ? `${copy.cupsWinnerPrefix} ${comp.winner_club}` : roundLabel}
                        </div>
                      </div>
                    </div>
                    {comp.status !== "finished" && (() => {
                      // Дата текущего раунда кубка против "сегодняшней" даты карьеры (дата текущего тура лиги)
                      const roundDate = currentRoundFixtures[0]?.match_date ?? null;
                      const careerDate = getLeagueMatchdayDate(currentMatchday);
                      const isFuture = roundDate ? roundDate > careerDate : false;

                      if (isFuture) {
                        return (
                          <div className={`px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 ${ui.muted}`}>
                            <Lock size={12} />
                            {new Date(roundDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </div>
                        );
                      }
                      return (
                        <button onClick={() => advanceCup(comp.id)} disabled={simulating === comp.id || !lineupValid}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50 ${ui.btnPrimary}`}>
                          <Zap size={13} />
                          {simulating === comp.id ? copy.cupsSimulating : copy.cupsSimulateRound}
                        </button>
                      );
                    })()}
                    {comp.status === "finished" && <Trophy size={18} className="text-yellow-400" />}
                  </div>

                  {isNewFormat && standings.length > 0 && (
                    <div className="px-5 py-3">
                      <div className={`grid grid-cols-[24px_1fr_32px_32px_40px] gap-2 text-[9px] uppercase tracking-widest mb-1.5 px-1 ${ui.muted}`}>
                        <span>#</span><span>{locale === "ru" ? "Клуб" : "Club"}</span>
                        <span className="text-center">{locale === "ru" ? "И" : "P"}</span>
                        <span className="text-center">{locale === "ru" ? "РМ" : "GD"}</span>
                        <span className="text-center font-black">{locale === "ru" ? "О" : "Pts"}</span>
                      </div>
                      <div className="space-y-0.5 max-h-64 overflow-y-auto">
                        {standings.map((s: any, i: number) => {
                          const qualifyLine = comp.league_phase_rounds ? (i === 7 || i === 23) : false; // грань прямого выхода / вылета — ориентировочно
                          return (
                            <div key={s.club}
                              className={`grid grid-cols-[24px_1fr_32px_32px_40px] gap-2 items-center text-xs py-1 px-1 rounded-md ${s.club === userClub ? (theme === "aurora" ? "bg-violet-50" : "bg-white/[0.05]") : ""} ${qualifyLine ? `border-b ${ui.divider}` : ""}`}>
                              <span className={`font-black ${i < 8 ? "text-emerald-400" : i < 24 ? "" : "opacity-40"}`}>{i + 1}</span>
                              <span className="font-bold truncate flex items-center gap-1.5">
                                <img src={getClubLogo(s.club)} className="w-3.5 h-3.5 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                                {s.club}
                              </span>
                              <span className="text-center">{s.played}</span>
                              <span className="text-center">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
                              <span className="text-center font-black">{s.points}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isNewFormat && comp.phase === "knockout" && (
                    <div className="px-5 py-3 border-t border-b border-white/5">
                      <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>
                        {locale === "ru" ? "Сетка плей-офф" : "Knockout bracket"}
                      </div>
                      <KnockoutBracket
                        fixtures={fixtures.filter((f: any) => f.round > (comp.league_phase_rounds ?? 0))}
                        userClub={userClub}
                        getClubLogo={getClubLogo}
                        theme={theme as any}
                      />
                    </div>
                  )}

                  {!(isNewFormat && comp.phase === "knockout") && (
                  <div className="px-5 py-3 space-y-1.5">
                    {currentRoundFixtures.length === 0 && comp.status === "finished" ? (
                      <div className={`text-center py-3 text-sm ${ui.muted}`}>🏆 {comp.winner_club} {copy.cupsWonTitle}</div>
                    ) : currentRoundFixtures.map((f: any) => {
                      const isUserMatch = f.home_club === userClub || f.away_club === userClub;
                      if (f.is_bye) {
                        return (
                          <div key={f.id} className={`flex items-center justify-center gap-2 py-1.5 rounded-lg ${isUserMatch ? (theme === "aurora" ? "bg-violet-50" : "bg-white/[0.04]") : ""}`}>
                            <img src={getClubLogo(f.home_club)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                            <span className="text-xs font-bold">{f.home_club}</span>
                            <span className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>— {locale === "ru" ? "проходит без матча" : "walkover"}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={f.id} className={`flex items-center gap-2 py-1.5 rounded-lg ${isUserMatch ? (theme === "aurora" ? "bg-violet-50" : "bg-white/[0.04]") : ""}`}>
                          <div className="flex items-center gap-1.5 flex-1 justify-end">
                            <span className="text-xs font-bold truncate max-w-[100px]">{f.home_club}</span>
                            <img src={getClubLogo(f.home_club)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                          </div>
                          <div className={`w-12 text-center text-xs font-black ${f.played ? "" : ui.muted}`}>
                            {f.played ? `${f.home_goals}-${f.away_goals}` : "vs"}
                          </div>
                          <div className="flex items-center gap-1.5 flex-1 justify-start">
                            <img src={getClubLogo(f.away_club)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                            <span className="text-xs font-bold truncate max-w-[100px]">{f.away_club}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}

                  <div className={`px-5 py-2.5 flex gap-4 text-[10px] ${ui.muted} border-t ${ui.divider}`}>
                    <span>🏆 {copy.cupsWinnerLabel}: {formatMoney(comp.prize_winner)}</span>
                    <span>🥈 {copy.cupsRunnerLabel}: {formatMoney(comp.prize_runner)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
