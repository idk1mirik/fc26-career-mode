// components/KnockoutBracket.tsx
// Куда ставить: fc26_career_mode/components/KnockoutBracket.tsx
//
// Визуальная сетка плей-офф для континентальных турниров (ЛЧ/ЛЕ/ЛК) —
// раньше плей-офф отображался тем же плоским списком "раунд за раундом",
// что и группа/лиг-фаза, из-за чего не было ощущения турнирной сетки.
// Группирует fixtures по стадии (round_name) и по tie_id (для двухногих
// туров считает агрегат), финал показывает как один матч.
"use client";

type Fixture = {
  id: string; round: number; round_name: string; tie_id?: string | null; leg?: number | null;
  home_club: string; away_club: string; home_goals?: number | null; away_goals?: number | null;
  played: boolean; is_bye?: boolean; winner_club?: string | null;
};

export function KnockoutBracket({
  fixtures, userClub, getClubLogo, theme = "classic",
}: {
  fixtures: Fixture[];
  userClub?: string;
  getClubLogo: (club: string) => string;
  theme?: "classic" | "aurora" | "maleficent";
}) {
  // Стадии определяем по факту: группируем по round_name, порядок — по
  // минимальному round внутри группы. Раньше список стадий был жёстко
  // зашит под еврокубки (Playoff Round → ... → Final) — для кубка страны
  // с другими названиями раундов сетка просто не рисовалась вообще.
  const stageMap = new Map<string, { minRound: number; fx: Fixture[] }>();
  for (const f of fixtures) {
    const key = f.round_name || `Round ${f.round}`;
    if (!stageMap.has(key)) stageMap.set(key, { minRound: f.round, fx: [] });
    const s = stageMap.get(key)!;
    s.minRound = Math.min(s.minRound, f.round);
    s.fx.push(f);
  }
  const stages = [...stageMap.entries()]
    .sort((a, b) => a[1].minRound - b[1].minRound)
    .map(([name, v]) => ({ name, fx: v.fx }));

  if (!stages.length) return null;

  const styles = {
    classic: { card: "bg-white/[0.04] border border-white/[0.08]", accent: "text-emerald-400", stageLabel: "text-slate-400", win: "text-white font-bold", lose: "text-slate-500" },
    aurora: { card: "bg-white border border-pink-100", accent: "text-pink-500", stageLabel: "text-pink-400", win: "text-pink-950 font-bold", lose: "text-pink-300" },
    maleficent: { card: "bg-black border border-purple-900/40", accent: "text-fuchsia-400", stageLabel: "text-purple-500", win: "text-fuchsia-300 font-bold", lose: "text-purple-800" },
  }[theme];

  // Группируем каждую стадию по tie_id (двухногие туры) или по одному матчу (финал/бай)
  function groupStage(fx: Fixture[]) {
    const byTie = new Map<string, Fixture[]>();
    const singles: Fixture[] = [];
    for (const f of fx) {
      if (f.tie_id) {
        if (!byTie.has(f.tie_id)) byTie.set(f.tie_id, []);
        byTie.get(f.tie_id)!.push(f);
      } else {
        singles.push(f);
      }
    }
    return { ties: [...byTie.values()], singles };
  }

  const lineColor = { classic: "rgba(255,255,255,0.15)", aurora: "rgba(236,72,153,0.25)", maleficent: "rgba(217,70,239,0.3)" }[theme];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max px-1">
        {stages.map((stage, stageIdx) => {
          const { ties, singles } = groupStage(stage.fx);
          const totalMatches = ties.length + singles.length;
          const isLast = stageIdx === stages.length - 1;
          return (
            <div key={stage.name} className="flex items-stretch">
              <div className="flex flex-col gap-2 w-[220px] shrink-0">
                <div className={`text-[10px] font-bold uppercase tracking-widest font-display ${styles.stageLabel} mb-1 flex items-center gap-1.5`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: lineColor }} />
                  {stage.name}
                  <span className="opacity-40 font-normal">· {totalMatches}</span>
                </div>

                <div className="flex-1 flex flex-col justify-around gap-3">
                  {ties.map((legs, i) => {
                    const leg1 = legs.find(l => (l.leg ?? 1) === 1) ?? legs[0];
                    const leg2 = legs.find(l => (l.leg ?? 1) === 2);
                    const isUser = leg1.home_club === userClub || leg1.away_club === userClub;
                    const aggHome = (leg1.home_goals ?? 0) + (leg2?.away_goals ?? 0);
                    const aggAway = (leg1.away_goals ?? 0) + (leg2?.home_goals ?? 0);
                    const decided = !!leg2 && leg2.played;
                    const homeWon = decided && aggHome > aggAway;
                    const awayWon = decided && aggAway > aggHome;

                    return (
                      <div key={leg1.tie_id ?? i} className="relative">
                        {!isLast && (
                          <span className="absolute top-1/2 -right-4 w-4 h-px" style={{ background: lineColor }} />
                        )}
                        <div
                          className={`rounded-xl p-2.5 card-lift animate-fade-in-up ${styles.card} ${isUser ? "ring-1 ring-emerald-400/50" : ""}`}
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          <ClubRow club={leg1.home_club} logo={getClubLogo(leg1.home_club)}
                            score={decided || leg1.played ? aggHome : undefined} won={homeWon} styles={styles} />
                          <ClubRow club={leg1.away_club} logo={getClubLogo(leg1.away_club)}
                            score={decided || leg1.played ? aggAway : undefined} won={awayWon} styles={styles} />
                          <div className={`text-[9px] mt-1.5 ${styles.stageLabel}`}>
                            {leg2 ? (leg2.played ? "агрегат за 2 матча" : `1-й матч: ${leg1.home_goals ?? "?"}-${leg1.away_goals ?? "?"}`) : "1-й матч сыгран"}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {singles.map(f => {
                    const isUser = f.home_club === userClub || f.away_club === userClub;
                    if (f.is_bye) {
                      return (
                        <div key={f.id} className="relative">
                          {!isLast && <span className="absolute top-1/2 -right-4 w-4 h-px" style={{ background: lineColor }} />}
                          <div className={`rounded-xl p-2.5 ${styles.card} ${isUser ? "ring-1 ring-emerald-400/50" : ""}`}>
                            <ClubRow club={f.home_club} logo={getClubLogo(f.home_club)} won={true} styles={styles} />
                            <div className={`text-[9px] mt-1 ${styles.stageLabel}`}>проходит без матча</div>
                          </div>
                        </div>
                      );
                    }
                    const homeWon = f.played && (f.home_goals ?? 0) > (f.away_goals ?? 0);
                    const awayWon = f.played && (f.away_goals ?? 0) > (f.home_goals ?? 0);
                    return (
                      <div key={f.id} className="relative">
                        {!isLast && <span className="absolute top-1/2 -right-4 w-4 h-px" style={{ background: lineColor }} />}
                        <div className={`rounded-xl p-2.5 card-lift animate-fade-in-up ${styles.card} ${isUser ? "ring-1 ring-emerald-400/50" : ""}`}>
                          <ClubRow club={f.home_club} logo={getClubLogo(f.home_club)} score={f.played ? f.home_goals ?? 0 : undefined} won={homeWon} styles={styles} />
                          <ClubRow club={f.away_club} logo={getClubLogo(f.away_club)} score={f.played ? f.away_goals ?? 0 : undefined} won={awayWon} styles={styles} />
                          {stage.name === "Final" && f.played && (
                            <div className={`text-[10px] mt-1.5 font-bold ${styles.accent}`}>
                              🏆 {homeWon ? f.home_club : f.away_club}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Направляющая линия между колонками — визуально читается как "сетка",
                  а не набор изолированных карточек. Точную попарную стыковку веток
                  не рисуем намеренно: прямые квалификанты вливаются в пул плей-офф
                  (не строгое дерево 2→1 на каждом шаге), поэтому честная пиксель-точная
                  привязка линий к конкретным родительским парам была бы недостоверной. */}
              {!isLast && (
                <div className="w-8 shrink-0 flex items-center justify-center">
                  <div className="w-px h-[70%] rounded-full" style={{ background: `linear-gradient(to bottom, transparent, ${lineColor}, transparent)` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClubRow({ club, logo, score, won, styles }: { club: string; logo: string; score?: number; won?: boolean; styles: any }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <img src={logo} className="w-4 h-4 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
      <span className={`text-xs truncate flex-1 ${won ? styles.win : styles.lose}`}>{club}</span>
      {score !== undefined && <span className={`text-xs font-black ${won ? styles.accent : styles.lose}`}>{score}</span>}
    </div>
  );
}
