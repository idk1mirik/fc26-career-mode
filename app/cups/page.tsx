"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { Trophy, Zap, Lock } from "lucide-react";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { isLineupValid, getLineupCount, MIN_LINEUP_SIZE } from "@/lib/lineupValidation";

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
  const [simulating, setSimulating] = useState<string | null>(null);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;

  const loadData = async () => {
    if (!seasonId) return;
    const res = await fetch(`/api/competitions?seasonId=${seasonId}`);
    if (res.ok) {
      const data = await res.json();
      setCompetitions(data.competitions ?? []);
      setFixturesByComp(data.fixturesByComp ?? {});
    }
  };

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    loadData();
  }, [hydrated, seasonId]);

  const advanceCup = async (competitionId: string) => {
    if (!lineupValid) return;
    setSimulating(competitionId);
    try {
      const res = await fetch("/api/cup/advance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId, userClubId: userClub, userTactic: tactic, userLineup: Object.values(lineup || {}).filter(Boolean) }),
      });
      if (res.ok) await loadData();
    } catch (e) { console.error(e); }
    setSimulating(null);
  };

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Cups & Trophies</div>
          <h1 className="text-2xl font-black">Cups, Super Cups & Continental</h1>
        </div>

        {!lineupValid && (
          <div className="mb-5 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            ⚠️ You need {MIN_LINEUP_SIZE} players in your lineup to play matches ({lineupCount}/{MIN_LINEUP_SIZE} selected).
          </div>
        )}

        {!seasonId ? (
          <div className={`p-6 rounded-2xl text-center ${ui.card}`}>
            <p className={ui.muted}>No active season</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className={`p-6 rounded-2xl text-center ${ui.card}`}>
            <p className={ui.muted}>No competitions yet for this season</p>
          </div>
        ) : (
          <div className="space-y-5">
            {competitions.map(comp => {
              const fixtures = fixturesByComp[comp.id] ?? [];
              const currentRoundFixtures = fixtures.filter((f: any) => f.round === comp.current_round);
              const isUserInComp = fixtures.some((f: any) => f.home_club === userClub || f.away_club === userClub);
              const allPlayed = currentRoundFixtures.every((f: any) => f.played);

              return (
                <div key={comp.id} className={`rounded-2xl overflow-hidden ${ui.card}`}>
                  <div className={`flex items-center justify-between px-5 py-4 border-b ${ui.divider}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{COMP_ICON[comp.type] ?? "🏆"}</span>
                      <div>
                        <div className="font-black text-sm">{comp.name}</div>
                        <div className={`text-[10px] ${ui.muted}`}>
                          {comp.status === "finished"
                            ? `Winner: ${comp.winner_club}`
                            : `Round ${comp.current_round}${isUserInComp ? " · You're in!" : ""}`}
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
                          {simulating === comp.id ? "Simulating…" : "Simulate Round"}
                        </button>
                      );
                    })()}
                    {comp.status === "finished" && <Trophy size={18} className="text-yellow-400" />}
                  </div>

                  <div className="px-5 py-3 space-y-1.5">
                    {currentRoundFixtures.length === 0 && comp.status === "finished" ? (
                      <div className={`text-center py-3 text-sm ${ui.muted}`}>🏆 {comp.winner_club} won the title!</div>
                    ) : currentRoundFixtures.map((f: any) => {
                      const isUserMatch = f.home_club === userClub || f.away_club === userClub;
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

                  <div className={`px-5 py-2.5 flex gap-4 text-[10px] ${ui.muted} border-t ${ui.divider}`}>
                    <span>🏆 Winner: {formatMoney(comp.prize_winner)}</span>
                    <span>🥈 Runner-up: {formatMoney(comp.prize_runner)}</span>
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
